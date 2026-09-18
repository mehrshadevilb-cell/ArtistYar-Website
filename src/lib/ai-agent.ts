import { autoChat, chatWithProvider, discoverAllModels, getConfiguredProviders, type AIProvider, type ChatMessage } from "@/lib/ai-providers";

export type AgentResult = { provider:string; model:string; ok:boolean; reply?:string; error?:string; durationMs:number };

const AGENT_SYSTEM = `تو یکی از اعضای یک تیم Multi-Agent برای توسعه و نگهداری ArtistYar-Website هستی.
مسئله را مستقل و فنی بررسی کن. اگر task کدنویسی است، فایل‌های درگیر، معماری، ریسک‌ها و تست‌ها را مشخص کن.
مستقیماً production را تغییر نمی‌دهی؛ خروجی تو توسط Lead Agent و owner بررسی می‌شود.
پاسخ فارسی باشد و نام فایل‌ها/APIها/کد انگلیسی بماند.`;

async function candidates() {
  const providers = getConfiguredProviders();
  const entries = await discoverAllModels();
  const out:Array<{provider:AIProvider;model:string;rank:number}> = [];
  for (const entry of entries) {
    const provider = providers.find(p => p.id === entry.provider.id);
    if (!provider) continue;
    for (const m of entry.models) out.push({ provider, model:m.id, rank:m.rank ?? 0 });
  }
  const seen = new Set<string>();
  return out.sort((a,b)=>b.rank-a.rank).filter(c=>{
    const key=`${c.provider.id}::${c.model}`;
    if(seen.has(key)) return false; seen.add(key); return true;
  });
}

async function ask(provider:AIProvider, model:string, task:string, context:string):Promise<AgentResult>{
  const started=Date.now();
  try {
    const messages:ChatMessage[]=[
      {role:"system",content:AGENT_SYSTEM},
      {role:"user",content:`TASK:
${task}

PROJECT CONTEXT:
${context.slice(0,12000)}

Give:
1) understanding/diagnosis
2) implementation plan
3) affected files
4) risks
5) tests
6) checks for other agents`}
    ];
    const reply=await chatWithProvider(provider,model,messages,"artistyar-multi-agent");
    return {provider:provider.id,model,ok:true,reply,durationMs:Date.now()-started};
  } catch(error) {
    return {provider:provider.id,model,ok:false,error:error instanceof Error?error.message:String(error),durationMs:Date.now()-started};
  }
}

export async function runMultiAgent(task:string, context="", maxAgents=12) {
  const all=await candidates();
  const selected=all.slice(0,Math.max(1,Math.min(maxAgents,24)));
  // All selected models are invoked concurrently.
  const results=await Promise.all(selected.map(c=>ask(c.provider,c.model,task,context)));
  const successful=results.filter(r=>r.ok && r.reply);
  if(!successful.length) throw new Error("هیچ Agent فعالی پاسخ نداد.");

  const reports=successful.map((r,i)=>`AGENT ${i+1} — ${r.provider} / ${r.model}:
${r.reply}`).join("\n\n---\n\n").slice(0,50000);
  const lead=`تو Lead Agent پروژه ArtistYar هستی. گزارش Agentهای مستقل را برای TASK زیر تلفیق کن.
از بین پیشنهادها یک برنامه واحد، عملی و قابل بررسی بساز؛ تکرار را حذف کن و اختلاف‌نظرها را صریح ذکر کن.

TASK:
${task}

AGENT REPORTS:
${reports}

خروجی:
- جمع‌بندی
- راه‌حل/تصمیم پیشنهادی
- مراحل پیاده‌سازی
- فایل‌های درگیر
- تست و verification
- اختلاف‌نظرهای مهم`;
  const synthesis=await autoChat([{role:"system",content:AGENT_SYSTEM},{role:"user",content:lead}],undefined,undefined,"artistyar-multi-agent-lead");
  return {ok:true,task,totalAgents:selected.length,successfulAgents:successful.length,results,synthesis:{provider:synthesis.provider,model:synthesis.model,reply:synthesis.reply}};
}


type ProposedChange = { path: string; content: string; reason?: string };
type DevelopmentResult = {
  ok: boolean;
  task: string;
  branch?: string;
  pullRequest?: { number: number; url: string };
  plan: unknown;
  proposals?: Array<{ agent: string; changes: ProposedChange[]; notes?: string }>;
  reviews?: string[];
  appliedChanges?: string[];
};

function extractJson<T>(text: string): T | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || text.match(/\{[\s\S]*\}/)?.[0];
  if (!candidate) return null;
  try { return JSON.parse(candidate) as T; } catch { return null; }
}

function extractPaths(text: string): string[] {
  const matches = text.match(/(?:src|app|public|components|lib|\.github)\/[A-Za-z0-9_./@-]+/g) || [];
  const extra = text.match(/(?:package\.json|next\.config\.(?:ts|js)|tsconfig\.json)/g) || [];
  return [...new Set([...matches, ...extra])]
    .map(p => p.replace(/[),.;:]+$/, ""))
    .filter(p => !p.includes("node_modules"))
    .slice(0, 10);
}

export async function runDevelopmentTask(
  task: string,
  context = "",
  maxAgents = 12,
  execute = true,
): Promise<DevelopmentResult> {
  const planning = await runMultiAgent(task, context, maxAgents);
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

  const { getDefaultBranch, readProjectFiles, createBranch, updateFile, createFile, createPullRequest } = await import("@/lib/github-agent");
  const base = await getDefaultBranch(repo);
  const paths = extractPaths(planning.synthesis.reply || "");
  const filePaths = paths.length ? paths : ["package.json", "tsconfig.json", "next.config.ts"];
  const files = await readProjectFiles(repo, base, filePaths);
  const projectContext = files.map(f => `FILE: ${f.path}\n${f.content.slice(0, 18000)}`).join("\n\n---\n\n");

  const candidates = await (async () => {
    const providers = getConfiguredProviders();
    const entries = await discoverAllModels();
    const result:Array<{provider:AIProvider;model:string;rank:number}> = [];
    for (const entry of entries) {
      const provider = providers.find(p => p.id === entry.provider.id);
      if (!provider) continue;
      for (const m of entry.models) {
        if (isChatCapableModelForDevelopment(m.id)) result.push({ provider, model:m.id, rank:m.rank ?? 0 });
      }
    }
    const seen = new Set<string>();
    return result.sort((a,b)=>b.rank-a.rank).filter(c => {
      const k = `${c.provider.id}::${c.model}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  })();

  const coders = candidates.slice(0, Math.min(4, Math.max(2, Math.floor(maxAgents / 4))));
  if (!coders.length) throw new Error("هیچ Agent کدنویسی فعالی پیدا نشد.");

  const coderPrompt = `TASK:
${task}

LEAD PLAN:
${planning.synthesis.reply}

REPOSITORY FILES:
${projectContext}

You are a coding specialist. Produce a concrete implementation proposal.
Return ONLY valid JSON (no markdown):
{"changes":[{"path":"src/...","content":"COMPLETE FILE CONTENT","reason":"why"}],"notes":"..."}
Rules:
- Only propose files that need changing.
- Content must be the COMPLETE replacement content, never a diff.
- Preserve existing behavior unless the task requires changing it.
- Do not invent dependencies or secrets.
- Do not modify lockfiles.
- Keep the project TypeScript/Next.js conventions.
`;

  const coderResults = await Promise.all(coders.map(async c => {
    try {
      const reply = await chatWithProvider(c.provider, c.model, [
        { role:"system", content:"تو Coding Agent پروژه ArtistYar-Website هستی. خروجی دقیق و قابل اعمال بده. پاسخ نهایی JSON خالص باشد." },
        { role:"user", content:coderPrompt },
      ], "artistyar-development-coder");
      const parsed = extractJson<{changes?: ProposedChange[];notes?:string}>(reply);
      const changes = Array.isArray(parsed?.changes)
        ? parsed!.changes.filter(x => x && typeof x.path === "string" && typeof x.content === "string").slice(0, 8)
        : [];
      return { agent:`${c.provider.id}/${c.model}`, changes, notes:parsed?.notes };
    } catch {
      return { agent:`${c.provider.id}/${c.model}`, changes:[], notes:"coder failed" };
    }
  }));

  const usable = coderResults.filter(p => p.changes.length);
  if (!usable.length) throw new Error("Coding Agentها نتوانستند patch معتبر تولید کنند.");

  const proposalText = usable.map((p,i)=>`PROPOSAL ${i+1} — ${p.agent}\n${JSON.stringify(p.changes)}`).join("\n\n---\n\n");
  const reviewers = candidates.slice(coders.length, coders.length + Math.min(3, candidates.length - coders.length));
  const reviews = await Promise.all(reviewers.map(async c => {
    try {
      return await chatWithProvider(c.provider, c.model, [
        { role:"system", content:"تو Senior Reviewer پروژه ArtistYar-Website هستی. کد را از نظر correctness، امنیت، TypeScript، Next.js و regression بررسی کن." },
        { role:"user", content:`TASK:\n${task}\n\nPLAN:\n${planning.synthesis.reply}\n\nPROPOSALS:\n${proposalText}\n\nدر ابتدای پاسخ دقیقاً بنویس APPROVE <شماره> یا REJECT ALL، سپس دلیل کوتاه و فنی بده.` },
      ], "artistyar-development-reviewer");
    } catch { return "REJECT ALL — reviewer failed"; }
  }));

  const approvals = reviews.map(r => r.match(/APPROVE\s+(\d+)/i)?.[1]).filter(Boolean) as string[];
  const counts = new Map<string,number>();
  for (const n of approvals) counts.set(n, (counts.get(n)||0)+1);
  const selectedNumber = [...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0];
  const selected = selectedNumber ? usable[Number(selectedNumber)-1] : usable[0];

  if (!execute) {
    return { ok:true, task, plan:planning, proposals:usable, reviews };
  }

  const branch = `ai/artistyar-${Date.now().toString(36)}`;
  await createBranch(repo, branch, base);

  const appliedChanges:string[] = [];
  for (const change of selected.changes) {
    if (!/^([A-Za-z0-9_.@-]+\/)*[A-Za-z0-9_.@-]+$/.test(change.path)) continue;
    try {
      await updateFile(repo, change.path, branch, change.content, `feat(ai-agent): implement ${change.path}`);
      appliedChanges.push(change.path);
    } catch (error) {
      if (String(error).includes("Not Found")) {
        await createFile(repo, change.path, branch, change.content, `feat(ai-agent): add ${change.path}`);
        appliedChanges.push(change.path);
      } else throw error;
    }
  }

  if (!appliedChanges.length) throw new Error("هیچ فایل معتبری برای اعمال در branch وجود نداشت.");

  const pr = await createPullRequest(
    repo,
    branch,
    base,
    `AI Agent: ${task.slice(0, 70)}`,
    `## AI Development Agent

${task}

### Lead plan
${planning.synthesis.reply}

### Applied files
${appliedChanges.map(p => `- ${p}`).join("\n")}

### Review
${reviews.join("\n\n---\n\n")}

> این PR توسط Multi-Agent pipeline ساخته شده و قبل از merge باید GitHub Actions و review انسانی بررسی شوند.
  `,
  );

  return {
    ok:true,
    task,
    branch,
    pullRequest:{ number:pr.number, url:pr.html_url },
    plan:planning,
    proposals:usable,
    reviews,
    appliedChanges,
  };
}

function isChatCapableModelForDevelopment(id: string): boolean {
  return !/embed|whisper|tts|dall-e|moderation|realtime|audio|image|transcribe|sora|batch|search-preview|diarize|codex|computer-use|image-generation/i.test(id);
}
