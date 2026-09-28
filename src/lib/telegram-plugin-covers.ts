/**
 * Latest-3 plugin cover storage.
 * Plugin binaries are NEVER stored here — only small cover images for the
 * three most recent published catalog rows.
 */
import { getPluginsDb } from "@/lib/plugins-db";

const bucket = (process.env.SUPABASE_BUCKET || "artistyar-media").trim();

const db = getPluginsDb();

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function buildDeterministicPluginCover(
  postId: string,
): Promise<{ bytes: Buffer; contentType: string }> {
  if (!db) throw new Error("supabase_not_configured");

  const row = await db
    .from("telegram_plugin_posts")
    .select("title,developer,category")
    .eq("id", postId)
    .maybeSingle();

  const title = String(row.data?.title || "Audio Plugin").trim().slice(0, 80);
  const developer = String(row.data?.developer || "ArtistYar").trim().slice(0, 60);
  const category = String(row.data?.category || "Audio Plugin").trim().slice(0, 50);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#312e81"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#a78bfa"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" rx="36" fill="url(#bg)"/>
  <circle cx="1040" cy="100" r="210" fill="#7c3aed" opacity=".18"/>
  <circle cx="120" cy="560" r="260" fill="#06b6d4" opacity=".12"/>
  <rect x="72" y="72" width="1056" height="8" rx="4" fill="url(#accent)"/>
  <text x="72" y="150" fill="#c4b5fd" font-family="Arial,sans-serif" font-size="28" font-weight="700">ARTISTYAR • PLUGIN</text>
  <text x="72" y="290" fill="#ffffff" font-family="Arial,sans-serif" font-size="58" font-weight="800">${escapeXml(title)}</text>
  <text x="72" y="350" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="30">${escapeXml(category)}</text>
  <text x="72" y="515" fill="#94a3b8" font-family="Arial,sans-serif" font-size="24">${escapeXml(developer)}</text>
  <text x="1128" y="515" text-anchor="end" fill="#e2e8f0" font-family="Arial,sans-serif" font-size="24" font-weight="700">ArtistYar</text>
</svg>`;

  return { bytes: Buffer.from(svg, "utf8"), contentType: "image/svg+xml" };
}

async function recoverPublicTelegramCover(postId: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (!db) return null;

  const row = await db
    .from("telegram_plugin_posts")
    .select("channel_username,photo_message_id")
    .eq("id", postId)
    .maybeSingle();

  if (row.error || !row.data?.photo_message_id) return null;

  const username = String(
    row.data.channel_username ||
      process.env.TELEGRAM_PLUGIN_CHANNEL_USERNAME ||
      "ProAudios",
  )
    .trim()
    .replace(/^@/, "");

  if (!username) return null;

  const messageId = Number(row.data.photo_message_id);
  if (!Number.isFinite(messageId) || messageId <= 0) return null;

  try {
    const pageUrl =
      "https://t.me/" +
      encodeURIComponent(username) +
      "/" +
      encodeURIComponent(String(messageId)) +
      "?embed=1";

    const page = await fetch(pageUrl, {
      cache: "no-store",
      redirect: "follow",
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "ArtistYar-Telegram-Plugin-Cover-Recovery/1.0",
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!page.ok) return null;
    const html = await page.text();
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    const imageUrl = match?.[1] ? match[1].replace(/&amp;/g, "&") : "";
    if (!imageUrl) return null;

    const parsed = new URL(imageUrl);
    const host = parsed.hostname.toLowerCase();
    const trusted =
      host === "t.me" ||
      host.endsWith(".telegram.org") ||
      host.endsWith(".cdn-telegram.org");
    if (!trusted) return null;

    const image = await fetch(parsed.toString(), {
      cache: "no-store",
      redirect: "follow",
      headers: { accept: "image/*,*/*;q=0.8" },
      signal: AbortSignal.timeout(30000),
    });
    if (!image.ok) return null;

    const contentType = String(image.headers.get("content-type") || "image/jpeg")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!contentType.startsWith("image/")) return null;

    const bytes = Buffer.from(await image.arrayBuffer());
    if (!bytes.length) return null;
    return { bytes, contentType };
  } catch (error) {
    console.warn(
      "plugin_public_cover_recovery_failed",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

function extFromContentType(contentType: string) {
  const mime = (contentType || "").split(";")[0].trim().toLowerCase();
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "image/svg+xml") return "svg";
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
  let downloaded: { bytes: Buffer; contentType: string };
  try {
    downloaded = await telegramBytes(photoFileId);
  } catch (error) {
    // Historical Telegram file_ids can become unusable when the channel was
    // originally ingested by a different bot identity. Public channel posts
    // still expose their media through Telegram's web preview, so recover the
    // cover from that public post before giving up.
    const recovered = await recoverPublicTelegramCover(postId);
    if (recovered) {
      downloaded = recovered;
    } else {
      downloaded = await buildDeterministicPluginCover(postId);
    }
  }
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
