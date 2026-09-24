import { NextResponse } from "next/server";
import { processPendingPluginPairs } from "@/lib/telegram-plugin-sync";
import { getPluginsDb } from "@/lib/plugins-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

async function queueSnapshot() {
  try {
    const db = getPluginsDb();
    if (!db) return { available: false, photos: 0, documents: 0, reason: "supabase_not_configured" };

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await db
      .from("telegram_plugin_ingest_queue")
      .select(
        "id,channel_id,channel_username,message_id,kind,file_name,mime_type,media_group_id,processing_at,received_at,caption",
      )
      .gte("received_at", cutoff)
      .order("received_at", { ascending: false })
      .limit(40);

    if (error) {
      return { available: false, photos: 0, documents: 0, reason: error.message };
    }

    const rows = data || [];
    const photos = rows.filter((r) => r.kind === "photo");
    const documents = rows.filter((r) => r.kind === "document");
    return {
      available: true,
      total: rows.length,
      photos: photos.length,
      documents: documents.length,
      locked: rows.filter((r) => r.processing_at).length,
      media_groups: Array.from(
        new Set(rows.map((r) => r.media_group_id).filter(Boolean)),
      ),
      sample: rows.slice(0, 12).map((r) => ({
        kind: r.kind,
        message_id: r.message_id,
        file_name: r.file_name,
        mime_type: r.mime_type,
        media_group_id: r.media_group_id,
        processing_at: r.processing_at,
        received_at: r.received_at,
        channel_id: r.channel_id,
        has_caption: Boolean(r.caption && String(r.caption).trim()),
      })),
    };
  } catch (error) {
    return {
      available: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

async function run(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const limitParam = new URL(request.url).searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam || 10) || 10, 1), 20);

  try {
    const before = await queueSnapshot();
    const result = await processPendingPluginPairs(limit);
    const after = await queueSnapshot();
    return NextResponse.json({
      ok: true,
      result,
      queue_before: before,
      queue_after: after,
      hint:
        before.available && before.photos > 0 && before.documents === 0
          ? "photo_in_queue_but_no_documents — archives may have been rejected (wrong extension/mime) or webhook never received the document posts"
          : before.available && before.photos === 0 && before.documents > 0
            ? "documents_in_queue_but_no_photo — AI caption requires a photo in the same album or within 5 minutes"
            : before.available && before.photos > 0 && before.documents > 0 && result.processed === 0
              ? "photo_and_docs_present_but_unpaired — check media_group_id / time window / processing_at locks"
              : null,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("telegram_plugin_process", error);
    return NextResponse.json(
      { ok: false, error: "plugin_process_failed", detail: detail.slice(0, 1000) },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
