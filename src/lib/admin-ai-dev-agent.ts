import { autoChat, chatExactProviderModel, type ChatMessage } from "@/lib/ai-providers";
import { listAdminAiRoutingCandidates } from "@/lib/admin-ai-model-registry";
import { listHealthyAdminAiModels, recordAdminAiModelFailure, recordAdminAiModelSuccess } from "@/lib/admin-ai-model-health";
import { createBranchAndPullRequest, githubStatus, listTree, readFile, searchCode, type FileChange } from "@/lib/admin-ai-github";
import { memoryContext } from "@/lib/admin-ai-memory";
import { recordUsage } from "@/lib/admin-ai-usage";
import { BUILTIN_SKILLS } from "@/lib/admin-ai-platform";

const DEV_SYSTEM = `تو RahYar Admin Dev Agent هستی — دستیار کدنویسی فقط برای مدیران.
قوانین:
- فقط روی همین repository کار کن.
- هرگز secret، token، یا .env را در خروجی ننویس.
- تغییرات را minimal و قابل review نگه دار.
- برای اعمال کد فقط از مسیر Draft PR استفاده می‌شود؛ مستقیم روی main نمی‌نویسی.
- اگر اطلاعات کافی نداری، اول فایل‌های مرتبط را درخواست کن.
پاسخ را فارسی، ساختاریافته و عملی بنویس.`;

export type DevAgentResult = {
  ok: boolean;
  plan: string;
  analysis: string;
  filesRead: Array<{ path: string; bytes: number }>;
  searchHits: Array<{ path: string; name: string }>;
  proposedFiles: FileChange[];
  pullRequest?: { number: number; url: string; branch: string; draft: boolean };
  parallel?: Array<{ provider: string; model: string; summary: string }>;
  error?: string;
};

function parseProposedFiles(text: string): FileChange[] {
  const files: FileChange[] = [];
  const re = /```file:([^\n]+)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const path = match[1].trim().replace(/^\.?\/+/, "");
    if (!path || path.includes("..")) continue;
    files.push({ path, content: match[2].replace(/\n$/, ""), message: `feat: update ${path}` });
  }
  return files.slice(0, 12);
}

async function runModel(messages: ChatMessage[], provider?: string, model?: string, signal?: AbortSignal) {
  if (provider && model) {
    try {
      const result = await chatExactProviderModel(messages, provider, model, "rahyar-admin-dev", signal);
      await recordAdminAiModelSuccess(provider, model);
      return result;
    } catch (error) {
      await recordAdminAiModelFailure(provider, model, error);
      throw error;
    }
  }
  const candidates = await listHealthyAdminAiModels(await listAdminAiRoutingCandidates());
  if (!candidates.length) throw new Error("admin_ai_no_healthy_model");
  let lastError: unknown;
  for (const c of candidates.slice(0, 5)) {
    try {
      const result = await autoChat(messages, c.provider_id, c.model_id, "rahyar-admin-dev", signal);
      await recordAdminAiModelSuccess(c.provider_id, c.model_id);
      return result;
    } catch (error) {
      lastError = error;
      await recordAdminAiModelFailure(c.provider_id, c.model_id, error);
    }
  }
  throw lastError || new Error("admin_ai_all_models_failed");
}

export async function runDevAgent(input: {
  adminUsername: string;
  task: string;
  skillId?: string;
  provider?: string;
  model?: string;
  parallel?: boolean;
  apply?: boolean;
  paths?: string[];
  signal?: AbortSignal;
}): Promise<DevAgentResult> {
  const task = input.task.trim().slice(0, 8000);
  if (!task) throw new Error("empty_task");

  const gh = await githubStatus();
  if (!gh.ok) {
    return {
      ok: false,
      plan: "",
      analysis: "",
      filesRead: [],
      searchHits: [],
      proposedFiles: [],
      error: gh.error || "GitHub connector آماده نیست. GITHUB_TOKEN را در secrets ست کن.",
    };
  }

  const skill = BUILTIN_SKILLS.find((s) => s.id === input.skillId && s.enabled);
  const mem = await memoryContext(input.adminUsername).catch(() => "");

  const searchHits = await searchCode(task.split(/\s+/).slice(0, 6).join(" "), 10).catch(() => []);
  const paths = [
    ...(input.paths || []),
    ...searchHits.slice(0, 5).map((h) => h.path),
  ].filter((p, i, arr) => p && arr.indexOf(p) === i).slice(0, 8);

  const filesRead: Array<{ path: string; bytes: number; content: string }> = [];
  for (const path of paths) {
    try {
      const file = await readFile(path);
      filesRead.push({ path: file.path, bytes: file.content.length, content: file.content.slice(0, 14000) });
    } catch {
      /* skip */
    }
  }

  if (!filesRead.length) {
    const tree = await listTree("src").catch(() => []);
    for (const entry of tree.filter((t) => t.type === "file").slice(0, 5)) {
      try {
        const file = await readFile(entry.path);
        filesRead.push({ path: file.path, bytes: file.content.length, content: file.content.slice(0, 8000) });
      } catch {
        /* */
      }
    }
  }

  const contextBlock = filesRead
    .map((f) => `### FILE ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join("\n\n")
    .slice(0, 60000);

  const system = [
    DEV_SYSTEM,
    skill?.system_prompt_extra || "",
    mem ? `حافظه ادمین:\n${mem}` : "",
    "اگر می‌خواهی فایلی را کامل جایگزین کنی، در پاسخ دقیقاً با این فرمت بنویس:",
    "```file:path/to/file.ts",
    "// full new content",
    "```",
  ]
    .filter(Boolean)
    .join("\n");

  const userContent = `وظیفه:\n${task}\n\nفایل‌های مرتبط خوانده‌شده:\n${contextBlock || "(چیزی خوانده نشد)"}`;

  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: userContent },
  ];

  const parallelSummaries: Array<{ provider: string; model: string; summary: string }> = [];
  let primary: Awaited<ReturnType<typeof runModel>>;

  if (input.parallel) {
    const candidates = await listHealthyAdminAiModels(await listAdminAiRoutingCandidates());
    const picked = candidates.slice(0, 3);
    const results = await Promise.allSettled(
      picked.map((c) => runModel(messages, c.provider_id, c.model_id, input.signal)),
    );
    const fulfilled = results
      .map((r, i) => ({ r, c: picked[i] }))
      .filter((x) => x.r.status === "fulfilled") as Array<{
      r: PromiseFulfilledResult<Awaited<ReturnType<typeof runModel>>>;
      c: { provider_id: string; model_id: string };
    }>;
    if (!fulfilled.length) throw new Error("admin_ai_all_models_failed");
    primary = fulfilled[0].r.value;
    for (const item of fulfilled) {
      parallelSummaries.push({
        provider: item.c.provider_id,
        model: item.c.model_id,
        summary: item.r.value.reply.slice(0, 1200),
      });
    }
  } else {
    primary = await runModel(messages, input.provider, input.model, input.signal);
  }

  const proposedFiles = parseProposedFiles(primary.reply);
  let pullRequest: DevAgentResult["pullRequest"];

  if (input.apply && proposedFiles.length) {
    pullRequest = await createBranchAndPullRequest({
      branchName: `admin-ai/${Date.now().toString(36)}`,
      title: `Admin AI: ${task.slice(0, 72)}`,
      body: `## Admin Dev Agent\n\n**Task:** ${task}\n\n**Skill:** ${skill?.id || "general"}\n\n**Models:** ${primary.provider}/${primary.model}\n\n---\n\n${primary.reply.slice(0, 5000)}`,
      files: proposedFiles,
      draft: true,
    });
  }

  await recordUsage({
    adminUsername: input.adminUsername,
    feature: "dev_agent",
    provider: primary.provider,
    model: primary.model,
    inputTokens: Math.ceil(userContent.length / 4),
    outputTokens: Math.ceil(primary.reply.length / 4),
    metadata: { apply: Boolean(input.apply), parallel: Boolean(input.parallel), files: proposedFiles.map((f) => f.path) },
  }).catch(() => null);

  return {
    ok: true,
    plan: primary.reply.slice(0, 2000),
    analysis: primary.reply,
    filesRead: filesRead.map((f) => ({ path: f.path, bytes: f.bytes })),
    searchHits,
    proposedFiles: proposedFiles.map((f) => ({ path: f.path, content: f.content.slice(0, 500), message: f.message })),
    pullRequest,
    parallel: parallelSummaries.length ? parallelSummaries : undefined,
  };
}
