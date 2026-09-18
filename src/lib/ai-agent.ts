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
