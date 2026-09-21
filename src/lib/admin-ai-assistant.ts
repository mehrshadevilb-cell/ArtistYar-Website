import { createClient } from "@supabase/supabase-js";
import { chatExactProviderModel, type ChatMessage } from "@/lib/ai-providers";
import { runtimeAutoChat } from "@/lib/ai-runtime";
import { listAdminAiRoutingCandidates } from "@/lib/admin-ai-model-registry";
import { recordAdminAiModelFailure, recordAdminAiModelSuccess } from "@/lib/admin-ai-model-health";
import { executionCost, resolveAdminAiControlPlan } from "@/lib/admin-ai-control";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

export const ADMIN_AI_SYSTEM_PROMPT = "تو RahYar Admin AI Assistant هستی؛ دستیار عمومی و مدیریتی فقط برای مدیران مجاز آکادمی.\nتو User Chat Bot نیستی. کار تو گفت‌وگوی طبیعی، خلاصه‌سازی، بازنویسی، تهیه گزارش و کمک عمومی مدیریتی است.\nدر این محصول هیچ دسترسی به Repository، کدنویسی، اجرای Command، تحلیل صوت، تحلیل موسیقی، Multi-Agent یا Workflow چندمرحله‌ای نداری. اگر کاری نیازمند چنین دسترسی‌ای بود، بگو در این Assistant در دسترس نیست.\nپاسخ را فارسی، حرفه‌ای، مستقیم و ساختاریافته نگه دار.";

export type AdminAiMessage = { role: "user" | "assistant"; content: string; provider?: string | null; model?: string | null; created_at?: string };

async function executionStart(input: { requestId:string; adminUsername:string; metadata?:Record<string,unknown> }) {
  if (!supabase) return;
  await supabase.from("admin_ai_executions").insert({request_id:input.requestId,admin_username:input.adminUsername,status:"started",metadata:input.metadata||{}});
}
async function executionFinish(requestId:string, patch:Record<string,unknown>) {
  if (!supabase) return;
  await supabase.from("admin_ai_executions").update({ ...patch, completed_at:new Date().toISOString() }).eq("request_id",requestId);
}

function db() {
  if (!supabase) throw new Error("admin_ai_storage_not_configured");
  return supabase;
}

async function audit(adminUsername: string, action: string, conversationId?: string, metadata: Record<string, unknown> = {}) {
  if (!supabase) return;
  await supabase.from("admin_ai_audit_logs").insert({ admin_username: adminUsername, action, conversation_id: conversationId || null, metadata });
}

export async function createConversation(adminUsername: string) {
  const result = await db().from("admin_ai_conversations").insert({ admin_username: adminUsername }).select("id,title,archived,created_at,updated_at").single();
  if (result.error) throw result.error;
  await audit(adminUsername, "conversation_created", result.data.id);
  return result.data;
}

export async function listConversations(adminUsername: string) {
  const result = await db().from("admin_ai_conversations").select("id,title,archived,created_at,updated_at").eq("admin_username", adminUsername).order("updated_at", { ascending: false }).limit(100);
  if (result.error) throw result.error;
  return result.data || [];
}

export async function getConversation(adminUsername: string, id: string) {
  const conversation = await db().from("admin_ai_conversations").select("id,title,archived,created_at,updated_at").eq("id", id).eq("admin_username", adminUsername).maybeSingle();
  if (conversation.error) throw conversation.error;
  if (!conversation.data) return null;
  const messages = await db().from("admin_ai_messages").select("role,content,provider,model,created_at").eq("conversation_id", id).order("created_at", { ascending: true }).limit(100);
  if (messages.error) throw messages.error;
  return { ...conversation.data, messages: (messages.data || []) as AdminAiMessage[] };
}

export async function renameConversation(adminUsername: string, id: string, title: string) {
  const result = await db().from("admin_ai_conversations").update({ title: title.trim().slice(0, 120), updated_at: new Date().toISOString() }).eq("id", id).eq("admin_username", adminUsername).select("id,title,archived,created_at,updated_at").maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) return null;
  await audit(adminUsername, "conversation_renamed", id);
  return result.data;
}

export async function archiveConversation(adminUsername: string, id: string) {
  const result = await db().from("admin_ai_conversations").update({ archived: true, updated_at: new Date().toISOString() }).eq("id", id).eq("admin_username", adminUsername).select("id,title,archived,created_at,updated_at").maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) return null;
  await audit(adminUsername, "conversation_archived", id);
  return result.data;
}

export async function sendAdminMessage(adminUsername: string, conversationId: string, content: string, provider?: string, model?: string, signal?: AbortSignal) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  await executionStart({requestId,adminUsername,metadata:{conversationId}});
  try {
  const conversation = await getConversation(adminUsername, conversationId);
  if (!conversation) throw new Error("admin_ai_conversation_not_found");
  const userContent = content.trim().slice(0, 16000);
  if (!userContent) throw new Error("admin_ai_empty_message");

  const history: ChatMessage[] = conversation.messages.slice(-30).map((m) => ({ role: m.role, content: m.content }));
  history.push({ role: "user", content: userContent });
  const controlPlan = await resolveAdminAiControlPlan("admin-assistant", "chat");
  const controlSystem = [
    ADMIN_AI_SYSTEM_PROMPT,
    controlPlan?.agent?.system_prompt,
    controlPlan?.prompt?.system_prompt,
    controlPlan?.prompt?.developer_instructions
  ].filter(Boolean).join("\n\n");
  const controlPrimary = controlPlan?.primary.provider && controlPlan?.primary.model
    ? controlPlan.primary
    : null;

  let result: Awaited<ReturnType<typeof runtimeAutoChat>> | null = null;
  let fallbackUsed = false;
  if (provider || model) {
    if (!provider || !model) throw new Error("admin_ai_provider_and_model_must_be_paired");
    const allowed = await listAdminAiRoutingCandidates();
    if (!allowed.some((candidate) => candidate.provider_id === provider && candidate.model_id === model)) {
      throw new Error("admin_ai_model_not_enabled_for_routing");
    }
    try {
      result = await chatExactProviderModel([{ role: "system", content: controlSystem }, ...history], provider, model, "rahyar-admin-assistant", signal);
      await recordAdminAiModelSuccess(provider, model);
    } catch (error) {
      if (signal?.aborted) throw new Error("admin_ai_generation_stopped");
      await recordAdminAiModelFailure(provider, model, error);
      // Auto-failover to ranked scan if explicit pair fails
      try {
        result = await runtimeAutoChat([{ role: "system", content: controlSystem }, ...history], undefined, undefined, "rahyar-admin-assistant", signal);
        fallbackUsed = true;
        await recordAdminAiModelSuccess(result.provider, result.model).catch(() => null);
      } catch {
        throw error;
      }
    }
  } else {
    // Ranked failover across all Render env APIs (control primary preferred first)
    const preferredProvider = controlPrimary?.provider;
    const preferredModel = controlPrimary?.model;
    try {
      result = await runtimeAutoChat(
        [{ role: "system", content: controlSystem }, ...history],
        preferredProvider,
        preferredModel,
        "rahyar-admin-assistant",
        signal,
      );
      await recordAdminAiModelSuccess(result.provider, result.model).catch(() => null);
      fallbackUsed = Boolean(
        preferredProvider && (result.provider !== preferredProvider || result.model !== preferredModel),
      );
    } catch (error) {
      if (signal?.aborted) throw new Error("admin_ai_generation_stopped");
      const msg = error instanceof Error ? error.message : String(error);
      if (msg === "no_provider_configured") throw new Error("admin_ai_no_provider_configured");
      if (msg.startsWith("all_providers_failed:")) {
        throw new Error(`admin_ai_all_models_failed:${msg.slice("all_providers_failed:".length)}`);
      }
      throw new Error(`admin_ai_all_models_failed:${msg.slice(0, 400)}`);
    }
  }

  const completedResult = result;
  if (!completedResult || typeof completedResult.reply !== "string" || !completedResult.reply.trim()) {
    throw new Error("admin_ai_empty_provider_result");
  }

  const userInsert = await db().from("admin_ai_messages").insert({ conversation_id: conversationId, role: "user", content: userContent }).select("id").single();
  if (userInsert.error) throw userInsert.error;

  const assistantInsert = await db().from("admin_ai_messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: completedResult.reply,
    provider: completedResult.provider,
    model: completedResult.model
  }).select("id,role,content,provider,model,created_at").single();
  if (assistantInsert.error) throw assistantInsert.error;

  await db().from("admin_ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId).eq("admin_username", adminUsername);
  const inputTokens = Math.ceil(history.reduce((n,m)=>n+m.content.length,0)/4);
  const outputTokens = Math.ceil(completedResult.reply.length/4);
  await executionFinish(requestId,{
    status:"success",provider_id:completedResult.provider,model_id:completedResult.model,
    input_tokens:inputTokens,output_tokens:outputTokens,latency_ms:Date.now()-startedAt,
    retry_count:0,
    estimated_cost_usd:executionCost(inputTokens,outputTokens,completedResult.model), fallback_used:fallbackUsed
  });
  await audit(adminUsername, "message_completed", conversationId, { provider: completedResult.provider, model: completedResult.model, requestId });
  return { ...assistantInsert.data, request_id: requestId };
  } catch (error) {
    await executionFinish(requestId,{
      status:"failed",
      error_type:"runtime_error",
      error_message:String(error instanceof Error ? error.message : error).slice(0,500),
      latency_ms:Date.now()-startedAt
    });
    throw error;
  }
}
