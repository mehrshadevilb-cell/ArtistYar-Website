import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPluginWebhookInfo, pluginTokenConfigured } from "@/lib/telegram-plugin-sync";

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

  const out: Record<string, unknown> = {
    ok: true,
    telegram_bot_token_configured: pluginTokenConfigured(),
    channel: process.env.TELEGRAM_PLUGIN_CHANNEL_ID || "@ProAudios",
    webhook_secret_configured: Boolean(
      (process.env.TELEGRAM_PLUGIN_WEBHOOK_SECRET || "").trim()
    ),
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
  };

  try {
    out.webhook = await getPluginWebhookInfo();
  } catch (error) {
    out.webhook_error =
      error instanceof Error ? error.message : String(error);
  }

  if (db) {
    const [queue, posts] = await Promise.all([
      db
        .from("telegram_plugin_ingest_queue")
        .select(
          "id,channel_id,message_id,kind,file_name,mime_type,file_size,caption,received_at"
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
  }

  return NextResponse.json(out, {
    headers: { "cache-control": "no-store" },
  });
}
