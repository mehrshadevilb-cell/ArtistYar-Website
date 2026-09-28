import { createHash } from "crypto";
import { NextResponse, after } from "next/server";
import {
  enqueuePluginMessage,
  processPendingPluginPairs,
  refreshPublishedPluginPostFromEdit,
} from "@/lib/telegram-plugin-sync";
import { resolvePluginBotToken } from "@/lib/telegram-plugin-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function expectedSecret() {
  const explicit = (process.env.TELEGRAM_PLUGIN_WEBHOOK_SECRET || "").trim();
  if (explicit) return explicit;
  const token = resolvePluginBotToken();
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
  // Telegram sends edits as edited_channel_post. Treat our own caption edits as
  // idempotent noise, but re-queue genuine external edits so the existing catalog
  // record can be refreshed instead of creating a second plugin.
  const isEdit = Boolean(update?.edited_channel_post);
  const message = update?.channel_post || update?.edited_channel_post;
  if (!message) return NextResponse.json({ ok: true, ignored: true });

  if (isEdit && /ArtistYar.*@ProAudios/i.test(String(message.caption || ""))) {
    return NextResponse.json({ ok: true, ignored: true, reason: "own_caption_edit" });
  }

  if (isEdit) {
    try {
      const refreshed = await refreshPublishedPluginPostFromEdit(message);
      if (refreshed.refreshed || refreshed.ignored && refreshed.reason === "published_post_not_found") {
        if (refreshed.refreshed) {
          return NextResponse.json({ ok: true, accepted: true, refreshed: true, result: refreshed });
        }
        // If the post is not in the catalog yet, fall through to normal queueing.
      }
    } catch (error) {
      // Never fail the Telegram webhook because enrichment failed. The edit can
      // still be retried/queued through the normal ingestion path.
      console.error("telegram_plugin_edit_refresh_failed", error instanceof Error ? error.message : String(error));
    }
  }

  // A successfully queued update can be acknowledged immediately; expensive
  // processing is handled by the background hook/cron. Queue failures must
  // return non-2xx below so Telegram retries the delivery.
  try {
    const result = await enqueuePluginMessage(message, { refreshExisting: isEdit });

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
