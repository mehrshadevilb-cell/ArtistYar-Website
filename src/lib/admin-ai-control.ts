import { createClient } from "@supabase/supabase-js";
import { chatExactProviderModel, discoverModels, scoreModel, type ChatMessage } from "@/lib/ai-providers";
import { getRuntimeProviderPool } from "@/lib/ai-runtime-providers";
import { estimateCostUsd } from "@/lib/admin-ai-platform";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

function db() { if (!supabase) throw new Error("admin_ai_storage_not_configured"); return supabase; }
function has(name: string) { return Boolean((process.env[name] || "").trim()); }

export async function listControlProviders() {
  const configuredProviders = await getRuntimeProviderPool().catch(() => []);
  const discovered = await Promise.all(configuredProviders.map(async (provider) => ({
    provider: { id: provider.id, name: provider.name, configured: Boolean(provider.apiKey) },
    models: await discoverModels(provider).catch(() => (provider.defaultModels || []).map((id) => ({ id, provider: provider.id }))),
  })));
  const discoveredMap = new Map(discovered.map((x) => [x.provider.id, x]));
  return configuredProviders.map((provider) => {
    const live = discoveredMap.get(provider.id);
    const modelCount = live?.models?.length || 0;
    return {
      id: provider.id,
      name: provider.name,
      status: modelCount > 0 ? "healthy" : "degraded",
      configured: true,
      modelCount,
      models: (live?.models || []).slice(0, 40).map((m) => ({ id: m.id, rank: scoreModel(m.id) })),
    };
  });
}

export async function testControlProvider(providerId: string) {
  const before = Date.now();
  const providers = await getRuntimeProviderPool();
  const provider = providers.find((x) => x.id === providerId);
  if (!provider) return { ok: false, providerId, latencyMs: Date.now() - before, error: "provider_not_configured" };
  const models = await discoverModels(provider).catch(() => (provider.defaultModels || []).map((id) => ({ id, provider: provider.id })));
  const entry = { provider: { id: provider.id }, models };
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
  const deactivate = await db().from("admin_ai_prompts").update({active:false}).eq("agent_id",agent_id).eq("task_id",task_id);
  if (deactivate.error) throw deactivate.error;
  const r=await db().from("admin_ai_prompts").update({active:true,updated_at:new Date().toISOString()}).eq("id",id).select("*").single();
  if(r.error) throw r.error; return r.data;
}
export async function upsertTool(input: Record<string, unknown>) {
  const allowed=["id","name","description","input_schema","output_schema","permission_level","enabled","agent_ids","timeout_ms"];
  const row=Object.fromEntries(allowed.filter(k=>k in input).map(k=>[k,input[k]]));
  const r=await db().from("admin_ai_tools").upsert(row).select("*").single(); if(r.error) throw r.error; return r.data;
}
export function executionCost(inputTokens:number,outputTokens:number,model:string){return estimateCostUsd(inputTokens||0,outputTokens||0,model||"");}


export async function resolveAdminAiControlPlan(agentId="admin-assistant", taskId="chat") {
  try {
    const agentQ = await db().from("admin_ai_agents").select("*").eq("id", agentId).eq("enabled", true).maybeSingle();
    const taskQ = await db().from("admin_ai_tasks").select("*").eq("id", taskId).eq("enabled", true).maybeSingle();
    if (agentQ.error || taskQ.error || !agentQ.data || !taskQ.data) return null;
    const promptQ = await db().from("admin_ai_prompts").select("*")
      .eq("agent_id", agentId).eq("task_id", taskId).eq("active", true)
      .order("version", { ascending: false }).limit(1).maybeSingle();
    const prompt = promptQ.data || null;
    return {
      agent: agentQ.data,
      task: taskQ.data,
      prompt,
      primary: {
        provider: String(agentQ.data.primary_provider || taskQ.data.primary_provider || "").trim(),
        model: String(agentQ.data.primary_model || taskQ.data.primary_model || "").trim()
      },
      fallback: {
        provider: String(agentQ.data.fallback_provider || taskQ.data.fallback_provider || "").trim(),
        model: String(agentQ.data.fallback_model || taskQ.data.fallback_model || "").trim()
      }
    };
  } catch {
    return null;
  }
}

export async function runAdminAiPlayground(input: {
  adminUsername: string;
  agentId: string;
  taskId: string;
  message: string;
}) {
  const message = input.message.trim().slice(0, 12000);
  if (!message) throw new Error("پیام تست خالی است.");
  const agentQ = await db().from("admin_ai_agents").select("*").eq("id", input.agentId).eq("enabled", true).maybeSingle();
  if (agentQ.error) throw agentQ.error;
  if (!agentQ.data) throw new Error("Agent فعال پیدا نشد.");
  const taskQ = await db().from("admin_ai_tasks").select("*").eq("id", input.taskId).eq("enabled", true).maybeSingle();
  if (taskQ.error) throw taskQ.error;
  if (!taskQ.data) throw new Error("Task فعال پیدا نشد.");

  const promptQ = await db().from("admin_ai_prompts").select("*")
    .eq("agent_id", input.agentId).eq("task_id", input.taskId).eq("active", true)
    .order("version", { ascending: false }).limit(1).maybeSingle();
  if (promptQ.error) throw promptQ.error;
  const prompt = promptQ.data;
  const system = [
    String(agentQ.data.system_prompt || ""),
    String(prompt?.system_prompt || ""),
    String(prompt?.developer_instructions || ""),
    "این یک Playground تستی Admin AI است. هیچ ابزار، فایل، پرداخت، تغییر داده یا side effect را اجرا نکن. فقط پاسخ متنی تولید کن."
  ].filter(Boolean).join("\n\n");
  const messages: ChatMessage[] = [{ role: "system", content: system }, { role: "user", content: message }];
  const primaryProvider = String(agentQ.data.primary_provider || taskQ.data.primary_provider || "").trim();
  const primaryModel = String(agentQ.data.primary_model || taskQ.data.primary_model || "").trim();
  const fallbackProvider = String(agentQ.data.fallback_provider || taskQ.data.fallback_provider || "").trim();
  const fallbackModel = String(agentQ.data.fallback_model || taskQ.data.fallback_model || "").trim();
  const candidates = [
    primaryProvider && primaryModel ? { provider: primaryProvider, model: primaryModel } : null,
    fallbackProvider && fallbackModel ? { provider: fallbackProvider, model: fallbackModel } : null,
  ].filter(Boolean) as Array<{provider:string;model:string}>;
  if (!candidates.length) throw new Error("برای این Agent/Task مدل اصلی یا fallback تنظیم نشده است.");

  const requestId = crypto.randomUUID();
  const started = Date.now();
  await db().from("admin_ai_executions").insert({
    request_id: requestId, admin_username: input.adminUsername, agent_id: input.agentId,
    task_id: input.taskId, prompt_version: prompt?.version || null, status: "started",
    metadata: { playground: true, message_length: message.length }
  });

  let lastError: unknown = null;
  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    try {
      const result = await chatExactProviderModel(messages, candidate.provider, candidate.model, "rahyar-admin-playground");
      const inputTokens = Math.ceil(messages.reduce((n, m) => n + m.content.length, 0) / 4);
      const outputTokens = Math.ceil(result.reply.length / 4);
      await db().from("admin_ai_executions").update({
        status: "success", provider_id: result.provider, model_id: result.model,
        input_tokens: inputTokens, output_tokens: outputTokens, latency_ms: Date.now() - started,
        retry_count: i, fallback_used: i > 0, estimated_cost_usd: executionCost(inputTokens, outputTokens, result.model),
        completed_at: new Date().toISOString()
      }).eq("request_id", requestId);
      return {
        request_id: requestId, reply: result.reply, provider: result.provider, model: result.model,
        latency_ms: Date.now() - started, prompt_version: prompt?.version || null, fallback_used: i > 0
      };
    } catch (error) {
      lastError = error;
    }
  }
  await db().from("admin_ai_executions").update({
    status: "failed", error_type: "playground_error",
    error_message: String(lastError instanceof Error ? lastError.message : lastError).slice(0, 500),
    latency_ms: Date.now() - started, completed_at: new Date().toISOString()
  }).eq("request_id", requestId);
  throw lastError || new Error("Playground اجرا نشد.");
}
