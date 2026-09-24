import { NextResponse } from "next/server";
import { getPluginsDb } from "@/lib/plugins-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Soft-hide catalog rows so they disappear from /plugins quickly.
 * Telegram does NOT send channel-post-delete webhooks to bots, so when a post
 * is removed from the channel the operator must call this (or use admin UI).
 *
 * Auth: WEB_ADMIN_API_KEY via ?key= or x-admin-api-key / x-web-admin-key
 *
 * Params (any one is enough):
 *   id            — catalog uuid
 *   message_id    — photo_message_id OR document_message_id
 *   post_url      — full https://t.me/... link
 */
function authorized(request: Request) {
  const key = (process.env.WEB_ADMIN_API_KEY || "").trim();
  if (!key) return false;
  const url = new URL(request.url);
  const provided =
    request.headers.get("x-web-admin-key") ||
    request.headers.get("x-admin-api-key") ||
    url.searchParams.get("key") ||
    "";
  return provided === key;
}

async function run(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  let body: Record<string, unknown> = {};
  if (request.method === "POST") {
    body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  }

  const id = String(url.searchParams.get("id") || body.id || "").trim();
  const messageIdRaw = String(url.searchParams.get("message_id") || body.message_id || "").trim();
  const postUrl = String(url.searchParams.get("post_url") || body.post_url || "").trim();
  const messageId = messageIdRaw ? Number(messageIdRaw) : NaN;

  if (!id && !Number.isFinite(messageId) && !postUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_selector",
        detail: "Provide id, message_id, or post_url",
      },
      { status: 400 },
    );
  }

  const db = getPluginsDb();
  if (!db) {
    return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 503 });
  }

  let query = db
    .from("telegram_plugin_posts")
    .update({
      status: "hidden",
      error_message: "hidden_by_admin",
      cover_storage_path: null,
      cover_public_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("status", "published");

  if (id) {
    query = query.eq("id", id);
  } else if (Number.isFinite(messageId)) {
    query = query.or(
      `photo_message_id.eq.${messageId},document_message_id.eq.${messageId}`,
    );
  } else if (postUrl) {
    query = query.eq("telegram_post_url", postUrl);
  }

  const updated = await query.select(
    "id,title,photo_message_id,document_message_id,telegram_post_url,status",
  );

  if (updated.error) {
    return NextResponse.json(
      { ok: false, error: "hide_failed", detail: updated.error.message },
      { status: 500 },
    );
  }

  const rows = updated.data || [];
  return NextResponse.json({
    ok: true,
    hidden: rows.length,
    items: rows,
    note:
      "Telegram bots do not receive channel-delete events. Call this after deleting a channel post so /plugins drops it within a few seconds (live poll).",
  });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
