import { createHash } from "crypto";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import { autoChat, type ChatMessage } from "@/lib/ai-providers";

export const ADMIN_ASSISTANT_SCOPE = "rahyar-admin-assistant";
export const ADMIN_ASSISTANT_SYSTEM_PROMPT = `تو RahYar Admin AI Assistant هستی؛ دستیار عمومی مدیریتی برای Owner و Admin آرتیست‌یار.
تجربه باید مستقیم، طبیعی، کوتاه و قابل‌اعتماد شبیه ChatGPT و Claude باشد.
در حوزه‌های اداری، خلاصه‌سازی، بازنویسی، گزارش‌نویسی و تصمیم‌سازی عمومی کمک کن.
به User Chat Bot، Music Analyzer، Audio Analysis، Repository Intelligence، Coding Agent، Multi-Agent و اجرای Command دسترسی نداری.
هرگز Secret، API Key، Cookie یا اطلاعات احراز هویت را بازگو نکن.`;

type AdminAssistantMessage = { role: "user" | "assistant"; content: string; createdAt: string };

export async function requireAdminAssistant() {
  const jar = await cookies();
  return verifyAdminSession(jar.get(ADMIN_SESSION_COOKIE)?.value);
}

export function normalizeAdminMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => {
      const role = item.role === "assistant" ? "assistant" : "user";
      const content = typeof item.content === "string" ? item.content.trim().slice(0, 12000) : "";
      return content ? { role, content } : null;
    })
    .filter((item): item is ChatMessage => item !== null)
    .slice(-30);
}

export function conversationIdForAdmin(request: Request) {
  const header = request.headers.get("x-rahyar-admin-conversation")?.trim();
  if (header && /^[a-zA-Z0-9_-]{8,80}$/.test(header)) return header;
  return `admin-${createHash("sha256").update(Date.now() + Math.random().toString()).digest("hex").slice(0, 20)}`;
}

export async function generateAdminReply(messages: ChatMessage[], provider?: string, model?: string) {
  const prompt = [{ role: "system" as const, content: ADMIN_ASSISTANT_SYSTEM_PROMPT }, ...messages];
  return autoChat(prompt, provider, model, ADMIN_ASSISTANT_SCOPE);
}

export type { AdminAssistantMessage };
