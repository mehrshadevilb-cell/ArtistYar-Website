import { createClient } from "@supabase/supabase-js";
import { autoChat, type ChatMessage } from "@/lib/ai-providers";
import { listAdminAiRoutingCandidates } from "@/lib/admin-ai-model-registry";
import { listHealthyAdminAiModels, recordAdminAiModelFailure, recordAdminAiModelSuccess } from "@/lib/admin-ai-model-health";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

export const ADMIN_AI_SYSTEM_PROMPT = "تو RahYar Admin AI Assistant هستی؛ دستیار عمومی و مدیریتی فقط برای مدیران مجاز آکادمی.\nتو User Chat Bot نیستی. کار تو گفت‌وگوی طبیعی، خلاصه‌سازی، بازنویسی، تهیه گزارش و کمک عمومی مدیریتی است.\nدر این محصول هیچ دسترسی به Repository، کدنویسی، اجرای Command، تحلیل صوت، تحلیل موسیقی، Multi-Agent یا Workflow چندمرحله‌ای نداری. اگر کاری نیازمند چنین دسترسی‌ای بود، بگو در این Assistant در دسترس نیست.\nپاسخ را فارسی، حرفه‌ای، مستقیم و ساختاریافته نگه دار.";

export type AdminAiMessage = { role: "user" | "assistant"; content: string; provider?: string | null; model?: string | null; created_at?: string };

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
  const conversation = await getConversation(adminUsername, conversationId);
  if (!conversation) throw new Error("admin_ai_conversation_not_found");
  const userContent = content.trim().slice(0, 16000);
  if (!userContent) throw new Error("admin_ai_empty_message");

  const history: ChatMessage[] = conversation.messages.slice(-30).map((m) => ({ role: m.role, content: m.content }));
  history.push({ role: "user", content: userContent });

  const userInsert = await db().from("admin_ai_messages").insert({ conversation_id: conversationId, role: "user", content: userContent }).select("id").single();
  if (userInsert.error) throw userInsert.error;

  let result: Awaited<ReturnType<typeof autoChat>>;
  if (provider || model) {
    if (!provider || !model) throw new Error("admin_ai_provider_and_model_must_be_paired");
    const allowed = await listAdminAiRoutingCandidates();
    if (!allowed.some((candidate) => candidate.provider_id === provider && candidate.model_id === model)) {
      throw new Error("admin_ai_model_not_enabled_for_routing");
    }
    result = await autoChat([{ role: "system", content: ADMIN_AI_SYSTEM_PROMPT }, ...history], provider, model, "rahyar-admin-assistant", signal);
  } else {
    const candidates = await listHealthyAdminAiModels(await listAdminAiRoutingCandidates());
    if (!candidates.length) throw new Error("admin_ai_no_healthy_model");
    let lastError: unknown;
    let completed = false;
    for (const candidate of candidates) {
      if (signal?.aborted) throw new Error("admin_ai_generation_stopped");
      try {
        result = await autoChat([{ role: "system", content: ADMIN_AI_SYSTEM_PROMPT }, ...history], candidate.provider_id, candidate.model_id, "rahyar-admin-assistant", signal);
        await recordAdminAiModelSuccess(candidate.provider_id, candidate.model_id);
        completed = true;
        break;
      } catch (error) {
        lastError = error;
        await recordAdminAiModelFailure(candidate.provider_id, candidate.model_id, error);
      }
    }
    if (!completed) throw lastError || new Error("admin_ai_all_models_failed");
  }

  const assistantInsert = await db().from("admin_ai_messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: result.reply,
    provider: result.provider,
    model: result.model
  }).select("id,role,content,provider,model,created_at").single();
  if (assistantInsert.error) throw assistantInsert.error;

  await db().from("admin_ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId).eq("admin_username", adminUsername);
  await audit(adminUsername, "message_completed", conversationId, { provider: result.provider, model: result.model });
  return assistantInsert.data;
}