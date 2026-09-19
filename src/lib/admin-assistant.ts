import { createHash } from "crypto";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import { autoChat, type ChatMessage } from "@/lib/ai-providers";

export const ADMIN_ASSISTANT_SCOPE = "rahyar-admin-assistant";
export const ADMIN_ASSISTANT_SYSTEM_PROMPT = `تو RahYar Admin AI Assistant هستی؛ دستیار عمومی مدیریتی برای Owner و Admin آرتیست‌یار.
تجربه باید مستقیم، طبیعی، کوتاه و قابل‌اعتماد شبیه ChatGPT و Claude باشد.
در حوزه‌های اداری، خلاصه‌سازی، بازنویسی، گزارش‌نویسی و تصمیم‌سازی عمومی کمک کن.
به User Chat Bot، Music Analyzer، Audio Analysis، Repository Intelligence، Coding Agent، Multi-Agent و اجرای Command دسترسی نداری.
هرگز Secret، API Key، Cookie یا اطلاعات احراز هویت را بازگو نکن.`;

type AdminSession = { username: string; issuedAt: number };
type AdminAssistantMessage = { role: "user" | "assistant"; content: string; createdAt: string };

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const db = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

export async function requireAdminAssistant(): Promise<AdminSession | null> {
  const jar = await cookies();
  return verifyAdminSession(jar.get(ADMIN_SESSION_COOKIE)?.value);
}

export function normalizeAdminMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!item || typeof item !== "object") return null;
    const record = item as Record<string, unknown>;
    const content = typeof record.content === "string" ? record.content.trim().slice(0, 12000) : "";
    if (!content) return null;
    return { role: record.role === "assistant" ? "assistant" as const : "user" as const, content };
  }).filter((item): item is ChatMessage => item !== null).slice(-30);
}

export function conversationIdForAdmin(request: Request) {
  const value = request.headers.get("x-rahyar-admin-conversation")?.trim();
  return value && /^[a-zA-Z0-9_-]{8,80}$/.test(value) ? value : `admin-${createHash("sha256").update(Date.now() + Math.random().toString()).digest("hex").slice(0, 20)}`;
}

export async function generateAdminReply(messages: ChatMessage[], provider?: string, model?: string) {
  return autoChat([{ role: "system", content: ADMIN_ASSISTANT_SYSTEM_PROMPT }, ...messages], provider, model, ADMIN_ASSISTANT_SCOPE);
}

export async function loadConversation(id: string, actor: string) {
  if (!db) return [] as AdminAssistantMessage[];
  const conversation = await db.from("rahyar_admin_assistant_conversations").select("id").eq("id", id).eq("created_by", actor).maybeSingle();
  if (!conversation.data) return [] as AdminAssistantMessage[];
  const result = await db.from("rahyar_admin_assistant_messages").select("role,content,created_at").eq("conversation_id", id).order("created_at", { ascending: true }).limit(30);
  return (result.data || []).map((row) => ({ role: row.role as "user" | "assistant", content: row.content, createdAt: row.created_at }));
}

export async function persistConversationTurn(id: string, actor: string, userContent: string, assistantContent: string) {
  if (!db) return;
  const conversation = await db.from("rahyar_admin_assistant_conversations").upsert({ id, created_by: actor, updated_at: new Date().toISOString(), title: userContent.slice(0, 80) || "گفت‌وگوی جدید" }, { onConflict: "id" }).select("id").maybeSingle();
  if (!conversation.data) throw new Error("admin_assistant_conversation_persist_failed");
  const inserted = await db.from("rahyar_admin_assistant_messages").insert([
    { conversation_id: id, role: "user", content: userContent },
    { conversation_id: id, role: "assistant", content: assistantContent },
  ]);
  if (inserted.error) throw inserted.error;
  await db.from("rahyar_admin_assistant_audit_events").insert({ actor, action: "conversation_turn", conversation_id: id, metadata: { messageLength: userContent.length } });
}

export type { AdminAssistantMessage };
