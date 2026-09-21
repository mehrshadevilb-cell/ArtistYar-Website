import { NextResponse } from "next/server";
import { autoChat, getConfiguredProviders, type ChatMessage } from "@/lib/ai-providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function base() {
  return (process.env.RAHYAR_API_URL || process.env.RAHYAR_AI_GATEWAY_URL || "").replace(/\/$/, "");
}

const SYSTEM = `تو راه‌یار، دستیار آموزشی آرتیست‌یار هستی. پاسخ‌ها را فارسی، دقیق و کاربردی بنویس.`;

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "بدنه درخواست نامعتبر است.", reply: "بدنه درخواست نامعتبر است." },
      { status: 400 },
    );
  }

  const message =
    (typeof body.message === "string" && body.message.trim()) ||
    (typeof body.content === "string" && body.content.trim()) ||
    "";
  const history = Array.isArray(body.messages)
    ? (body.messages as Array<{ role?: string; content?: string }>)
        .filter((m) => m && typeof m.content === "string")
        .map((m) => ({
          role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
          content: String(m.content).slice(0, 8000),
        }))
        .slice(-20)
    : [];

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    ...(history.length
      ? history
      : message
        ? [{ role: "user" as const, content: message.slice(0, 8000) }]
        : []),
  ];

  if (messages.length < 2) {
    return NextResponse.json({ ok: false, error: "پیام خالی است.", reply: "پیام خالی است." }, { status: 400 });
  }

  // 1) Prefer local providers from Render env
  try {
    const configured = getConfiguredProviders().filter((p) => p.apiKey);
    if (configured.length) {
      const result = await autoChat(messages, undefined, undefined, "rahyar-web", request.signal);
      return NextResponse.json({
        ok: true,
        reply: result.reply,
        provider: result.provider,
        model: result.model,
      });
    }
  } catch (error) {
    console.error("rahyar assistant local failed", error instanceof Error ? error.message : error);
  }

  // 2) Backend bridge
  const backend = base();
  const bridgeSecret = process.env.RAHYAR_AI_BRIDGE_SECRET || process.env.RAHYAR_AI_KEY || "";
  if (!backend) {
    return NextResponse.json(
      {
        ok: false,
        error: "RAHYAR_API_URL تنظیم نشده و هیچ API key محلی هم نیست.",
        reply: "RAHYAR_API_URL تنظیم نشده و هیچ API key محلی هم نیست.",
      },
      { status: 503 },
    );
  }
  if (!bridgeSecret) {
    return NextResponse.json(
      {
        ok: false,
        error: "RAHYAR_AI_BRIDGE_SECRET تنظیم نشده و مدل محلی هم در دسترس نیست.",
        reply: "RAHYAR_AI_BRIDGE_SECRET تنظیم نشده و مدل محلی هم در دسترس نیست.",
      },
      { status: 503 },
    );
  }

  try {
    const res = await fetch(`${backend}/api/v1/assistant/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rahyar-ai-key": bridgeSecret,
      },
      body: JSON.stringify({
        message: message || history.filter((m) => m.role === "user").slice(-1)[0]?.content || "",
        messages: history,
      }),
      signal: request.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const raw = String(data.reply || data.error || data.detail || "").trim();
      const lower = raw.toLowerCase();
      const providerUnavailable =
        /no credits|credits|insufficient|quota|billing|balance|payment required|provider unavailable|provider_unavailable/i.test(lower);
      const msg =
        providerUnavailable
          ? "مدل فعلی اعتبار یا سهمیه کافی ندارد و باید به مدل/Provider دیگری منتقل شود."
          : res.status === 429
            ? "محدودیت نرخ پاسخ. کمی بعد دوباره تلاش کنید."
            : res.status >= 500
              ? "سرویس راه‌یار موقتاً در دسترس نیست؛ مسیر جایگزین AI باید فعال باشد."
              : raw || `خطا (${res.status})`;
      return NextResponse.json(
        { ok: false, error: msg, reply: msg },
        { status: res.status >= 500 ? 502 : res.status },
      );
    }
    return NextResponse.json(
      {
        ok: true,
        reply: data.reply || data.message || data.content || "",
        provider: data.provider || "rahyar-backend",
        model: data.model || "centralized-router",
      },
      { status: 200 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "اتصال به backend برقرار نشد.";
    return NextResponse.json(
      {
        ok: false,
        error: `اتصال به backend برقرار نشد: ${msg.slice(0, 160)}. RAHYAR_API_URL و وضعیت Render را چک کنید.`,
        reply: "اتصال به backend برقرار نشد. کمی بعد دوباره امتحان کن.",
      },
      { status: 502 },
    );
  }
}
