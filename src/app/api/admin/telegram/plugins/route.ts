import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import { getPluginsDb } from "@/lib/plugins-db";
import { regenerateStoredTranslation, verifyStoredPlugin } from "@/lib/telegram-plugin-intelligence";
import { publishPluginCaption } from "@/lib/telegram-plugin-caption";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorized() {
  const session = verifyAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
  return Boolean(session);
}

export async function GET(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });
  const db = getPluginsDb();
  if (!db) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 30), 1), 100);
  const id = url.searchParams.get("id");
  let query = db.from("telegram_plugin_posts").select("*").order("created_at", { ascending: false }).limit(limit);
  if (id) query = query.eq("id", id);
  const result = await query;
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, items: result.data || [] });
}

export async function POST(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });
  const db = getPluginsDb();
  if (!db) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });

  const body = await request.json().catch(() => null);
  const id = String(body?.id || "").trim();
  const action = String(body?.action || "").trim();
  if (!id || !action) return NextResponse.json({ error: "id_and_action_required" }, { status: 400 });

  if (action === "save_draft") {
    const caption = String(body?.caption || "").trim().slice(0, 1024);
    const result = await db.from("telegram_plugin_posts").update({
      draft_caption: caption,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action });
  }

  if (action === "publish") {
    const caption = String(body?.caption || "").trim().slice(0, 1024);
    if (!caption) return NextResponse.json({ error: "caption_empty" }, { status: 400 });
    const result = await publishPluginCaption(id, caption);
    if (!result.ok) return NextResponse.json(result, { status: 422 });
    await db.from("telegram_plugin_posts").update({
      status: "published",
      review_required: false,
      error_message: null,
      final_caption: caption,
      draft_caption: "",
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    return NextResponse.json({ ok: true, action });
  }

  if (action === "regenerate_translation") {\n    const result = await regenerateStoredTranslation(id);\n    if (!result.ok) return NextResponse.json(result, { status: 422 });\n    return NextResponse.json({ ok: true, action, result });\n  }\n\n  if (action === "verify" || action === "regenerate_caption" || action === "regenerate_identity") {
    const result = await verifyStoredPlugin(id, action === "regenerate_identity");
    if (!result.ok && result.error) return NextResponse.json(result, { status: 422 });
    return NextResponse.json({ ok: Boolean(result.ok), action, result });
  }

  if (action === "clear_review") {
    const result = await db.from("telegram_plugin_posts").update({
      review_required: false,
      error_message: null,
      status: "published",
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action });
  }

  return NextResponse.json({ error: "unsupported_action" }, { status: 400 });
}
