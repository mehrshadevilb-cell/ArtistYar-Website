
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = (process.env.SUPABASE_URL || "").trim();
const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const db = url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

export async function GET(request: Request) {
  if (!db) return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 503 });
  const q = new URL(request.url).searchParams;
  const search = (q.get("q") || "").trim().slice(0, 80);
  const category = (q.get("category") || "").trim().slice(0, 80);
  const limit = Math.min(Math.max(Number(q.get("limit") || 24), 1), 60);
  let query = db.from("telegram_plugin_posts")
    .select("id,title,developer,version,category,formats,platforms,description,features,tags,telegram_photo_file_id,telegram_post_url,file_name,created_at")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (search) query = query.or("title.ilike.%" + search.replace(/[%_]/g, "") + "%,developer.ilike.%" + search.replace(/[%_]/g, "") + "%,description.ilike.%" + search.replace(/[%_]/g, "") + "%");
  if (category) query = query.eq("category", category);
  const result = await query;
  if (result.error) return NextResponse.json({ ok: false, error: "plugin_query_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, items: result.data || [] });
}
