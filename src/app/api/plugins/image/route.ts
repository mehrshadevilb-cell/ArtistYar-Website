import { NextResponse } from "next/server";
import { getPluginsDb } from "@/lib/plugins-db";
import { pluginImageResponse } from "@/lib/telegram-plugin-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const fileId = new URL(request.url).searchParams.get("file_id");
  if (!fileId) return NextResponse.json({ error: "file_id_required" }, { status: 400 });

  const db = getPluginsDb();
  if (db) {
    const known = await db
      .from("telegram_plugin_posts")
      .select("id,cover_public_url,cover_storage_path")
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

    // Prefer the persisted latest-3 cover. This avoids repeatedly calling
    // Telegram for file_ids that may no longer be resolvable by the current bot.
    if (known.data.cover_public_url) {
      return NextResponse.redirect(known.data.cover_public_url, {
        status: 307,
        headers: { "cache-control": "public, max-age=3600, stale-while-revalidate=86400" },
      });
    }

    if (known.data.cover_storage_path) {
      const publicUrl = db.storage.from((process.env.SUPABASE_BUCKET || "artistyar-media").trim())
        .getPublicUrl(String(known.data.cover_storage_path)).data.publicUrl;
      if (publicUrl) {
        return NextResponse.redirect(publicUrl, {
          status: 307,
          headers: { "cache-control": "public, max-age=3600, stale-while-revalidate=86400" },
        });
      }
    }
  }

  try {
    const upstream = await pluginImageResponse(fileId);
    const contentType =
      typeof upstream.headers?.get === "function"
        ? upstream.headers.get("content-type") || "image/jpeg"
        : "image/jpeg";
    const body = upstream.body;
    return new NextResponse(body as BodyInit, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("plugin_image_proxy_failed", detail.slice(0, 400));
    const status = /telegram_bot_token_missing|unauthorized|401/i.test(detail)
      ? 503
      : 404;
    return NextResponse.json(
      { error: "image_unavailable", detail: detail.slice(0, 180) },
      { status },
    );
  }
}
