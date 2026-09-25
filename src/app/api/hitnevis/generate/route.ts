import { NextRequest, NextResponse } from "next/server";
import { runtimeAutoChat } from "@/lib/ai-runtime";
import type { ChatMessage } from "@/lib/ai-providers";
import { detectIntent } from "@/lib/hitnevis/intent";
import {
  VALID_MODES,
  boundHistory,
  buildSystemPrompt,
  buildUserContent,
  roughLyricHints,
  type HistoryItem,
} from "@/lib/hitnevis/system";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_TOPIC = 2000;
const MAX_LYRICS = 12000;
const MAX_CONSTRAINTS = 2000;
const MAX_BRAIN = 8000;

function rid() {
  return `hn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function friendlyError(code: string, internal: string): string {
  if (code === "validation") return internal;
  if (code === "timeout" || /timeout/i.test(internal)) {
    return "زمان پاسخ مدل‌ها تمام شد. دوباره امتحان کن.";
  }
  if (/no_provider|all_providers_failed/i.test(internal)) {
    return "الان نتونستم به مدل‌ها وصل بشم. کمی بعد دوباره بزن.";
  }
  if (/aborted/i.test(internal)) return "درخواست لغو شد.";
  return "الان نتونستم جواب بدم. متنت سر جاشه — دوباره بزن.";
}

function clip(s: string, n: number) {
  return s.length > n ? s.slice(0, n) : s;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: "OPTIONS, POST" },
  });
}

export async function POST(req: NextRequest) {
  const requestId = rid();
  const started = Date.now();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "درخواست نامعتبر است.",
        code: "validation",
        retryable: false,
        requestId,
        latencyMs: Date.now() - started,
      },
      { status: 400 },
    );
  }

  const topicRaw = typeof body?.topic === "string" ? body.topic.trim() : "";
  const existingLyrics =
    typeof body?.existingLyrics === "string" ? clip(body.existingLyrics.trim(), MAX_LYRICS) : "";
  const constraints =
    typeof body?.constraints === "string" ? clip(body.constraints.trim(), MAX_CONSTRAINTS) : "";
  const sectionType =
    typeof body?.sectionType === "string" ? body.sectionType.trim().slice(0, 40) : "";
  const brainBlock =
    typeof body?.brainBlock === "string" ? clip(body.brainBlock.trim(), MAX_BRAIN) : "";
  const wantDirections = Boolean(body?.wantDirections);

  if (!topicRaw && !existingLyrics && !constraints) {
    return NextResponse.json(
      {
        ok: false,
        error: "پیامت را بنویس.",
        code: "validation",
        retryable: false,
        requestId: "hn-val",
        latencyMs: 0,
      },
      { status: 400 },
    );
  }

  if (topicRaw.length > MAX_TOPIC * 2 || (body?.conversationHistory?.length || 0) > 40) {
    return NextResponse.json(
      {
        ok: false,
        error: "متن یا تاریخچه خیلی طولانی است. کمی کوتاه‌تر کن.",
        code: "validation",
        retryable: false,
        requestId,
        latencyMs: Date.now() - started,
      },
      { status: 400 },
    );
  }

  const topic = clip(topicRaw, MAX_TOPIC);
  const intent = detectIntent(topic || constraints || existingLyrics.slice(0, 200));

  let mode = String(body?.mode || intent.mode || "chat").trim();
  if (!VALID_MODES.has(mode)) mode = intent.mode || "chat";
  if (!VALID_MODES.has(mode)) mode = "chat";

  const history = boundHistory(
    (body?.conversationHistory || body?.messages || []) as HistoryItem[],
    14,
  );

  const system = buildSystemPrompt({
    mode,
    intent,
    brainBlock: brainBlock || undefined,
    wantDirections: wantDirections || intent.wantDirections,
    artistVoice: body?.artistVoice,
  });

  const userContent = buildUserContent({
    mode,
    topic: topic || undefined,
    existingLyrics: existingLyrics || undefined,
    constraints: constraints || undefined,
    sectionType: sectionType || undefined,
    intentNote: `${intent.primary}/${intent.target} (conf ${intent.confidence.toFixed(2)})`,
  });

  const messages: ChatMessage[] = [
    { role: "system", content: system },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userContent },
  ];

  const ac = new AbortController();
  const parentSignal = req.signal;
  const onAbort = () => ac.abort();
  parentSignal?.addEventListener("abort", onAbort);
  const hardTimer = setTimeout(() => ac.abort(), 45_000);

  try {
    const result = await runtimeAutoChat(
      messages,
      undefined,
      undefined,
      "hitnevis",
      ac.signal,
    );

    const text = (result.reply || "").trim();
    if (!text) {
      return NextResponse.json(
        {
          ok: false,
          error: friendlyError("empty", "empty_reply"),
          code: "empty",
          retryable: true,
          requestId,
          latencyMs: Date.now() - started,
        },
        { status: 502 },
      );
    }

    const hints = roughLyricHints(existingLyrics || text);

    return NextResponse.json({
      ok: true,
      requestId,
      text,
      provider: result.provider,
      model: result.model,
      latencyMs: Date.now() - started,
      mode,
      intent: {
        primary: intent.primary,
        target: intent.target,
        confidence: intent.confidence,
      },
      hints: hints.length ? hints : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout = /timeout|aborted/i.test(message);
    const isAbort = /aborted/i.test(message) && parentSignal?.aborted;

    console.error("[hitnevis/generate]", requestId, message.slice(0, 400));

    return NextResponse.json(
      {
        ok: false,
        error: friendlyError(isAbort ? "aborted" : isTimeout ? "timeout" : "fail", message),
        code: isAbort ? "aborted" : isTimeout ? "timeout" : "provider_fail",
        retryable: !isAbort,
        requestId,
        latencyMs: Date.now() - started,
      },
      { status: isAbort ? 499 : 502 },
    );
  } finally {
    clearTimeout(hardTimer);
    parentSignal?.removeEventListener("abort", onAbort);
  }
}
