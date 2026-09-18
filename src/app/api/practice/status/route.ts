import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const db = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

const GUEST_DAILY_STAGES = 5;
const MEMBER_DAILY_STAGES = 15;
const PRO_PRICE_TOMAN = 40000;

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId")?.trim();
  if (!userId) return NextResponse.json({ ok: true, registered: false, dailyLimit: GUEST_DAILY_STAGES, used: 0, remaining: GUEST_DAILY_STAGES, pro: false, proPriceToman: PRO_PRICE_TOMAN });
  if (!db) return NextResponse.json({ ok: true, registered: true, dailyLimit: MEMBER_DAILY_STAGES, used: 0, remaining: MEMBER_DAILY_STAGES, pro: false, proPriceToman: PRO_PRICE_TOMAN });

  const start = new Date(`${dayKey()}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 86400000);
  const [{ data: rows }, { data: sub }] = await Promise.all([
    db.from("practice_records").select("id").eq("user_id", userId).gte("played_at", start.toISOString()).lt("played_at", end.toISOString()),
    db.from("practice_subscriptions").select("id,expires_at,status").eq("user_id", userId).eq("status", "active").gt("expires_at", new Date().toISOString()).order("expires_at", { ascending: false }).limit(1),
  ]);
  const used = rows?.length || 0;
  return NextResponse.json({ ok: true, registered: true, dailyLimit: MEMBER_DAILY_STAGES, used, remaining: Math.max(0, MEMBER_DAILY_STAGES - used), pro: Boolean(sub?.length), proPriceToman: PRO_PRICE_TOMAN, proExpiresAt: sub?.[0]?.expires_at || null });
}

export async function POST(request: Request) {
  if (!db) return NextResponse.json({ ok: false, error: "practice_store_not_configured" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const userId = String(body.userId || "").trim();
  if (!userId) return NextResponse.json({ ok: false, error: "userId_required" }, { status: 400 });

  const start = new Date(`${dayKey()}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 86400000);
  const { data: rows, error } = await db.from("practice_records").select("id").eq("user_id", userId).gte("played_at", start.toISOString()).lt("played_at", end.toISOString());
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 503 });
  const used = rows?.length || 0;
  if (used >= MEMBER_DAILY_STAGES) return NextResponse.json({ ok: false, code: "daily_limit_reached", dailyLimit: MEMBER_DAILY_STAGES, used, remaining: 0 }, { status: 429 });
  return NextResponse.json({ ok: true, dailyLimit: MEMBER_DAILY_STAGES, used, remaining: MEMBER_DAILY_STAGES - used });
}
