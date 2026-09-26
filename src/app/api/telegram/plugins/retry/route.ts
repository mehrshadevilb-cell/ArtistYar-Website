import { NextResponse } from "next/server";
import { getPluginsDb } from "@/lib/plugins-db";
import { processPendingPluginPairs, reapplyPluginCaption } from "@/lib/telegram-plugin-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = (process.env.WEB_ADMIN_API_KEY || "").trim();
  const provided =
    request.headers.get("x-web-admin-key") ||
    request.headers.get("x-admin-api-key") ||
    new URL(request.url).searchParams.get("key") ||
    "";
  return Boolean(expected && provided === expected);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id || "").trim();
  const action = String(body.action || "retry").trim().toLowerCase();
  if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });

  const db = getPluginsDb();
  if (!db) return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 503 });
  const existing = await db
    .from("telegram_plugin_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (existing.error) return NextResponse.json({ ok: false, error: "plugin_lookup_failed", detail: existing.error.message }, { status: 500 });
  if (!existing.data) return NextResponse.json({ ok: false, error: "plugin_not_found" }, { status: 404 });
  const post = existing.data as Record<string, any>;

  if (action === "edit") {
    const patch: Record<string, unknown> = {};
    for (const field of ["title", "description", "developer", "version", "category"]) {
      if (typeof body[field] === "string") patch[field] = String(body[field]).trim().slice(0, field === "description" ? 1800 : 240);
    }
    for (const field of ["features", "tags", "formats", "platforms"]) {
      if (Array.isArray(body[field])) patch[field] = body[field].map((value) => String(value).trim()).filter(Boolean).slice(0, 20);
    }
    if (!Object.keys(patch).length) return NextResponse.json({ ok: false, error: "no_editable_fields" }, { status: 400 });
    patch.updated_at = new Date().toISOString();
    const updated = await db.from("telegram_plugin_posts").update(patch).eq("id", id).select("id,title,description,category,updated_at").single();
    if (updated.error) return NextResponse.json({ ok: false, error: "plugin_update_failed", detail: updated.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action, item: updated.data });
  }

  if (action === "cover") {
    if (!post.telegram_photo_file_id) return NextResponse.json({ ok: false, error: "cover_source_missing" }, { status: 409 });
    try {
      const { syncPublishedPluginCover } = await import("@/lib/telegram-plugin-covers");
      const cover = await syncPublishedPluginCover({ postId: id, photoFileId: String(post.telegram_photo_file_id) });
      return NextResponse.json({ ok: Boolean(cover), action, cover });
    } catch (error) {
      return NextResponse.json({ ok: false, error: "cover_regeneration_failed", detail: error instanceof Error ? error.message : String(error) }, { status: 502 });
    }
  }

  if (action === "caption") {
    const result = await reapplyPluginCaption(id);
    return NextResponse.json(
      { ok: result.ok, action, result },
      { status: result.ok ? 200 : 502 },
    );
  }

  if (!["retry"].includes(action)) return NextResponse.json({ ok: false, error: "unsupported_action" }, { status: 400 });
  const channelId = String(post.channel_id || "").trim();
  const documentMessageId = Number(post.document_message_id || 0);
  if (!channelId || !documentMessageId || !post.telegram_file_id) {
    return NextResponse.json({ ok: false, error: "retry_source_missing" }, { status: 409 });
  }

  const channelUsername = (process.env.TELEGRAM_PLUGIN_CHANNEL_USERNAME || process.env.TELEGRAM_PLUGIN_CHANNEL_ID || "").trim() || null;
  const document = await db.from("telegram_plugin_ingest_queue").upsert({
    channel_id: channelId,
    channel_username: channelUsername,
    message_id: documentMessageId,
    kind: "document",
    file_id: post.telegram_file_id,
    file_name: post.file_name || null,
    mime_type: post.mime_type || null,
    file_size: post.file_size || null,
    thumbnail_file_id: post.telegram_photo_file_id || null,
    caption: post.raw_caption || "",
    processing_at: null,
    last_error: null,
    next_attempt_at: null,
  }, { onConflict: "channel_id,message_id" }).select("id").single();
  if (document.error) return NextResponse.json({ ok: false, error: "retry_queue_failed", detail: document.error.message }, { status: 500 });

  if (post.photo_message_id && post.telegram_photo_file_id) {
    const photo = await db.from("telegram_plugin_ingest_queue").upsert({
      channel_id: channelId,
      channel_username: channelUsername,
      message_id: Number(post.photo_message_id),
      kind: "photo",
      file_id: post.telegram_photo_file_id,
      caption: post.raw_caption || "",
      processing_at: null,
      last_error: null,
      next_attempt_at: null,
    }, { onConflict: "channel_id,message_id" });
    if (photo.error) return NextResponse.json({ ok: false, error: "retry_photo_queue_failed", detail: photo.error.message }, { status: 500 });
  }

  const result = await processPendingPluginPairs(1);
  return NextResponse.json({ ok: result.errors.length === 0, action, result }, { status: result.errors.length ? 502 : 200 });
}
