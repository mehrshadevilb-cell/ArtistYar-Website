import { NextResponse } from "next/server";
import { getPluginsDb } from "@/lib/plugins-db";
import { pluginImageResponse } from "@/lib/telegram-plugin-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Trusted stored covers only (Supabase / ArtistYar).
 * Telegram public CDN (telesco.pe) is the channel logo — never use it.
 */
function isTrustedStoredCover(url: string | null | undefined) {
  const value = String(url || "").trim().toLowerCase();
  if (!value) return false;
  if (value.includes("telesco.pe")) return false;
  if (value.includes("telegram.org")) return false;
  if (value.includes("telegram-cdn.org")) return false;
  if (value.includes("supabase.co")) return true;
  if (value.includes("artistyaar.ir")) return true;
  if (value.includes("artistyar")) return true;
  return false;
}

export async function GET(request: Request) {
  const fileId = new URL(request.url).searchParams.get("file_id");
  if (!fileId) return NextResponse.json({ error: "file_id_required" }, { status: 400 });

  const db = getPluginsDb();
  if (!db) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });

  const known = await db
    .from("telegram_plugin_posts")
    .select("id,cover_public_url,cover_storage_path,title")
    .eq("status", "published")
    .eq("telegram_photo_file_id", fileId)
    .limit(1)
    .maybeSingle();

  if (known.error) {
    console.error("plugin_image_lookup_failed", known.error.message);
    return NextResponse.json({ error: "image_lookup_failed" }, { status: 503 });
  }
  if (!known.data) {
    return NextResponse.json({ error: "image_not_found" }, { status: 404 });
  }

  const coverPublicUrl = known.data.cover_public_url
    ? String(known.data.cover_public_url)
    : null;

  // 1) Prefer real stored plugin cover (Supabase)
  if (isTrustedStoredCover(coverPublicUrl)) {
    try {
      const upstream = await fetch(coverPublicUrl!, {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
        headers: { accept: "image/*" },
      });
      if (upstream.ok) {
        const bytes = Buffer.from(await upstream.arrayBuffer());
        if (bytes.length >= 4000) {
          return new NextResponse(bytes, {
            status: 200,
            headers: {
              "content-type": upstream.headers.get("content-type") || "image/jpeg",
              "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
            },
          });
        }
      }
    } catch {
      // fall through to Telegram bot download
    }
  }

  // 2) Real Telegram post photo via bot (server-side only — no secrets to client)
  try {
    const upstream = await pluginImageResponse(fileId);
    const contentType =
      typeof upstream.headers?.get === "function"
        ? upstream.headers.get("content-type") || "image/jpeg"
        : "image/jpeg";
    const body = upstream.body as Buffer;

    // Best-effort: persist to storage for next time (latest-3 covers)
    if (Buffer.isBuffer(body) && body.length >= 8000 && known.data.id) {
      try {
        const { syncPublishedPluginCover } = await import("@/lib/telegram-plugin-covers");
        void syncPublishedPluginCover({
          postId: String(known.data.id),
          photoFileId: fileId,
        }).catch(() => undefined);
      } catch {
        // non-fatal
      }
    }

    return new NextResponse(body as BodyInit, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=600, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("plugin_image_bot_failed", detail.slice(0, 300));
    if (/telegram_bot_token_missing/i.test(detail)) {
      return NextResponse.json(
        { error: "image_unavailable", detail: "telegram_bot_token_missing" },
        { status: 503 },
      );
    }
    // getFile Not Found: either this file_id was issued for a different bot
    // (historical rows), or the runtime token is not the channel webhook bot.
    // Do not assume misconfiguration — ops must compare getMe identity vs a NEW post.
    if (/not found|404/i.test(detail)) {
      const { pluginBotTokenSource } = await import("@/lib/telegram-plugin-bot");
      return NextResponse.json(
        {
          error: "image_unavailable",
          detail:
            "telegram_file_not_found_for_configured_bot — file_id is not resolvable by the runtime bot (historical ID from another bot, or runtime token ≠ channel bot)",
          token_source: pluginBotTokenSource(),
          hint:
            "Probe /api/telegram/plugins/diagnostics?key=...&probe=1 and test a NEW channel post file_id; old DB rows may never resolve",
        },
        { status: 404 },
      );
    }
    const status = /unauthorized|401/i.test(detail) ? 503 : 404;
    return NextResponse.json(
      { error: "image_unavailable", detail: detail.slice(0, 180) },
      { status },
    );
  }
}
