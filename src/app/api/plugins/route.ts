import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = (process.env.SUPABASE_URL || "").trim();
const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const db = url && key
  ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export async function GET(request: Request) {
  if (!db) {
    return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 503 });
  }

  const q = new URL(request.url).searchParams;
  const limit = Math.min(Math.max(Number(q.get("limit") || 3), 1), 3);

  const result = await db
    .from("telegram_plugin_posts")
    .select(
      "id,title,developer,version,category,formats,platforms,description,features,tags,telegram_photo_file_id,telegram_post_url,file_name,cover_storage_path,cover_public_url,created_at",
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (result.error) {
    console.error("plugins_query_failed", result.error.message);
    return NextResponse.json(
      { ok: false, items: [], error: "plugin_query_failed" },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { ok: true, items: result.data || [] },
    { headers: { "cache-control": "private, no-store, max-age=0" } },
  );
}
