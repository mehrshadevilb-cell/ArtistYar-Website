import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Plugin binaries live ONLY on Telegram.
 * This endpoint never fetches or streams the file — it redirects the user
 * to the Telegram post/document destination.
 */
const url = (process.env.SUPABASE_URL || "").trim();
const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const db = url && key
  ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export async function GET(request: Request) {
  if (!db) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });

  const row = await db
    .from("telegram_plugin_posts")
    .select("telegram_post_url,channel_id,document_message_id,photo_message_id,status")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (row.error || !row.data) {
    return NextResponse.json({ error: "plugin_not_found" }, { status: 404 });
  }

  const direct = String(row.data.telegram_post_url || "").trim();
  if (direct && /^https?:\/\/t\.me\//i.test(direct)) {
    return NextResponse.redirect(direct, 302);
  }

  const channel = (process.env.TELEGRAM_PLUGIN_CHANNEL_ID || process.env.TELEGRAM_PLUGIN_CHANNEL_USERNAME || "")
    .trim()
    .replace(/^@/, "");
  const messageId = Number(row.data.document_message_id || row.data.photo_message_id || 0);
  if (channel && !/^-?\d+$/.test(channel) && messageId > 0) {
    return NextResponse.redirect("https://t.me/" + channel + "/" + messageId, 302);
  }

  return NextResponse.json(
    {
      error: "telegram_destination_unavailable",
      message: "فایل فقط روی تلگرام است. لینک پست در دسترس نیست.",
    },
    { status: 404 },
  );
}
