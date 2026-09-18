import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const db = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

async function requireAdmin() {
  const session = verifyAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ ok: false, error: "practice_store_not_configured" }, { status: 503 });

  const { data, error } = await db
    .from("practice_subscriptions")
    .select("id,user_id,status,price_toman,started_at,expires_at")
    .order("expires_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 503 });
  return NextResponse.json({ ok: true, subscriptions: data || [] });
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ ok: false, error: "practice_store_not_configured" }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const userId = String(body.userId || "").trim();
  const parsedMonths = Number(body.months);
  const months = Number.isFinite(parsedMonths) ? Math.max(1, Math.min(24, Math.floor(parsedMonths))) : 1;
  const note = String(body.note || "").trim().slice(0, 200);

  if (!userId) return NextResponse.json({ ok: false, error: "userId_required" }, { status: 400 });

  const now = new Date();
  const nowIso = now.toISOString();

  const { data: existing, error: lookupError } = await db
    .from("practice_subscriptions")
    .select("id,expires_at,price_toman")
    .eq("user_id", userId)
    .eq("status", "active")
    .gt("expires_at", nowIso)
    .order("expires_at", { ascending: false })
    .limit(1);

  if (lookupError) return NextResponse.json({ ok: false, error: lookupError.message }, { status: 503 });

  const base = existing?.[0]?.expires_at ? new Date(existing[0].expires_at) : now;
  const expires = new Date(base.getTime());
  expires.setMonth(expires.getMonth() + months);
  const amount = 40000 * months;

  let subscription;
  if (existing?.[0]?.id) {
    const { data, error } = await db
      .from("practice_subscriptions")
      .update({ expires_at: expires.toISOString(), price_toman: Number(existing[0].price_toman || 0) + amount })
      .eq("id", existing[0].id)
      .select("id,user_id,status,price_toman,started_at,expires_at")
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 503 });
    subscription = data;
  } else {
    const { data, error } = await db
      .from("practice_subscriptions")
      .insert({
        user_id: userId,
        status: "active",
        price_toman: amount,
        started_at: nowIso,
        expires_at: expires.toISOString(),
      })
      .select("id,user_id,status,price_toman,started_at,expires_at")
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 503 });
    subscription = data;
  }

  try {
    await db.from("practice_payment_requests").insert({
      user_id: userId,
      reference: note ? `admin:${session.username}:${note}` : `admin:${session.username}:manual`,
      amount_toman: amount,
      status: "approved",
      reviewed_at: nowIso,
      reviewed_by: session.username,
    });
  } catch {
    // Audit failure must not undo the subscription change.
  }

  return NextResponse.json({
    ok: true,
    subscription,
    activatedBy: session.username,
    message: `اشتراک Pro برای ${userId} تا ${expires.toISOString()} فعال شد.`,
  });
}

export async function DELETE(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ ok: false, error: "practice_store_not_configured" }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const subscriptionId = String(body.subscriptionId || "").trim();
  if (!subscriptionId) return NextResponse.json({ ok: false, error: "subscriptionId_required" }, { status: 400 });

  const { data, error } = await db
    .from("practice_subscriptions")
    .update({ status: "cancelled", expires_at: new Date().toISOString() })
    .eq("id", subscriptionId)
    .eq("status", "active")
    .select("id,user_id,status,expires_at")
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 503 });
  if (!data) return NextResponse.json({ ok: false, error: "active_subscription_not_found" }, { status: 404 });

  return NextResponse.json({ ok: true, subscription: data, changedBy: session.username });
}
