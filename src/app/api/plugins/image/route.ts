import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pluginImageResponse } from "@/lib/telegram-plugin-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = (process.env.SUPABASE_URL || "").trim();
const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const db = url && key
  ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export async function GET(request: Request) {
  const fileId = new URL(request.url).searchParams.get("file_id");
  if (!fileId) return NextResponse.json({ error: "file_id_required" }, { status: 400 });

  // Only proxy Telegram file IDs that already belong to a published catalog row.
  // This prevents arbitrary file_id probing through the bot token.
  if (db) {
    const known = await db
      .from("telegram_plugin_posts")
      .select("id")
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
      : /wrong file_id|file is too big|file_id_invalid|404/i.test(detail)
        ? 404
        : 404;
    return NextResponse.json(
      { error: "image_unavailable", detail: detail.slice(0, 180) },
      { status },
    );
  }
}
