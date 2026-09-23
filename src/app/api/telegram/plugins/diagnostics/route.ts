import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPluginWebhookInfo, getPluginChannelAdminStatus, pluginTokenConfigured, telegramBytes } from "@/lib/telegram-plugin-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = (process.env.WEB_ADMIN_API_KEY || "").trim();
  const provided =
    request.headers.get("x-admin-api-key") ||
    new URL(request.url).searchParams.get("key") ||
    "";
  return Boolean(expected && provided === expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = (process.env.SUPABASE_URL || "").trim();
  const key = (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();

  const db = url && key
    ? createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

  const params = new URL(request.url).searchParams;
  const requestedProcess = params.get("process") === "1";
  const requestedProbe = params.get("probe") === "1";

  const out: Record<string, unknown> = {
    ok: true,
    telegram_bot_token_configured: pluginTokenConfigured(),
    channel: process.env.TELEGRAM_PLUGIN_CHANNEL_ID || "@ProAudios",
    webhook_secret_configured: Boolean(
      (process.env.TELEGRAM_PLUGIN_WEBHOOK_SECRET || "").trim()
    ),
    webhook_secret_mode: (process.env.TELEGRAM_PLUGIN_WEBHOOK_SECRET || "").trim()
      ? "explicit"
      : "unsigned-fallback",
    google_ai_configured: Boolean(
      (
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        ""
      ).trim()
    ),
    openai_ai_configured: Boolean((process.env.OPENAI_API_KEY || "").trim()),
    supabase_configured: Boolean(db),
    site_url:
      (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(
        /\/$/,
        ""
      ),
    ai_model_pools: {
      google: (process.env.PLUGIN_AI_GEMINI_MODELS || process.env.PLUGIN_AI_GEMINI_MODEL || "").split(",").map(v => v.trim()).filter(Boolean),
      openai: (process.env.PLUGIN_AI_OPENAI_MODELS || process.env.PLUGIN_AI_VISION_MODEL || process.env.OPENAI_MODEL || "").split(",").map(v => v.trim()).filter(Boolean),
      openrouter: (process.env.PLUGIN_AI_OPENROUTER_MODELS || process.env.OPENROUTER_MODEL || "").split(",").map(v => v.trim()).filter(Boolean),
      anthropic: (process.env.PLUGIN_AI_ANTHROPIC_MODELS || process.env.ANTHROPIC_MODEL || "").split(",").map(v => v.trim()).filter(Boolean),
    },
  };

  try {
    out.webhook = await getPluginWebhookInfo();
  } catch (error) {
    out.webhook_error =
      error instanceof Error ? error.message : String(error);
  }

  try {
    out.channel_admin = await getPluginChannelAdminStatus();
  } catch (error) {
    out.channel_admin_error =
      error instanceof Error ? error.message : String(error);
  }

  if (db) {
    if (requestedProcess) {
      try {
        const { processPendingPluginPairs } = await import("@/lib/telegram-plugin-sync");
        out.process = await processPendingPluginPairs(1);
      } catch (error) {
        out.process = {
          processed: 0,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    const [queue, posts] = await Promise.all([
      db
        .from("telegram_plugin_ingest_queue")
        .select(
          "id,channel_id,message_id,kind,file_id,file_name,mime_type,file_size,caption,received_at"
        )
        .order("received_at", { ascending: false })
        .limit(10),
      db
        .from("telegram_plugin_posts")
        .select(
          "id,channel_id,photo_message_id,document_message_id,title,developer,status,error_message,ai_provider,ai_model,created_at,updated_at"
        )
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    out.queue_error = queue.error?.message || null;
    out.queue = queue.data || [];
    out.posts_error = posts.error?.message || null;
    out.posts = posts.data || [];

    if (requestedProbe && !queue.error) {
      const latestPhoto = (queue.data || []).find(row => row.kind === "photo");
      if (!latestPhoto) {
        out.probe = { ok: false, error: "no_photo_in_queue" };
      } else {
        try {
          const recovered = await telegramBytes(
            latestPhoto.file_id,
            String(latestPhoto.channel_id)
          );
          out.probe = {
            ok: true,
            message_id: Number(latestPhoto.message_id),
            bytes: recovered.bytes.length,
            content_type: recovered.contentType,
            recovery: "direct_or_telegram_recovery",
          };
        } catch (error) {
          out.probe = {
            ok: false,
            message_id: Number(latestPhoto.message_id),
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    }
  }

  return NextResponse.json(out, {
    headers: { "cache-control": "no-store" },
  });
}
