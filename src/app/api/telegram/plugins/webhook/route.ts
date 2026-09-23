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

  try {
    // Webhook must ACK Telegram quickly. Heavy Telegram downloads, AI vision,
    // Supabase writes and caption edits happen after the response.
    const result = await enqueuePluginMessage(message);

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

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("telegram_plugin_queue", error);
    return NextResponse.json(
      { ok: false, error: "plugin_queue_failed", detail: detail.slice(0, 500) },
      { status: 500 }
    );
  }
}
