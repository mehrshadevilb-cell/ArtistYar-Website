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
  return session || null;
}

function collectIds(...values: Array<string | null | undefined>) {
  const ids = new Set<string>();
  for (const value of values) {
    const cleaned = String(value || "").trim();
    if (cleaned) ids.add(cleaned);
  }
  return [...ids];
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
  const primaryId = String(body.userId || "").trim();
  const telegramId = String(body.telegramId || "").trim();
  const aliasIds = collectIds(
    primaryId,
    telegramId,
    ...(Array.isArray(body.aliasIds) ? body.aliasIds.map(String) : []),
  );
  const parsedMonths = Number(body.months);
  const months = Number.isFinite(parsedMonths) ? Math.max(1, Math.min(24, Math.floor(parsedMonths))) : 1;
  const note = String(body.note || "").trim().slice(0, 200);
  if (!aliasIds.length) return NextResponse.json({ ok: false, error: "userId_required" }, { status: 400 });

  const now = new Date();
  const nowIso = now.toISOString();
  const amount = 40000 * months;

  const { data: existing, error: lookupError } = await db
    .from("practice_subscriptions")
    .select("id,user_id,expires_at,price_toman")
    .in("user_id", aliasIds)
    .eq("status", "active")
    .gt("expires_at", nowIso)
    .order("expires_at", { ascending: false });
  if (lookupError) return NextResponse.json({ ok: false, error: lookupError.message }, { status: 503 });

  const furthest = existing?.[0];
  const base = furthest?.expires_at ? new Date(furthest.expires_at) : now;
  const expires = new Date(base.getTime());
  expires.setMonth(expires.getMonth() + months);
  const expiresIso = expires.toISOString();
  const activated: Array<Record<string, unknown>> = [];

  for (const uid of aliasIds) {
    const current = existing?.find((row) => row.user_id === uid);
    if (current?.id) {
      const { data, error } = await db
        .from("practice_subscriptions")
        .update({ expires_at: expiresIso, price_toman: Number(current.price_toman || 0) + amount, status: "active" })
        .eq("id", current.id)
        .select("id,user_id,status,price_toman,started_at,expires_at")
        .single();
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 503 });
      activated.push(data);
    } else {
      const { data, error } = await db
        .from("practice_subscriptions")
        .insert({ user_id: uid, status: "active", price_toman: amount, started_at: nowIso, expires_at: expiresIso })
        .select("id,user_id,status,price_toman,started_at,expires_at")
        .single();
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 503 });
      activated.push(data);
    }
  }

  try {
    await db.from("practice_payment_requests").insert({
      user_id: primaryId || aliasIds[0],
      reference: note ? `admin:${session.username}:${note}` : `admin:${session.username}:manual`,
      amount_toman: amount,
      status: "approved",
      reviewed_at: nowIso,
      reviewed_by: session.username,
    });
  } catch {
    /* audit optional */
  }

  return NextResponse.json({
    ok: true,
    subscription: activated[0],
    subscriptions: activated,
    activatedBy: session.username,
    aliases: aliasIds,
    message: `اشتراک Pro برای ${aliasIds.join(" · ")} تا ${expiresIso} فعال شد.`,
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
