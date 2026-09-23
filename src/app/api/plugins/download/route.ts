
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pluginDownloadResponse } from "@/lib/telegram-plugin-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = (process.env.SUPABASE_URL || "").trim();
const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const db = url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

export async function GET(request: Request) {
  if (!db) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });
  const row = await db.from("telegram_plugin_posts").select("telegram_file_id,file_name,mime_type,status").eq("id", id).eq("status", "published").maybeSingle();
  if (row.error || !row.data) return NextResponse.json({ error: "plugin_not_found" }, { status: 404 });
  try {
    const upstream = await pluginDownloadResponse(row.data.telegram_file_id);
    const name = row.data.file_name || "plugin-download";
    return new NextResponse(upstream.response.body, { status: 200, headers: {
      "content-type": row.data.mime_type || upstream.response.headers.get("content-type") || "application/octet-stream",
      "content-disposition": "attachment; filename*=UTF-8''" + encodeURIComponent(name),
      "cache-control": "private, no-store",
    }});
  } catch {
    return NextResponse.json({ error: "download_unavailable" }, { status: 404 });
  }
}
