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
  const provided = request.headers.get("x-telegram-bot-api-secret-token") || "";
  // Setup always registers either the explicit secret or the deterministic
  // token-derived secret. Never accept an unsigned public webhook.
  return Boolean(expected && provided && provided === expected);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const update = await request.json().catch(() => null);
  // Only ingest newly published channel posts. Our own editMessageCaption call
  // produces edited_channel_post; re-ingesting it would create orphan queue rows
  // and can retrigger the pipeline.
  const message = update?.channel_post;
  if (!message) return NextResponse.json({ ok: true, ignored: true });

  // A successfully queued update can be acknowledged immediately; expensive
  // processing is handled by the background hook/cron. Queue failures must
  // return non-2xx below so Telegram retries the delivery.
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

    // A queue/database failure must be visible to Telegram as a failed webhook
    // delivery so Telegram retries the update. The DB unique constraints make
    // those retries idempotent; acknowledging here would permanently lose posts.
    return NextResponse.json({
      ok: false,
      accepted: false,
      queued: false,
      error: "plugin_queue_failed",
      detail: detail.slice(0, 240),
    }, { status: 500 });
  }
}
