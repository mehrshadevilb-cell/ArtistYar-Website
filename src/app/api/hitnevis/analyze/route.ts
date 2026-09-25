import { NextRequest, NextResponse } from "next/server";
import { runtimeAutoChat } from "@/lib/ai-runtime";
import type { ChatMessage } from "@/lib/ai-providers";
import { buildSystemPrompt, roughLyricHints } from "@/lib/hitnevis/system";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

const KIND_TO_MODE: Record<string, string> = {
  dna: "hit_dna",
  hit_dna: "hit_dna",
  cliche: "anti_cliche",
  anti_cliche: "anti_cliche",
  critic: "critic",
  human: "human_tests",
  human_tests: "human_tests",
  idea: "idea_analyze",
};

function rid() {
  return `hn-a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: "OPTIONS, POST" } });
}

export async function POST(req: NextRequest) {
  const requestId = rid();
  const started = Date.now();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "درخواست نامعتبر است.", code: "validation", requestId, latencyMs: 0 },
      { status: 400 },
    );
  }

  const text = String(body?.text || "").trim().slice(0, 8000);
  if (!text) {
    return NextResponse.json(
      { ok: false, error: "متنی برای تحلیل نیست.", code: "validation", requestId, latencyMs: 0 },
      { status: 400 },
    );
  }

  const kind = String(body?.kind || "dna").trim().toLowerCase();
  const mode = KIND_TO_MODE[kind] || "hit_dna";
  const system = buildSystemPrompt({ mode });
  const notes = typeof body?.artistNotes === "string" ? body.artistNotes.trim().slice(0, 500) : "";

  const messages: ChatMessage[] = [
    { role: "system", content: system },
    {
      role: "user",
      content: [`تحلیل (${mode}):`, text, notes ? `یادداشت هنرمند: ${notes}` : ""]
        .filter(Boolean)
        .join("\n\n"),
    },
  ];

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 40_000);
  try {
    const result = await runtimeAutoChat(messages, undefined, undefined, "hitnevis-analyze", ac.signal);
    const out = (result.reply || "").trim();
    if (!out) {
      return NextResponse.json(
        {
          ok: false,
          error: "تحلیل خالی برگشت. دوباره بزن.",
          code: "empty",
          retryable: true,
          requestId,
          latencyMs: Date.now() - started,
        },
        { status: 502 },
      );
    }
    return NextResponse.json({
      ok: true,
      requestId,
      text: out,
      provider: result.provider,
      model: result.model,
      latencyMs: Date.now() - started,
      mode,
      hints: roughLyricHints(text),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[hitnevis/analyze]", requestId, message.slice(0, 300));
    return NextResponse.json(
      {
        ok: false,
        error: /timeout|aborted/i.test(message)
          ? "زمان تحلیل تمام شد. دوباره امتحان کن."
          : "الان تحلیل ممکن نشد. دوباره بزن.",
        code: /timeout|aborted/i.test(message) ? "timeout" : "provider_fail",
        retryable: true,
        requestId,
        latencyMs: Date.now() - started,
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}
