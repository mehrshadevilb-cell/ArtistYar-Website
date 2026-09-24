/**
 * Latest-3 plugin cover storage.
 * Plugin binaries are NEVER stored here — only small cover images for the
 * three most recent published catalog rows.
 */
import { getPluginsDb } from "@/lib/plugins-db";

const bucket = (process.env.SUPABASE_BUCKET || "artistyar-media").trim();

const db = getPluginsDb();

function extFromContentType(contentType: string) {
  const mime = (contentType || "").split(";")[0].trim().toLowerCase();
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

/**
 * Upload cover for a published post, then keep Storage limited to the latest 3
 * published covers. Idempotent and safe under concurrent workers.
 */
export async function syncPublishedPluginCover(options: {
  postId: string;
  photoFileId: string;
}): Promise<{ path: string; publicUrl: string } | null> {
  if (!db) return null;
  const postId = String(options.postId || "").trim();
  const photoFileId = String(options.photoFileId || "").trim();
  if (!postId || !photoFileId) return null;

  const { telegramBytes } = await import("@/lib/telegram-plugin-sync");
  const downloaded = await telegramBytes(photoFileId);
  const ext = extFromContentType(downloaded.contentType);
  const path = "plugins/" + postId + "." + ext;
  const contentType = downloaded.contentType || "image/jpeg";

  const uploaded = await db.storage.from(bucket).upload(path, downloaded.bytes, {
    contentType,
    upsert: true,
    cacheControl: "3600",
  });
  if (uploaded.error) {
    throw new Error("plugin_cover_upload_failed:" + uploaded.error.message);
  }

  const publicUrl = db.storage.from(bucket).getPublicUrl(path).data.publicUrl;

  const updated = await db
    .from("telegram_plugin_posts")
    .update({
      cover_storage_path: path,
      cover_public_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId);
  if (updated.error) {
    throw new Error("plugin_cover_db_update_failed:" + updated.error.message);
  }

  await prunePluginCoversToLatestThree();
  return { path, publicUrl };
}

/** Keep only covers belonging to the latest 3 published posts. */
export async function prunePluginCoversToLatestThree(): Promise<{
  kept: string[];
  removed: string[];
}> {
  if (!db) return { kept: [], removed: [] };

  const latest = await db
    .from("telegram_plugin_posts")
    .select("id,cover_storage_path")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(3);

  if (latest.error) {
    throw new Error("plugin_cover_latest_query_failed:" + latest.error.message);
  }

  const keepIds = new Set((latest.data || []).map((row) => String(row.id)));
  const keepPaths = new Set(
    (latest.data || [])
      .map((row) => (row.cover_storage_path ? String(row.cover_storage_path) : ""))
      .filter(Boolean),
  );

  const listed = await db.storage.from(bucket).list("plugins", {
    limit: 200,
    sortBy: { column: "name", order: "asc" },
  });
  if (listed.error) {
    console.error("plugin_cover_list_failed", listed.error.message);
    return { kept: Array.from(keepPaths), removed: [] };
  }

  const removed: string[] = [];
  for (const item of listed.data || []) {
    if (!item?.name || item.name.endsWith("/")) continue;
    const path = "plugins/" + item.name;
    if (keepPaths.has(path)) continue;
    const del = await db.storage.from(bucket).remove([path]);
    if (del.error) {
      console.error("plugin_cover_delete_failed", path, del.error.message);
      continue;
    }
    removed.push(path);
  }

  const stale = await db
    .from("telegram_plugin_posts")
    .select("id,cover_storage_path")
    .not("cover_storage_path", "is", null)
    .eq("status", "published");

  if (!stale.error && stale.data) {
    for (const row of stale.data) {
      if (keepIds.has(String(row.id))) continue;
      if (!row.cover_storage_path) continue;
      await db
        .from("telegram_plugin_posts")
        .update({
          cover_storage_path: null,
          cover_public_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    }
  }

  return { kept: Array.from(keepPaths), removed };
}
