import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import { getPluginsDb } from "@/lib/plugins-db";
import { isSpecificIdentity, PRODUCT_CATEGORIES, regenerateStoredCaption, regenerateStoredTranslation, verifyStoredPlugin } from "@/lib/telegram-plugin-intelligence";
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
      processing_state: "READY",
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action });
  }

  if (action === "publish") {
    const caption = String(body?.caption || "").trim().slice(0, 1024);
    if (!caption) return NextResponse.json({ error: "caption_empty" }, { status: 400 });
    const row = await db.from("telegram_plugin_posts").select("title,review_required,verification_status,product_locked,processing_state").eq("id", id).maybeSingle();
    if (row.error || !row.data) return NextResponse.json({ error: "post_not_found" }, { status: 404 });
    if (!isSpecificIdentity(String(row.data.title || ""))) {
      return NextResponse.json({ error: "exact_product_identity_required" }, { status: 422 });
    }
    if (row.data.review_required || row.data.verification_status !== "verified" || row.data.processing_state === "NEEDS_REVIEW") {
      return NextResponse.json({ error: "verification_gate_required" }, { status: 422 });
    }
    const result = await publishPluginCaption(id, caption);
    if (!result.ok) return NextResponse.json(result, { status: 422 });
    await db.from("telegram_plugin_posts").update({
      status: "published",
      review_required: false,
      error_message: null,
      final_caption: caption,
      draft_caption: "",
      processing_state: "PUBLISHED",
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    return NextResponse.json({ ok: true, action });
  }

  if (action === "lock_product") {
    const row = await db.from("telegram_plugin_posts")
      .select("title,developer,version,category,verification_status,review_required")
      .eq("id", id)
      .maybeSingle();
    if (row.error || !row.data) return NextResponse.json({ error: "post_not_found" }, { status: 404 });
    if (!isSpecificIdentity(String(row.data.title || "")) || row.data.verification_status !== "verified" || row.data.review_required) {
      return NextResponse.json({ error: "verified_identity_required" }, { status: 422 });
    }
    const requested = {
      title: String(body?.title || row.data.title || "").trim(),
      developer: String(body?.developer ?? row.data.developer ?? "").trim(),
      version: String(body?.version ?? row.data.version ?? "").trim(),
      category: String(body?.category ?? row.data.category ?? "").trim(),
    };
    if (requested.title !== String(row.data.title || "").trim() ||
        requested.developer !== String(row.data.developer || "").trim() ||
        requested.version !== String(row.data.version || "").trim() ||
        requested.category !== String(row.data.category || "").trim() ||
        !PRODUCT_CATEGORIES.includes(String(row.data.category || "") as (typeof PRODUCT_CATEGORIES)[number])) {
      return NextResponse.json({ error: "client_identity_does_not_match_verified_data" }, { status: 422 });
    }
    const update = await db.from("telegram_plugin_posts").update({
      product_locked: true,
      product_locked_at: new Date().toISOString(),
      product_locked_by: "admin",
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (update.error) return NextResponse.json({ error: update.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action, locked: true });
  }

  if (action === "unlock_product") {
    const update = await db.from("telegram_plugin_posts").update({
      product_locked: false,
      product_locked_at: null,
      product_locked_by: null,
      review_required: true,
      processing_state: "NEEDS_REVIEW",
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (update.error) return NextResponse.json({ error: update.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action, locked: false });
  }

  if (action === "feedback") {
    const kind = String(body?.kind || "").trim().slice(0, 80);
    const note = String(body?.note || "").trim().slice(0, 500);
    if (!kind) return NextResponse.json({ error: "feedback_kind_required" }, { status: 400 });
    const row = await db.from("telegram_plugin_posts").select("admin_feedback").eq("id", id).maybeSingle();
    if (row.error || !row.data) return NextResponse.json({ error: "post_not_found" }, { status: 404 });
    const feedback = Array.isArray(row.data.admin_feedback) ? row.data.admin_feedback : [];
    feedback.push({ kind, note, created_at: new Date().toISOString() });
    const update = await db.from("telegram_plugin_posts").update({
      admin_feedback: feedback.slice(-50),
      review_required: true,
      processing_state: "NEEDS_REVIEW",
      error_message: "admin_feedback:" + kind,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (update.error) return NextResponse.json({ error: update.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action, feedback: feedback.slice(-50) });
  }

  if (action === "regenerate_translation") {
    const result = await regenerateStoredTranslation(id);
    if (!result.ok) return NextResponse.json(result, { status: 422 });
    return NextResponse.json({ ok: true, action, result });
  }

  if (action === "regenerate_caption") {
    const result = await regenerateStoredCaption(id);
    if (!result.ok) return NextResponse.json(result, { status: 422 });
    return NextResponse.json({ ok: true, action, result });
  }

  if (action === "verify" || action === "regenerate_identity") {
    const result = await verifyStoredPlugin(id, action === "regenerate_identity");
    if (!result.ok && result.error) return NextResponse.json(result, { status: 422 });
    return NextResponse.json({ ok: Boolean(result.ok), action, result });
  }

  if (action === "clear_review") {
    const row = await db.from("telegram_plugin_posts")
      .select("verification_status,review_required,draft_caption,final_caption")
      .eq("id", id)
      .maybeSingle();
    if (row.error || !row.data) return NextResponse.json({ error: "post_not_found" }, { status: 404 });
    if (row.data.verification_status !== "verified" || (!row.data.draft_caption && !row.data.final_caption)) {
      return NextResponse.json({ error: "verified_caption_required" }, { status: 422 });
    }
    const result = await db.from("telegram_plugin_posts").update({
      review_required: false,
      error_message: null,
      processing_state: "READY",
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action });
  }

  return NextResponse.json({ error: "unsupported_action" }, { status: 400 });
}
