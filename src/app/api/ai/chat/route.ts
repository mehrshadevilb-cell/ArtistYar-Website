import { NextResponse } from "next/server";
import { type ChatMessage } from "@/lib/ai-providers";
import { runtimeAutoChat } from "@/lib/ai-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_PROMPT = `تو راه‌یار، دستیار آموزشی آرتیست‌یار هستی.
درباره تنظیم، میکس، مسترینگ، موسیقی، تئوری موسیقی، تولید موسیقی و دوره‌های آرتیست‌یار پاسخ دقیق، کاربردی و قابل‌فهم بده.
اگر سؤال خارج از حوزه موسیقی بود، کوتاه و محترمانه بگو تمرکزت روی موسیقی و آرتیست‌یار است.
پاسخ‌ها را به فارسی و با لحن حرفه‌ای و دوستانه بنویس.`;

type NormalizedMessage = ChatMessage;

const chatAttempts = new Map<string, { count: number; resetAt: number }>();
const CHAT_WINDOW_MS = 60 * 1000;
const CHAT_MAX_PER_WINDOW = 20;
const MAX_CHAT_BODY_BYTES = 256 * 1024;
const MAX_CHAT_RATE_KEYS = 10_000;

function checkChatRateLimit(key: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  for (const [storedKey, entry] of chatAttempts) {
    if (entry.resetAt <= now) chatAttempts.delete(storedKey);
  }
  if (!chatAttempts.has(key) && chatAttempts.size >= MAX_CHAT_RATE_KEYS) {
    const oldest = chatAttempts.keys().next().value;
    if (oldest) chatAttempts.delete(oldest);
  }
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

function mapChatError(error: unknown): { status: number; message: string } {
  const raw = error instanceof Error ? error.message : String(error || "");
  if (raw === "no_provider_configured") {
    return {
      status: 503,
      message:
        "هیچ API keyای برای مدل‌ها روی سرور تنظیم نشده. روی Render حداقل OPENAI_API_KEY یا OPENROUTER_API_KEY یا GROQ_API_KEY بگذار.",
    };
  }
  if (raw.startsWith("all_providers_failed:")) {
    const detail = raw.slice("all_providers_failed:".length).trim().slice(0, 280);
    return {
      status: 502,
      message: detail
        ? `مدل‌های محلی پاسخ ندادند (${detail}).`
        : "مدل‌های محلی پاسخ ندادند.",
    };
  }
  if (raw.includes("aborted") || raw.includes("timeout")) {
    return { status: 504, message: "زمان پاسخ مدل تمام شد. دوباره امتحان کن." };
  }
  return {
    status: 502,
    message: raw && raw.length < 220 ? raw : "اتصال به مدل‌های هوش مصنوعی برقرار نشد. کمی بعد دوباره امتحان کن.",
  };
}

async function chatViaRahyarBackend(
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<{ reply: string; provider: string; model: string }> {
  const backend = (process.env.RAHYAR_API_URL || process.env.RAHYAR_AI_GATEWAY_URL || "").replace(/\/$/, "");
  const secret = process.env.RAHYAR_AI_BRIDGE_SECRET || process.env.RAHYAR_AI_KEY || "";
  if (!backend || !secret) {
    throw new Error("rahyar_bridge_not_configured");
  }
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  const res = await fetch(`${backend}/api/v1/assistant/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-rahyar-ai-key": secret,
    },
    body: JSON.stringify({
      message: lastUser,
      messages: messages.filter((m) => m.role !== "system"),
    }),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.reply || data.error || data.detail || `rahyar_backend_http_${res.status}`;
    throw new Error(String(msg).slice(0, 240));
  }
  const reply = data.reply || data.message || data.content || "";
  if (!reply || typeof reply !== "string") throw new Error("rahyar_empty_reply");
  return { reply, provider: "rahyar-backend", model: data.model || "centralized-router" };
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_CHAT_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "درخواست گفتگو بیش از حد بزرگ است." }, { status: 413 });
    }

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
    const messages: ChatMessage[] =
      incoming.length
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

    const preferredProvider = typeof body.provider === "string" ? body.provider : undefined;
    const preferredModel = typeof body.model === "string" ? body.model : undefined;

    let lastError: unknown;
    try {
      const result = await runtimeAutoChat(
        withSystemPrompt,
        preferredProvider,
        preferredModel,
        clientId,
        request.signal,
      );
      return NextResponse.json({
        ok: true,
        reply: result.reply,
        provider: result.provider,
        model: result.model,
      });
    } catch (error) {
      lastError = error;
      if (request.signal.aborted) {
        return new NextResponse(null, { status: 499 });
      }
      console.error("AI chat local path failed", error instanceof Error ? error.message : error);
    }

    try {
      const result = await chatViaRahyarBackend(withSystemPrompt, request.signal);
      return NextResponse.json({
        ok: true,
        reply: result.reply,
        provider: result.provider,
        model: result.model,
        via: "rahyar-backend",
      });
    } catch (error) {
      console.error("AI chat rahyar backend failed", error instanceof Error ? error.message : error);
      const mapped = mapChatError(lastError || error);
      const backendMsg = error instanceof Error ? error.message : String(error);
      if (backendMsg === "rahyar_bridge_not_configured" && lastError) {
        return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status });
      }
      if (backendMsg !== "rahyar_bridge_not_configured") {
        const local = mapChatError(lastError);
        return NextResponse.json(
          {
            ok: false,
            error:
              local.message.includes("API key")
                ? local.message
                : `اتصال برقرار نشد. محلی: ${local.message.slice(0, 120)} | بک‌اند: ${backendMsg.slice(0, 120)}`,
          },
          { status: 502 },
        );
      }
      return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status });
    }
  } catch (error) {
    console.error("AI chat request failed", error);
    const mapped = mapChatError(error);
    return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status });
  }
}
