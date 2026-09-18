import { autoChat, chatWithProvider, discoverAllModels, getConfiguredProviders, type AIProvider, type ChatMessage } from "@/lib/ai-providers";

export type AgentResult = {
  provider: string;
  model: string;
  ok: boolean;
  reply?: string;
  error?: string;
  durationMs: number;
};

const ANALYSIS_TIMEOUT_MS = 45_000;
const CODING_TIMEOUT_MS = 110_000;
const REVIEW_TIMEOUT_MS = 50_000;
const DISCOVERY_CACHE_MS = 30_000;
const MAX_CONTEXT_CHARS = 28_000;
const MAX_FILE_CHARS = 22_000;
const MAX_PATHS = 18;
const MAX_CHANGES_PER_PROPOSAL = 10;
const CODING_MAX_OUTPUT_CHARS = 180_000;
const HARD_MAX_AGENTS = 16;

type AgentCandidate = { provider: AIProvider; model: string; rank: number };
type AgentCandidateList = AgentCandidate[];

let candidateCache: { expiresAt: number; value: AgentCandidateList } | null = null;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Agent timeout after ${ms}ms`)), ms)),
  ]);
}

function isProviderFatal(message: string): boolean {
  const modelOnly =
    /premium model|requires an active paid plan|requires .*balance|plan .*allows|model .*not available|model .*unavailable|model .*not found|unknown model|unsupported model|permission.?denied.*model|model.*permission/i.test(
      message,
    );
  if (modelOnly) return false;
  return /no credits|insufficient.?quota|billing|credit|payment|invalid.?api.?key|incorrect.?api.?key|authentication|unauthorized|401|403|permission.?denied|api key not valid|account.?deactivated|exceeded.?your.?current.?quota|http 405|http 404/i.test(
    message,
  );
}

function isChatCapableModelForDevelopment(id: string): boolean {
  return !/embed|whisper|tts|dall-e|moderation|realtime|audio|image|transcribe|sora|batch|search-preview|diarize|codex|computer-use|image-generation/i.test(
    id,
  );
}

function isSafePath(path: string): boolean {
  if (!path || path.length > 240) return false;
  if (path.includes("..") || path.startsWith("/") || path.includes("\\")) return false;
  if (/node_modules|\.env|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|\.git\//i.test(path)) return false;
  return /^([A-Za-z0-9_.@-]+\/)*[A-Za-z0-9_.@-]+$/.test(path);
}

function extractJson<T>(text: string): T | null {
  if (!text) return null;
  const tryParse = (raw: string): T | null => {
    const cleaned = raw
      .replace(/^\uFEFF/, "")
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      return null;
    }
  };
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) {
    const parsed = tryParse(fenced);
    if (parsed) return parsed;
  }
  const start = text.indexOf("{");
  if (start >= 0) {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (escape) escape = false;
        else if (ch === "\\") escape = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          const parsed = tryParse(text.slice(start, i + 1));
          if (parsed) return parsed;
          break;
        }
      }
    }
  }
  const greedy = text.match(/\{[\s\S]*\}/)?.[0];
  if (greedy) return tryParse(greedy);
  return null;
}

function extractPaths(text: string): string[] {
  const matches = text.match(/(?:src|app|public|components|lib|\.github|scripts|supabase)\/[A-Za-z0-9_./@-]+/g) || [];
  const extra = text.match(/(?:package\.json|next\.config\.(?:ts|js|mjs)|tsconfig\.json|tailwind\.config\.(?:ts|js)|middleware\.ts)/g) || [];
  return [...new Set([...matches, ...extra])]
    .map((p) => p.replace(/[),.;:`"']+$/, ""))
    .filter((p) => isSafePath(p) && !p.includes("node_modules"))
    .slice(0, MAX_PATHS);
}

type ProposedChange = { path: string; content: string; reason?: string };

function scoreProposal(changes: ProposedChange[]): number {
  if (!changes.length) return 0;
  let score = 0;
  for (const c of changes) {
    if (!isSafePath(c.path)) continue;
    if (typeof c.content !== "string" || c.content.length < 20) continue;
    score += 10;
    if (c.content.includes("export ") || c.content.includes("import ") || c.content.includes("function ") || c.content.includes("const ")) {
      score += 5;
    }
    if (c.content.length > 80_000) score -= 8;
    if (c.reason && c.reason.length > 8) score += 2;
  }
  if (changes.length <= 3) score += 6;
  else if (changes.length <= 6) score += 3;
  else score -= 2;
  return score;
}

const AGENT_SYSTEM = `تو یکی از اعضای یک تیم Multi-Agent برای توسعه و نگهداری ArtistYar-Website هستی.
مسئله را مستقل و فنی بررسی کن. اگر task کدنویسی است، فایل‌های درگیر، معماری، ریسک‌ها و تست‌ها را مشخص کن.
مستقیماً production را تغییر نمی‌دهی؛ خروجی تو توسط Lead Agent و owner بررسی می‌شود.
پاسخ فارسی باشد و نام فایل‌ها/APIها/کد انگلیسی بماند.
اولویت: correctness، TypeScript/Next.js conventions، عدم شکستن رفتار موجود، امنیت.`;

async function candidates() {
  if (candidateCache && candidateCache.expiresAt > Date.now()) return candidateCache.value;
  const providers = getConfiguredProviders();
  const entries = await discoverAllModels();
  const out: Array<{ provider: AIProvider; model: string; rank: number }> = [];
  for (const entry of entries) {
    const provider = providers.find((p) => p.id === entry.provider.id);
    if (!provider) continue;
    const discovered = entry.models?.length
      ? entry.models
      : (provider.defaultModels || []).map((model) => ({
          id: model,
          provider: provider.id,
          task: "chat" as const,
          rank: 0,
        }));
    for (const m of discovered) {
      if (!m.id) continue;
      out.push({ provider, model: m.id, rank: m.rank ?? 0 });
    }
  }
  const seen = new Set<string>();
  const unique = out
    .sort((a, b) => b.rank - a.rank)
    .filter((c) => {
      const key = `${c.provider.id}::${c.model}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const byProvider = new Map<string, typeof unique>();
  for (const candidate of unique) {
    const list = byProvider.get(candidate.provider.id) || [];
    list.push(candidate);
    byProvider.set(candidate.provider.id, list);
  }
  const balanced: typeof unique = [];
  for (let depth = 0; balanced.length < unique.length; depth++) {
    let added = false;
    for (const list of byProvider.values()) {
      if (list[depth]) {
        balanced.push(list[depth]);
        added = true;
      }
    }
    if (!added) break;
  }
  candidateCache = { expiresAt: Date.now() + DISCOVERY_CACHE_MS, value: balanced };
  return balanced;
}

async function ask(provider: AIProvider, model: string, task: string, context: string): Promise<AgentResult> {
  const started = Date.now();
  try {
    const messages: ChatMessage[] = [
      { role: "system", content: AGENT_SYSTEM },
      {
        role: "user",
        content: `TASK:\n${task}\n\nPROJECT CONTEXT:\n${context.slice(0, 14000)}\n\nGive:\n1) understanding/diagnosis\n2) implementation plan (ordered steps)\n3) affected files (exact paths)\n4) risks / regressions\n5) tests & verification\n6) checks for other agents`,
      },
    ];
    const reply = await withTimeout(chatWithProvider(provider, model, messages, "artistyar-multi-agent"), ANALYSIS_TIMEOUT_MS);
    return { provider: provider.id, model, ok: true, reply, durationMs: Date.now() - started };
  } catch (error) {
    return {
      provider: provider.id,
      model,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
    };
  }
}

export async function runMultiAgent(task: string, context = "", maxAgents = 12) {
  const capped = Math.min(Math.max(2, maxAgents), HARD_MAX_AGENTS);
  const all = await candidates();
  if (!all.length) throw new Error("هیچ Agent کدنویسی/تحلیلی فعالی پیدا نشد.");
  const pool = all.slice(0, Math.min(all.length, Math.max(24, capped * 3)));
  const results: AgentResult[] = [];
  const failedProviders = new Set<string>();
  const successful: AgentResult[] = [];
  const targetSuccess = Math.max(2, Math.min(capped, 4));
  for (let offset = 0; offset < pool.length && successful.length < targetSuccess; offset += 8) {
    const wave = pool.slice(offset, offset + 8).filter((c) => !failedProviders.has(c.provider.id));
    if (!wave.length) continue;
    const waveResults = await Promise.all(wave.map((c) => ask(c.provider, c.model, task, context)));
    results.push(...waveResults);
    for (const r of waveResults) {
      if (r.ok && r.reply && r.reply.trim().length > 40) successful.push(r);
      else if (r.error && isProviderFatal(r.error)) failedProviders.add(r.provider);
    }
  }
  if (!successful.length) {
    const diagnostics = results
      .map((r) => `${r.provider}/${r.model}: ${r.error || "empty response"}`)
      .slice(0, 12)
      .join(" | ");
    throw new Error(`هیچ Agent فعالی پاسخ نداد. خطاهای واقعی: ${diagnostics}`);
  }
  const ranked = [...successful].sort((a, b) => (b.reply?.length || 0) - (a.reply?.length || 0));
  const reports = ranked
    .slice(0, 6)
    .map((r, i) => `AGENT ${i + 1} — ${r.provider} / ${r.model}:\n${r.reply}`)
    .join("\n\n---\n\n")
    .slice(0, 55_000);
  const lead = `تو Lead Agent پروژه ArtistYar هستی. گزارش Agentهای مستقل را برای TASK زیر تلفیق کن.
از بین پیشنهادها یک برنامه واحد، عملی و قابل بررسی بساز؛ تکرار را حذف کن و اختلاف‌نظرها را صریح ذکر کن.

TASK:\n${task}\n\nAGENT REPORTS:\n${reports}\n\nخروجی ساخت‌یافته:\n- جمع‌بندی\n- راه‌حل/تصمیم پیشنهادی\n- مراحل پیاده‌سازی (مرتب)\n- فایل‌های درگیر (exact paths)\n- تست و verification\n- اختلاف‌نظرهای مهم\n- ریسک‌های regression`;
  const synthesis = await autoChat(
    [
      { role: "system", content: AGENT_SYSTEM },
      { role: "user", content: lead },
    ],
    undefined,
    undefined,
    "artistyar-multi-agent-lead",
  );
  return {
    ok: true,
    task,
    totalAgents: results.length,
    successfulAgents: successful.length,
    results,
    synthesis: { provider: synthesis.provider, model: synthesis.model, reply: synthesis.reply },
  };
}

type DevelopmentResult = {
  ok: boolean;
  task: string;
  branch?: string;
  pullRequest?: { number: number; url: string };
  plan: unknown;
  proposals?: Array<{ agent: string; changes: ProposedChange[]; notes?: string; score?: number }>;
  reviews?: string[];
  appliedChanges?: string[];
  selectedAgent?: string;
};

async function parseCoderReply(
  reply: string,
  agentLabel: string,
): Promise<{ agent: string; changes: ProposedChange[]; notes?: string }> {
  let parsed = extractJson<{ changes?: ProposedChange[]; notes?: string }>(reply.slice(0, CODING_MAX_OUTPUT_CHARS));
  if (!parsed?.changes?.length && reply.length > 80) {
    try {
      const repair = await autoChat(
        [
          {
            role: "system",
            content:
              'Convert the following coding agent output into STRICT valid JSON only. Schema: {"changes":[{"path":"...","content":"COMPLETE FILE","reason":"..."}],"notes":"..."}. No markdown.',
          },
          { role: "user", content: reply.slice(0, 40_000) },
        ],
        undefined,
        undefined,
        "artistyar-json-repair",
      );
      parsed = extractJson<{ changes?: ProposedChange[]; notes?: string }>(repair.reply);
    } catch {
      // ignore repair failure
    }
  }
  const changes = Array.isArray(parsed?.changes)
    ? parsed!.changes
        .filter((x) => x && typeof x.path === "string" && typeof x.content === "string")
        .filter((x) => isSafePath(x.path) && x.content.trim().length >= 20)
        .slice(0, MAX_CHANGES_PER_PROPOSAL)
    : [];
  return { agent: agentLabel, changes, notes: parsed?.notes };
}

export async function runDevelopmentTask(
  task: string,
  context = "",
  maxAgents = 12,
  execute = true,
): Promise<DevelopmentResult> {
  const capped = Math.min(Math.max(2, maxAgents), HARD_MAX_AGENTS);
  const planning = await runMultiAgent(task, context, capped);
  const repo = (process.env.GITHUB_REPOSITORY || "mehrshadevilb-cell/ArtistYar-Website").trim();
  if (!process.env.GITHUB_TOKEN && !process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
    return {
      ok: false,
      task,
      plan: planning,
      proposals: [],
      reviews: ["GITHUB_TOKEN برای اجرای واقعی تغییرات تنظیم نشده است."],
    };
  }
  const { getDefaultBranch, readProjectFiles, createBranch, updateFile, createFile, createPullRequest } = await import(
    "@/lib/github-agent"
  );
  const base = await getDefaultBranch(repo);
  const paths = extractPaths(planning.synthesis.reply || "");
  const filePaths = paths.length
    ? paths
    : ["package.json", "tsconfig.json", "next.config.ts", "src/app/layout.tsx", "src/lib/ai-agent.ts"];
  const files = await readProjectFiles(repo, base, filePaths);
  const projectContext = files
    .map((f) => `FILE: ${f.path}\n${f.content.slice(0, MAX_FILE_CHARS)}`)
    .join("\n\n---\n\n")
    .slice(0, MAX_CONTEXT_CHARS);
  const allCandidates = await (async () => {
    const providers = getConfiguredProviders();
    const entries = await discoverAllModels();
    const result: Array<{ provider: AIProvider; model: string; rank: number }> = [];
    for (const entry of entries) {
      const provider = providers.find((p) => p.id === entry.provider.id);
      if (!provider) continue;
      const models = entry.models?.length
        ? entry.models
        : (provider.defaultModels || []).map((model) => ({ id: model, rank: 0 }));
      for (const m of models) {
        if (m.id && isChatCapableModelForDevelopment(m.id)) {
          result.push({ provider, model: m.id, rank: m.rank ?? 0 });
        }
      }
    }
    const seen = new Set<string>();
    const unique = result
      .sort((a, b) => b.rank - a.rank)
      .filter((c) => {
        const k = `${c.provider.id}::${c.model}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    const byProvider = new Map<string, typeof unique>();
    for (const candidate of unique) {
      const list = byProvider.get(candidate.provider.id) || [];
      list.push(candidate);
      byProvider.set(candidate.provider.id, list);
    }
    const balanced: typeof unique = [];
    for (let depth = 0; balanced.length < unique.length; depth++) {
      let added = false;
      for (const list of byProvider.values()) {
        if (list[depth]) {
          balanced.push(list[depth]);
          added = true;
        }
      }
      if (!added) break;
    }
    return balanced;
  })();
  if (!allCandidates.length) throw new Error("هیچ Agent کدنویسی فعالی پیدا نشد.");
  const desiredCoders = Math.min(6, Math.max(2, Math.floor(capped / 3)));
  const coderPrompt = `TASK:\n${task}\n\nLEAD PLAN:\n${planning.synthesis.reply}\n\nREPOSITORY FILES:\n${projectContext}\n\nYou are a coding specialist for ArtistYar-Website (Next.js + TypeScript).\nProduce a concrete implementation proposal.\n\nReturn ONLY valid JSON (no markdown fences required but allowed):\n{"changes":[{"path":"src/...","content":"COMPLETE FILE CONTENT","reason":"why"}],"notes":"..."}\n\nRules:\n- Only propose files that need changing.\n- Content must be the COMPLETE replacement content, never a diff or partial snippet.\n- Preserve existing behavior unless the task requires changing it.\n- Do not invent dependencies, secrets, or env vars.\n- Do not modify lockfiles or .env files.\n- Keep TypeScript/Next.js conventions and existing import style.\n- Prefer minimal focused changes over large rewrites.\n`;
  const coderPool = allCandidates.slice(0, Math.min(allCandidates.length, Math.max(20, capped * 3)));
  const coderResults: Array<{ agent: string; changes: ProposedChange[]; notes?: string; score?: number }> = [];
  const failedCoderProviders = new Set<string>();
  const targetUsable = 1;
  for (let offset = 0; offset < coderPool.length && coderResults.filter((p) => p.changes.length).length < targetUsable; offset += 8) {
    const wave = coderPool.slice(offset, offset + 8).filter((c) => !failedCoderProviders.has(c.provider.id));
    if (!wave.length) continue;
    const waveResults = await Promise.all(
      wave.map(async (candidate) => {
        const label = `${candidate.provider.id}/${candidate.model}`;
        try {
          const reply = await withTimeout(
            chatWithProvider(
              candidate.provider,
              candidate.model,
              [
                {
                  role: "system",
                  content:
                    "تو Coding Agent پروژه ArtistYar-Website هستی. خروجی دقیق و قابل اعمال بده. پاسخ نهایی JSON معتبر با فیلد changes باشد.",
                },
                { role: "user", content: coderPrompt },
              ],
              "artistyar-development-coder",
            ),
            CODING_TIMEOUT_MS,
          );
          const parsed = await parseCoderReply(reply, label);
          return { ...parsed, score: scoreProposal(parsed.changes) };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (isProviderFatal(message)) failedCoderProviders.add(candidate.provider.id);
          return { agent: label, changes: [] as ProposedChange[], notes: message, score: 0 };
        }
      }),
    );
    coderResults.push(...waveResults);
  }
  let usable = coderResults.filter((p) => p.changes.length).sort((a, b) => (b.score || 0) - (a.score || 0));
  if (!usable.length && allCandidates.length > desiredCoders) {
    const backup = allCandidates.slice(desiredCoders, Math.min(allCandidates.length, desiredCoders + 12));
    const backupResults = await Promise.all(
      backup.map(async (candidate) => {
        const label = `${candidate.provider.id}/${candidate.model}`;
        try {
          const reply = await withTimeout(
            chatWithProvider(
              candidate.provider,
              candidate.model,
              [
                {
                  role: "system",
                  content:
                    "تو Coding Agent پروژه ArtistYar-Website هستی. خروجی دقیق و قابل اعمال بده. پاسخ نهایی JSON معتبر با فیلد changes باشد.",
                },
                { role: "user", content: coderPrompt },
              ],
              "artistyar-development-coder-backup",
            ),
            CODING_TIMEOUT_MS,
          );
          const parsed = await parseCoderReply(reply, label);
          return { ...parsed, score: scoreProposal(parsed.changes) };
        } catch {
          return { agent: label, changes: [] as ProposedChange[], notes: "backup coder failed", score: 0 };
        }
      }),
    );
    coderResults.push(...backupResults);
    usable = coderResults.filter((p) => p.changes.length).sort((a, b) => (b.score || 0) - (a.score || 0));
  }
  if (!usable.length) {
    const failures = coderResults.map((p) => `${p.agent}: ${p.notes || "no valid patch"}`).join(" | ");
    throw new Error(`Coding Agentها نتوانستند patch معتبر تولید کنند. ${failures}`);
  }
  const topProposals = usable.slice(0, 4);
  const proposalText = topProposals
    .map(
      (p, i) =>
        `PROPOSAL ${i + 1} — ${p.agent} (score=${p.score ?? 0})\npaths: ${p.changes.map((c) => c.path).join(", ")}\n${JSON.stringify(p.changes.map((c) => ({ path: c.path, reason: c.reason, contentLength: c.content.length })))}`,
    )
    .join("\n\n---\n\n");
  const reviewers = allCandidates
    .filter((c) => !failedCoderProviders.has(c.provider.id))
    .slice(0, Math.min(4, Math.max(2, allCandidates.length)));
  const reviews = await Promise.all(
    reviewers.map(async (c) => {
      try {
        return await withTimeout(
          chatWithProvider(
            c.provider,
            c.model,
            [
              {
                role: "system",
                content:
                  "تو Senior Reviewer پروژه ArtistYar-Website هستی. correctness، امنیت، TypeScript، Next.js و regression را بررسی کن. سخت‌گیر ولی عملی باش.",
              },
              {
                role: "user",
                content: `TASK:\n${task}\n\nPLAN:\n${planning.synthesis.reply}\n\nPROPOSALS:\n${proposalText}\n\nدر ابتدای پاسخ دقیقاً بنویس:\nAPPROVE <شماره>\nیا\nREJECT ALL\nسپس دلیل فنی کوتاه بده.`,
              },
            ],
            "artistyar-development-reviewer",
          ),
          REVIEW_TIMEOUT_MS,
        );
      } catch {
        return "REJECT ALL — reviewer failed";
      }
    }),
  );
  const voteWeight = new Map<number, number>();
  for (const r of reviews) {
    const m = r.match(/APPROVE\s+(\d+)/i);
    if (m) {
      const n = Number(m[1]);
      if (n >= 1 && n <= topProposals.length) {
        voteWeight.set(n, (voteWeight.get(n) || 0) + 3);
      }
    }
  }
  for (let i = 0; i < topProposals.length; i++) {
    const s = topProposals[i].score || 0;
    voteWeight.set(i + 1, (voteWeight.get(i + 1) || 0) + Math.min(8, Math.floor(s / 5)));
  }
  const rankedVotes = [...voteWeight.entries()].sort((a, b) => b[1] - a[1]);
  const selectedIdx = rankedVotes[0]?.[0] ? rankedVotes[0][0] - 1 : 0;
  const selected = topProposals[Math.max(0, Math.min(selectedIdx, topProposals.length - 1))] || topProposals[0];
  if (!execute) {
    return {
      ok: true,
      task,
      plan: planning,
      proposals: usable,
      reviews,
      selectedAgent: selected.agent,
    };
  }
  const branch = `ai/artistyar-${Date.now().toString(36)}`;
  await createBranch(repo, branch, base);
  const appliedChanges: string[] = [];
  for (const change of selected.changes) {
    if (!isSafePath(change.path)) continue;
    try {
      await updateFile(repo, change.path, branch, change.content, `feat(ai-agent): implement ${change.path}`);
      appliedChanges.push(change.path);
    } catch (error) {
      if (String(error).includes("Not Found") || String(error).toLowerCase().includes("not found")) {
        await createFile(repo, change.path, branch, change.content, `feat(ai-agent): add ${change.path}`);
        appliedChanges.push(change.path);
      } else {
        throw error;
      }
    }
  }
  if (!appliedChanges.length) throw new Error("هیچ فایل معتبری برای اعمال در branch وجود نداشت.");
  const pr = await createPullRequest(
    repo,
    branch,
    base,
    `AI Agent: ${task.slice(0, 70)}`,
    `## AI Development Agent\n\n${task}\n\n### Selected agent\n\`${selected.agent}\` (score=${selected.score ?? "—"})\n\n### Lead plan\n${planning.synthesis.reply}\n\n### Applied files\n${appliedChanges.map((p) => `- ${p}`).join("\n")}\n\n### Reviews\n${reviews.join("\n\n---\n\n")}\n\n> این PR توسط Multi-Agent pipeline ساخته شده و قبل از merge باید GitHub Actions و review انسانی بررسی شوند.\n`,
  );
  return {
    ok: true,
    task,
    branch,
    pullRequest: { number: pr.number, url: pr.html_url },
    plan: planning,
    proposals: usable,
    reviews,
    appliedChanges,
    selectedAgent: selected.agent,
  };
}
