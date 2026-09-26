import { NextResponse } from "next/server";
import { getPluginsDb } from "@/lib/plugins-db";
import { pluginImageResponse } from "@/lib/telegram-plugin-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reject Telegram channel logo / generic channel thumbnails — not plugin covers. */
function isChannelLogoUrl(url: string | null | undefined) {
  const value = String(url || "").toLowerCase();
  if (!value) return false;
  // Public t.me CDN embeds almost always return channel avatar for restricted posts
  if (value.includes("telesco.pe")) return true;
  if (value.includes("telegram.org") && value.includes("channel")) return true;
  return false;
}

export async function GET(request: Request) {
  const fileId = new URL(request.url).searchParams.get("file_id");
  if (!fileId) return NextResponse.json({ error: "file_id_required" }, { status: 400 });

  const db = getPluginsDb();
  let coverPublicUrl: string | null = null;

  if (db) {
    const known = await db
      .from("telegram_plugin_posts")
      .select("id,cover_public_url")
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
    coverPublicUrl = known.data.cover_public_url
      ? String(known.data.cover_public_url)
      : null;
  }

  // Only use stored covers that are NOT channel logos (e.g. our Supabase storage)
  if (coverPublicUrl && !isChannelLogoUrl(coverPublicUrl)) {
    try {
      const upstream = await fetch(coverPublicUrl, {
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
      // fall through to bot download
    }
  }

  // Real plugin cover: Telegram Bot API with the ingest bot token
  try {
    const upstream = await pluginImageResponse(fileId);
    const contentType =
      typeof upstream.headers?.get === "function"
        ? upstream.headers.get("content-type") || "image/jpeg"
        : "image/jpeg";
    return new NextResponse(upstream.body as BodyInit, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("plugin_image_bot_failed", detail.slice(0, 300));
    const status = /telegram_bot_token_missing|unauthorized|401/i.test(detail) ? 503 : 404;
    return NextResponse.json(
      { error: "image_unavailable", detail: detail.slice(0, 180) },
      { status },
    );
  }
}
