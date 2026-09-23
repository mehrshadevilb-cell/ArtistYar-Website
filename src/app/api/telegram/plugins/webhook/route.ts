import { createHash } from "crypto";
import { NextResponse, after } from "next/server";
import {
  enqueuePluginMessage,
  processPendingPluginPairs,
} from "@/lib/telegram-plugin-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function expectedSecret() {
  const explicit = (process.env.TELEGRAM_PLUGIN_WEBHOOK_SECRET || "").trim();
  if (explicit) return explicit;
  const token = (process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || process.env.BOT_TOKEN || "").trim();
  return token
    ? createHash("sha256").update("artistyar-plugin-webhook:" + token).digest("hex").slice(0, 48)
    : "";
}

function authorized(request: Request) {
  const expected = expectedSecret();
  if (!expected) return false;
  return request.headers.get("x-telegram-bot-api-secret-token") === expected;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const update = await request.json().catch(() => null);
  const message = update?.channel_post || update?.edited_channel_post;
  if (!message) return NextResponse.json({ ok: true, ignored: true });

  // Telegram must receive a successful webhook response even if our internal
  // queue/database has a transient problem. Otherwise Telegram retries the
  // same update and can create duplicate work.
  try {
    const result = await enqueuePluginMessage(message);

    // Do the expensive Telegram download + AI vision + DB publish after the
    // webhook response has been prepared. Any processing failure is logged and
    // the queue row remains available for the explicit processor endpoint.
    after(async () => {
      try {
        const processed = await processPendingPluginPairs(5);
        if (processed.errors.length) {
          console.error("telegram_plugin_background_processing", processed);
        }
      } catch (error) {
        console.error("telegram_plugin_background_processing_failed", error);
      }
    });

    return NextResponse.json({ ok: true, accepted: true, result });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("telegram_plugin_queue_failed", error);

    // Never return 500 to Telegram for an internal queue failure. The update
    // is acknowledged; the diagnostic detail is kept server-side.
    return NextResponse.json({
      ok: true,
      accepted: false,
      queued: false,
      error: "plugin_queue_failed",
    });
  }
}
