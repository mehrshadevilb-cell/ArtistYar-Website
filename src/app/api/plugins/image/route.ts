import { NextResponse } from "next/server";
import { getPluginsDb } from "@/lib/plugins-db";
import { pluginImageResponse } from "@/lib/telegram-plugin-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Telegram is the canonical source for plugin covers.
 * Supabase Storage is deliberately not used for plugin media.
 */
export async function GET(request: Request) {
  const fileId = String(new URL(request.url).searchParams.get("file_id") || "").trim();
  if (!fileId) return NextResponse.json({ error: "file_id_required" }, { status: 400 });

  const db = getPluginsDb();
  if (!db) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });

  const known = await db
    .from("telegram_plugin_posts")
    .select("id,title")
    .eq("status", "published")
    .eq("telegram_photo_file_id", fileId)
    .limit(1)
    .maybeSingle();

  if (known.error) {
    console.error("plugin_image_lookup_failed", known.error.message);
    return NextResponse.json({ error: "image_lookup_failed" }, { status: 503 });
  }
  if (!known.data) return NextResponse.json({ error: "image_not_found" }, { status: 404 });

  try {
    const upstream = await pluginImageResponse(fileId);
    const contentType =
      typeof upstream.headers?.get === "function"
        ? upstream.headers.get("content-type") || "image/jpeg"
        : "image/jpeg";
    const body = upstream.body as Buffer;

    if (!Buffer.isBuffer(body) || body.length < 256) {
      return NextResponse.json({ error: "image_empty" }, { status: 404 });
    }

    return new NextResponse(body as BodyInit, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=300, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    // Deleted/expired Telegram media is a normal state, not a server crash.
    if (/not found|404|file_id/i.test(detail)) {
      return NextResponse.json(
        { error: "telegram_cover_unavailable", post_id: String(known.data.id) },
        { status: 404 },
      );
    }
    if (/telegram_bot_token_missing|unauthorized|401/i.test(detail)) {
      return NextResponse.json({ error: "telegram_cover_configuration_error" }, { status: 503 });
    }
    console.error("plugin_image_bot_failed", detail.slice(0, 300));
    return NextResponse.json({ error: "image_unavailable" }, { status: 404 });
  }
}
