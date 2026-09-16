import { NextResponse } from "next/server";
import { autoChat, type ChatMessage } from "@/lib/ai-providers";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `تو راه‌یار، دستیار آموزشی آرتیست‌یار هستی.
درباره تنظیم، میکس، مسترینگ، موسیقی، تئوری موسیقی، تولید موسیقی و دوره‌های آرتیست‌یار پاسخ دقیق، کاربردی و قابل‌فهم بده.
اگر سؤال خارج از حوزه موسیقی بود، کوتاه و محترمانه بگو تمرکزت روی موسیقی و آرتیست‌یار است.
پاسخ‌ها را به فارسی و با لحن حرفه‌ای و دوستانه بنویس.`;

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((message): message is Record<string, unknown> => Boolean(message) && typeof message === "object")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: typeof message.content === "string" ? message.content.trim() : "",
    }))
    .filter((message) => message.content.length > 0)
    .slice(-20);
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      message?: unknown;
      messages?: unknown;
      provider?: unknown;
      model?: unknown;
    };

    const incoming = normalizeMessages(body.messages);
    const messages = incoming.length
      ? incoming
      : typeof body.message === "string" && body.message.trim()
        ? [{ role: "user" as const, content: body.message.trim() }]
        : [];

    if (!messages.length) {
      return NextResponse.json(
        { ok: false, error: "پیام خالی است." },
        { status: 400 },
      );
    }

    const withSystemPrompt: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    const result = await autoChat(
      withSystemPrompt,
      typeof body.provider === "string" ? body.provider : undefined,
      typeof body.model === "string" ? body.model : undefined,
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
