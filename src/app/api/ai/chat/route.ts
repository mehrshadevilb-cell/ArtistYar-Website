import { NextResponse } from "next/server";
import { autoChat, type ChatMessage } from "@/lib/ai-providers";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `تو راه‌یار، دستیار آموزشی آرتیست‌یار هستی.
درباره تنظیم، میکس، مسترینگ، موسیقی، تئوری موسیقی، تولید موسیقی و دوره‌های آرتیست‌یار پاسخ دقیق، کاربردی و قابل‌فهم بده.
اگر سؤال خارج از حوزه موسیقی بود، کوتاه و محترمانه بگو تمرکزت روی موسیقی و آرتیست‌یار است.
پاسخ‌ها را به فارسی و با لحن حرفه‌ای و دوستانه بنویس.`;

type NormalizedMessage = ChatMessage;

/** Simple per-IP chat rate limit (in-memory). */
const chatAttempts = new Map<string, { count: number; resetAt: number }>();
const CHAT_WINDOW_MS = 60 * 1000;
const CHAT_MAX_PER_WINDOW = 20;

function checkChatRateLimit(key: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = chatAttempts.get(key);
  if (!entry || entry.resetAt <= now) {
    chatAttempts.set(key, { count: 1, resetAt: now + CHAT_WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }
  entry.count += 1;
  if (entry.count > CHAT_MAX_PER_WINDOW) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

function normalizeMessages(value: unknown): NormalizedMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((message): message is Record<string, unknown> => Boolean(message) && typeof message === "object")
    .map((message): NormalizedMessage | null => {
      const role = message.role === "assistant" ? "assistant" : "user";
      const content = typeof message.content === "string" ? message.content.trim() : "";
      if (!content) return null;
      // Cap single message size to reduce prompt injection / cost abuse
      return { role, content: content.slice(0, 8000) };
    })
    .filter((message): message is NormalizedMessage => message !== null)
    .slice(-20);
}

function clientIdFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = request.headers.get("x-real-ip")?.trim();
  const value = forwarded || real || "artistyar-web-anonymous";
  return value.slice(0, 64);
}

export async function POST(request: Request) {
  try {
    const clientKey = clientIdFromRequest(request);
    const limit = checkChatRateLimit(clientKey);
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "تعداد درخواست‌ها زیاد است. کمی بعد دوباره امتحان کن." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
      );
    }

    const body = (await request.json()) as {
      message?: unknown;
      messages?: unknown;
      provider?: unknown;
      model?: unknown;
      client_id?: unknown;
    };

    const incoming = normalizeMessages(body.messages);
    const messages: ChatMessage[] = incoming.length
      ? incoming
      : typeof body.message === "string" && body.message.trim()
        ? [{ role: "user", content: body.message.trim().slice(0, 8000) }]
        : [];

    if (!messages.length) {
      return NextResponse.json({ ok: false, error: "پیام خالی است." }, { status: 400 });
    }

    const withSystemPrompt: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];

    const clientId =
      typeof body.client_id === "string" && body.client_id.trim()
        ? body.client_id.trim().slice(0, 64)
        : clientKey;

    const result = await autoChat(
      withSystemPrompt,
      typeof body.provider === "string" ? body.provider : undefined,
      typeof body.model === "string" ? body.model : undefined,
      clientId,
    );

    return NextResponse.json({
      ok: true,
      reply: result.reply,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI provider request failed";
    return NextResponse.json(
      {
        ok: false,
        error: `اتصال به مدل‌های هوش مصنوعی برقرار نشد. ${message}`,
      },
      { status: 502 },
    );
  }
}
