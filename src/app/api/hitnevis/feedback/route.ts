import { NextResponse } from "next/server";
import { extractLyricFeatures } from "@/lib/hitnevis/kb/lyric-features";
import { recordHitNevisFeedback, type AdaptiveSignal } from "@/lib/hitnevis/adaptive-learning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNALS: AdaptiveSignal[] = ["positive", "negative", "used", "rejected"];

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const mode = typeof body.mode === "string" ? body.mode.trim().slice(0, 64) : "";
    const signal = typeof body.signal === "string" && SIGNALS.includes(body.signal as AdaptiveSignal)
      ? body.signal as AdaptiveSignal
      : null;
    const text = typeof body.text === "string" ? body.text.trim().slice(0, 8000) : "";

    if (!mode || !signal) {
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
