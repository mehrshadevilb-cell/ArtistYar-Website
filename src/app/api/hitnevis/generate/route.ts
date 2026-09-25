import { NextRequest, NextResponse } from "next/server";
import { runtimeAutoChat } from "@/lib/ai-runtime";
import type { ChatMessage } from "@/lib/ai-providers";
import {
  VALID_MODES,
  boundHistory,
  buildSystemPrompt,
  buildUserContent,
  type HistoryItem,
} from "@/lib/hitnevis/system";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  const mode = String(body?.mode || "chat").trim();
  if (!VALID_MODES.has(mode)) {
    return NextResponse.json(
      {
        ok: false,
        error: "حالت (mode) نامعتبر است.",
        code: "validation",
        retryable: false,
        requestId: "hn-val",
        latencyMs: 0,
      },
      { status: 400 },
    );
  }

  const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
  const existingLyrics =
    typeof body?.existingLyrics === "string" ? body.existingLyrics.trim() : "";
  const constraints =
    typeof body?.constraints === "string" ? body.constraints.trim() : "";
  const sectionType =
    typeof body?.sectionType === "string" ? body.sectionType.trim() : "";

  // Accept either free chat message (topic/constraints) or lyrics work
  if (!topic && !existingLyrics && !constraints) {
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

  const history = boundHistory(
    (body?.conversationHistory || body?.messages || []) as HistoryItem[],
    14,
  );

  const system = buildSystemPrompt(mode, body?.artistVoice);
  const userContent = buildUserContent({
    mode,
    topic: topic || undefined,
    existingLyrics: existingLyrics || undefined,
    constraints: constraints || undefined,
    sectionType: sectionType || undefined,
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

  // Hard ceiling so we never hang the client forever
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

    return NextResponse.json({
      ok: true,
      requestId,
      text,
      provider: result.provider,
      model: result.model,
      latencyMs: Date.now() - started,
      mode,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout = /timeout|aborted/i.test(message);
    const isAbort = /aborted/i.test(message) && parentSignal?.aborted;

    // Log internal detail server-side only
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
