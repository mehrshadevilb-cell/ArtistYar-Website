import { autoChat, type ChatMessage } from "@/lib/ai-providers";
import { createBranchAndPullRequest, githubStatus, listTree, readFile, searchCode, type FileChange } from "@/lib/admin-ai-github";
import { memoryContext } from "@/lib/admin-ai-memory";
import { recordUsage } from "@/lib/admin-ai-usage";
import { getSkill, pushActivity } from "@/lib/admin-ai-platform";
import { recordAdminAiModelFailure, recordAdminAiModelSuccess } from "@/lib/admin-ai-model-health";

const DEV_SYSTEM = `تو RahYar Admin Dev Agent هستی — یک coding agent واقعی برای مدیران.
قوانین:
- فقط روی همین repository کار کن.
- هرگز secret، token، یا .env را در خروجی ننویس.
- قبل از تغییر، repository را با ابزارها بررسی کن.
- اگر اطلاعات بیشتری لازم داری، از ابزارهای GitHub استفاده کن.
- ابزارهای مجاز: github_search، github_read، github_tree.
- بعد از بررسی، پاسخ نهایی را فارسی، ساختاریافته و عملی بنویس.
- برای هر فایل قابل تغییر، محتوای کامل را با فرمت دقیق \`\`\`file:path/to/file.ts ارائه کن.
- هرگز مستقیم روی main نمی‌نویسی؛ اعمال تغییر فقط با Draft PR انجام می‌شود.
- تغییرات minimal و قابل review باشند.`;

export type AgentTraceEvent = {
  id: string;
  kind: "plan" | "tool" | "model" | "result" | "error";
  message: string;
  detail?: string;
  at: string;
};

export type DevAgentResult = {
  ok: boolean;
  plan: string;
  analysis: string;
  filesRead: Array<{ path: string; bytes: number }>;
  searchHits: Array<{ path: string; name: string }>;
  proposedFiles: FileChange[];
  pullRequest?: { number: number; url: string; branch: string; draft: boolean };
  trace: AgentTraceEvent[];
  error?: string;
};

function addTrace(events: AgentTraceEvent[], kind: AgentTraceEvent["kind"], message: string, detail?: string) {
  const event = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    kind,
    message: message.slice(0, 400),
    detail: detail?.slice(0, 4000),
    at: new Date().toISOString(),
  };
  events.push(event);
  pushActivity(kind === "tool" ? "tool" : kind === "model" ? "model" : kind === "error" ? "error" : kind === "result" ? "done" : "info", message, detail);
}

function parseProposedFiles(text: string): FileChange[] {
  const files: FileChange[] = [];
  const re = /\`\`\`file:([^\n]+)\n([\s\S]*?)\`\`\`/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const path = match[1].trim().replace(/^\.?\/+/, "");
    if (!path || path.includes("..") || path.startsWith("/")) continue;
    files.push({ path, content: match[2].replace(/\n$/, ""), message: `feat: update ${path}` });
  }
  return files.slice(0, 12);
}

type ToolCall = {
  name: "github_search" | "github_read" | "github_tree";
  arguments: Record<string, unknown>;
};

function parseToolCalls(text: string): ToolCall[] {
  const calls: ToolCall[] = [];
  const re = /\`\`\`tool\n([\s\S]*?)\`\`\`/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    try {
      const value = JSON.parse(match[1]) as { name?: unknown; arguments?: unknown };
      if (value.name === "github_search" || value.name === "github_read" || value.name === "github_tree") {
        calls.push({
          name: value.name,
          arguments: value.arguments && typeof value.arguments === "object" ? value.arguments as Record<string, unknown> : {},
        });
      }
    } catch {
      /* malformed tool block */
    }
  }
  return calls.slice(0, 4);
}

async function executeTool(call: ToolCall, signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  if (call.name === "github_search") {
    const query = typeof call.arguments.query === "string" ? call.arguments.query.trim().slice(0, 300) : "";
    if (!query) return { error: "query لازم است" };
    return { query, items: await searchCode(query, 12) };
  }
  if (call.name === "github_read") {
    const path = typeof call.arguments.path === "string" ? call.arguments.path.trim() : "";
    if (!path || path.includes("..") || path.startsWith("/")) return { error: "path نامعتبر است" };
    const file = await readFile(path);
    return { path: file.path, sha: file.sha, content: file.content.slice(0, 20000) };
  }
  const path = typeof call.arguments.path === "string" ? call.arguments.path.trim() || "src" : "src";
  return { path, tree: await listTree(path) };
}

async function runModel(messages: ChatMessage[], provider?: string, model?: string, signal?: AbortSignal) {
  try {
    if (provider && model) pushActivity("model", `اولویت ${provider}/${model}`);
    const result = await autoChat(messages, provider, model, "rahyar-admin-dev", signal);
    await recordAdminAiModelSuccess(result.provider, result.model).catch(() => null);
    pushActivity("done", `مدل فعال: ${result.provider}/${result.model}`);
    return result;
  } catch (error) {
    if (provider && model) await recordAdminAiModelFailure(provider, model, error).catch(() => null);
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "no_provider_configured") throw new Error("admin_ai_no_healthy_model");
    throw new Error("admin_ai_all_models_failed");
  }
}

export async function runDevAgent(input: {
  adminUsername: string;
  task: string;
  skillId?: string;
  provider?: string;
  model?: string;
  apply?: boolean;
  paths?: string[];
  signal?: AbortSignal;
}): Promise<DevAgentResult> {
  const task = input.task.trim().slice(0, 8000);
  if (!task) throw new Error("empty_task");

  const events: AgentTraceEvent[] = [];
  const filesRead: Array<{ path: string; bytes: number; content: string }> = [];
  addTrace(events, "plan", "Agent task started", task);

  const gh = await githubStatus();
  if (!gh.ok) {
    return { ok: false, plan: "", analysis: "", filesRead: [], searchHits: [], proposedFiles: [], trace: events, error: gh.error || "GitHub connector آماده نیست." };
  }

  const skill = input.skillId ? await getSkill(input.skillId) : undefined;
  if (skill) addTrace(events, "plan", `Skill: ${skill.name}`);
  const mem = await memoryContext(input.adminUsername).catch(() => "");

  const initialQuery = task.split(/\s+/).slice(0, 8).join(" ");
  const searchHits = await searchCode(initialQuery, 12).catch(() => []);
  addTrace(events, "tool", "Repository search completed", `${searchHits.length} hits`);

  const initialPaths = [...(input.paths || []), ...searchHits.slice(0, 6).map((h) => h.path)]
    .filter((p, i, a) => p && a.indexOf(p) === i)
    .slice(0, 10);

  for (const path of initialPaths) {
    try {
      addTrace(events, "tool", `Reading ${path}`);
      const file = await readFile(path);
      filesRead.push({ path: file.path, bytes: file.content.length, content: file.content.slice(0, 16000) });
    } catch {
      addTrace(events, "error", `Could not read ${path}`);
    }
  }

  if (!filesRead.length) {
    for (const entry of (await listTree("src").catch(() => [])).filter((t) => t.type === "file").slice(0, 6)) {
      try {
        const file = await readFile(entry.path);
        filesRead.push({ path: file.path, bytes: file.content.length, content: file.content.slice(0, 10000) });
      } catch { /* continue */ }
    }
  }

  const contextBlock = filesRead.map((f) => `### FILE ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join("\n\n").slice(0, 70000);
  const system = [
    DEV_SYSTEM,
    skill?.system_prompt_extra || "",
    mem ? `حافظه ادمین:\n${mem}` : "",
    "برای ابزار از این قالب استفاده کن:",
    "\`\`\`tool",
    "{\"name\":\"github_read\",\"arguments\":{\"path\":\"src/...\"}}",
    "\`\`\`",
  ].filter(Boolean).join("\n");

  let messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: `وظیفه:\n${task}\n\nContext فعلی repository:\n${contextBlock || "(خالی)"}` },
  ];

  let primary: Awaited<ReturnType<typeof runModel>> | null = null;
  let round = 0;

  while (round < 4) {
    round += 1;
    addTrace(events, "model", `Model round ${round}`);
    primary = await runModel(messages, input.provider, input.model, input.signal);
    const calls = parseToolCalls(primary.reply);
    if (!calls.length) break;

    messages = [...messages, { role: "assistant", content: primary.reply }];
    addTrace(events, "tool", `Executing ${calls.length} tool call(s)`);

    for (const call of calls) {
      addTrace(events, "tool", call.name, JSON.stringify(call.arguments));
      try {
        const result = await executeTool(call, input.signal);
        addTrace(events, "result", `${call.name} completed`);
        messages.push({ role: "user", content: `TOOL RESULT — ${call.name}:\n${JSON.stringify(result).slice(0, 30000)}` });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        addTrace(events, "error", `${call.name} failed`, message);
        messages.push({ role: "user", content: `TOOL ERROR — ${call.name}: ${message}` });
      }
    }
  }

  if (!primary) throw new Error("admin_ai_generation_stopped");
  const proposedFiles = parseProposedFiles(primary.reply);
  addTrace(events, "result", `Analysis complete: ${proposedFiles.length} proposed file(s)`);

  let pullRequest: DevAgentResult["pullRequest"];
  if (input.apply && proposedFiles.length) {
    addTrace(events, "tool", "Creating Draft PR", proposedFiles.map((f) => f.path).join(", "));
    pullRequest = await createBranchAndPullRequest({
      branchName: `admin-ai/${Date.now().toString(36)}`,
      title: `Admin AI: ${task.slice(0, 72)}`,
      body: `## Admin Dev Agent\n\n**Task:** ${task}\n\n**Skill:** ${skill?.id || "general"}\n\n**Model:** ${primary.provider}/${primary.model}\n\n---\n\n${primary.reply.slice(0, 5000)}`,
      files: proposedFiles,
      draft: true,
    });
    addTrace(events, "result", `Draft PR #${pullRequest.number} created`, pullRequest.url);
  }

  await recordUsage({
    adminUsername: input.adminUsername,
    feature: "dev_agent",
    provider: primary.provider,
    model: primary.model,
    inputTokens: Math.ceil(messages.reduce((n, m) => n + m.content.length, 0) / 4),
    outputTokens: Math.ceil(primary.reply.length / 4),
    metadata: { apply: Boolean(input.apply), files: proposedFiles.map((f) => f.path), toolRounds: round },
  }).catch(() => null);

  return {
    ok: true,
    plan: primary.reply.slice(0, 2000),
    analysis: primary.reply,
    filesRead: filesRead.map((f) => ({ path: f.path, bytes: f.bytes })),
    searchHits,
    proposedFiles: proposedFiles.map((f) => ({ path: f.path, content: f.content.slice(0, 500), message: f.message })),
    pullRequest,
    trace: events,
  };
}
