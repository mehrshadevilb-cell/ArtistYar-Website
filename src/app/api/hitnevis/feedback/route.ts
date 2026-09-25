import { NextResponse } from "next/server";
import { extractLyricFeatures } from "@/lib/hitnevis/kb/lyric-features";
import { recordHitNevisFeedback, type AdaptiveSignal } from "@/lib/hitnevis/adaptive-learning";
import { isValidMode } from "@/lib/hitnevis/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 32 * 1024;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const attempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request) {
  return (request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "hitnevis-feedback-anon").slice(0, 64);
}

function rateAllowed(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) { attempts.set(key, { count: 1, resetAt: now + WINDOW_MS }); return true; }
  current.count += 1;
  return current.count <= MAX_PER_WINDOW;
}

const SIGNALS: AdaptiveSignal[] = ["positive", "negative", "used", "rejected"];

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) return NextResponse.json({ ok: false, error: "درخواست بیش از حد بزرگ است." }, { status: 413 });
    if (!rateAllowed(clientKey(request))) return NextResponse.json({ ok: false, error: "تعداد بازخوردها زیاد است." }, { status: 429 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const mode = typeof body.mode === "string" ? body.mode.trim().slice(0, 64) : "";
    const signal = typeof body.signal === "string" && SIGNALS.includes(body.signal as AdaptiveSignal)
      ? body.signal as AdaptiveSignal
      : null;
    const text = typeof body.text === "string" ? body.text.trim().slice(0, 8000) : "";

    if (!mode || !isValidMode(mode) || !signal) {
      return NextResponse.json({ ok: false, error: "سیگنال یادگیری نامعتبر است." }, { status: 400 });
    }

    const features = text ? extractLyricFeatures(text) : undefined;
    await recordHitNevisFeedback({ mode, signal, features });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[hitnevis/feedback]", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "ثبت بازخورد انجام نشد." }, { status: 500 });
  }
}
