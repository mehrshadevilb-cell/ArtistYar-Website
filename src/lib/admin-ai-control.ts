import { createClient } from "@supabase/supabase-js";
import { discoverAllModels, getConfiguredProviders } from "@/lib/ai-providers";
import { estimateCostUsd } from "@/lib/admin-ai-platform";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

function db() { if (!supabase) throw new Error("admin_ai_storage_not_configured"); return supabase; }
function has(name: string) { return Boolean((process.env[name] || "").trim()); }

export async function listControlProviders() {
  const discovered = await discoverAllModels({ allowFallback: false }).catch(() => []);
  const configuredProviders = getConfiguredProviders();
  const configured = new Map(configuredProviders.map((p) => [p.id, p]));
  const discoveredMap = new Map(discovered.map((x) => [x.provider.id, x]));
  const catalog = [
    "openai","anthropic","google","openrouter","xkiro","opencode","agentrouter",
    "rahyar-gateway","groq","bytez","deepseek","mistral","together","fireworks","xai",
    "flare","orca","ollama"
  ];
  const ids = [...new Set([...catalog, ...configuredProviders.map((p) => p.id)])];
  return ids.map((id) => {
    const live = discoveredMap.get(id);
    const provider = configured.get(id);
    const modelCount = live?.models?.length || 0;
    const isConfigured = Boolean(provider?.apiKey);
    return {
      id,
      name: provider?.name || live?.provider?.name || id,
      status: modelCount > 0 ? "healthy" : isConfigured ? "degraded" : "configuration_error",
      configured: isConfigured,
      modelCount,
      models: (live?.models || []).slice(0, 40).map((m) => ({ id: m.id, rank: m.rank, accessTier: m.accessTier })),
    };
  });
}

export async function testControlProvider(providerId: string) {
  const before = Date.now();
  const discovered = await discoverAllModels({ allowFallback: false });
  const entry = discovered.find((x) => x.provider.id === providerId);
  if (!entry) return { ok: false, providerId, latencyMs: Date.now() - before, error: "provider_not_configured" };
  return {
    ok: entry.models.length > 0,
    providerId,
    latencyMs: Date.now() - before,
    modelCount: entry.models.length,
    models: entry.models.slice(0, 20).map((m) => m.id),
  };
}

export async function listTasks() {
  const r = await db().from("admin_ai_tasks").select("*").order("enabled",{ascending:false}).order("id");
  if (r.error) throw r.error; return r.data || [];
}
export async function listAgents() {
  const r = await db().from("admin_ai_agents").select("*").order("enabled",{ascending:false}).order("id");
  if (r.error) throw r.error; return r.data || [];
}
export async function listPrompts() {
  const r = await db().from("admin_ai_prompts").select("*").order("updated_at",{ascending:false}).limit(200);
  if (r.error) throw r.error; return r.data || [];
}
export async function listTools() {
  const r = await db().from("admin_ai_tools").select("*").order("enabled",{ascending:false}).order("id");
  if (r.error) throw r.error; return r.data || [];
}
export async function listExecutions(filters: { status?: string; provider?: string; model?: string; limit?: number } = {}) {
  let q = db().from("admin_ai_executions").select("*").order("created_at",{ascending:false}).limit(Math.min(filters.limit || 100, 200));
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.provider) q = q.eq("provider_id", filters.provider);
  if (filters.model) q = q.eq("model_id", filters.model);
  const r = await q; if (r.error) throw r.error; return r.data || [];
}
export async function controlUsage() {
  const r = await db().from("admin_ai_executions").select("provider_id,model_id,input_tokens,output_tokens,estimated_cost_usd,status,created_at");
  if (r.error) throw r.error;
  const rows = r.data || [];
  const now = Date.now(), day=86400000;
  const summarize=(cut:number)=> {
    const x=rows.filter((v)=>now-new Date(v.created_at).getTime()<=cut);
    return { requests:x.length,inputTokens:x.reduce((n,v)=>n+(v.input_tokens||0),0),outputTokens:x.reduce((n,v)=>n+(v.output_tokens||0),0),estimatedCost:x.reduce((n,v)=>n+Number(v.estimated_cost_usd||0),0) };
  };
  return { today:summarize(day), week:summarize(7*day), month:summarize(30*day) };
}

export async function upsertTask(input: Record<string, unknown>) {
  const allowed=["id","name","description","capability","primary_provider","primary_model","fallback_provider","fallback_model","max_retries","timeout_ms","enabled"];
  const row=Object.fromEntries(allowed.filter(k=>k in input).map(k=>[k,input[k]]));
  const r=await db().from("admin_ai_tasks").upsert(row).select("*").single(); if(r.error) throw r.error; return r.data;
}
export async function upsertAgent(input: Record<string, unknown>) {
  const allowed=["id","name","description","purpose","task_id","primary_provider","primary_model","fallback_provider","fallback_model","system_prompt","permissions","enabled","version"];
  const row=Object.fromEntries(allowed.filter(k=>k in input).map(k=>[k,input[k]]));
  const r=await db().from("admin_ai_agents").upsert(row).select("*").single(); if(r.error) throw r.error; return r.data;
}
export async function createPrompt(input: Record<string, unknown>) {
  const r=await db().from("admin_ai_prompts").insert({
    agent_id:input.agent_id||null,task_id:input.task_id||null,version:Number(input.version||1),
    system_prompt:String(input.system_prompt||""),developer_instructions:String(input.developer_instructions||""),
    user_template:String(input.user_template||""),changelog:String(input.changelog||""),
    author:String(input.author||"admin"),active:false
  }).select("*").single(); if(r.error) throw r.error; return r.data;
}
export async function activatePrompt(id: string) {
  const current=await db().from("admin_ai_prompts").select("id,agent_id,task_id").eq("id",id).maybeSingle();
  if(current.error) throw current.error; if(!current.data) return null;
  const {agent_id,task_id}=current.data;
  await db().from("admin_ai_prompts").update({active:false}).eq("agent_id",agent_id).eq("task_id",task_id);
  const r=await db().from("admin_ai_prompts").update({active:true,updated_at:new Date().toISOString()}).eq("id",id).select("*").single();
  if(r.error) throw r.error; return r.data;
}
export async function upsertTool(input: Record<string, unknown>) {
  const allowed=["id","name","description","input_schema","output_schema","permission_level","enabled","agent_ids","timeout_ms"];
  const row=Object.fromEntries(allowed.filter(k=>k in input).map(k=>[k,input[k]]));
  const r=await db().from("admin_ai_tools").upsert(row).select("*").single(); if(r.error) throw r.error; return r.data;
}
export function executionCost(inputTokens:number,outputTokens:number,model:string){return estimateCostUsd(inputTokens||0,outputTokens||0,model||"");}
