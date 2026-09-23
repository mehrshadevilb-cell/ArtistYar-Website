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
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "content-type": upstream.headers.get("content-type") || "image/jpeg",
        "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "image_unavailable" }, { status: 404 });
  }
}
