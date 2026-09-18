import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const db = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

const FREE_STAGE_LIMIT = 5;
const PRO_DAILY_STAGES = 40;
const PRO_PRICE_TOMAN = 40000;

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}

function collectIds(...values: Array<string | null | undefined>) {
  const ids = new Set<string>();
  for (const value of values) {
    const cleaned = String(value || "").trim();
    if (cleaned) ids.add(cleaned);
  }
  return [...ids];
}

async function findActivePro(userIds: string[]) {
  if (!db || !userIds.length) return null;
  const { data } = await db
    .from("practice_subscriptions")
    .select("id,expires_at,created_at,status,user_id")
    .in("user_id", userIds)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1);
  return data?.[0] || null;
}

async function countDailyUsage(userIds: string[]) {
  if (!db || !userIds.length) return 0;
  const start = new Date(`${dayKey()}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 86400000);
  const { data } = await db
    .from("practice_records")
    .select("id")
    .in("user_id", userIds)
    .gte("played_at", start.toISOString())
    .lt("played_at", end.toISOString());
  return data?.length || 0;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const userId = params.get("userId")?.trim();
  const telegramId = params.get("telegramId")?.trim();

  if (!userId && !telegramId) {
    return NextResponse.json({
      ok: true, registered: false, dailyLimit: GUEST_DAILY_STAGES, used: 0,
      remaining: FREE_STAGE_LIMIT, stageLimit: FREE_STAGE_LIMIT, remainingStages: FREE_STAGE_LIMIT, subscriptionDays: 0, pro: false, proPriceToman: PRO_PRICE_TOMAN,
    });
  }

  if (!db) {
    return NextResponse.json({
      ok: true, registered: true, dailyLimit: MEMBER_DAILY_STAGES, used: 0,
      remaining: FREE_STAGE_LIMIT, stageLimit: FREE_STAGE_LIMIT, remainingStages: FREE_STAGE_LIMIT, subscriptionDays: 0, pro: false, proPriceToman: PRO_PRICE_TOMAN,
    });
  }

  const ids = collectIds(userId, telegramId);
  const [used, sub] = await Promise.all([countDailyUsage(ids), findActivePro(ids)]);
  const pro = Boolean(sub);
  const subscriptionDays = pro && sub?.expires_at
    ? Math.max(1, Math.ceil((new Date(sub.expires_at).getTime() - new Date(sub.created_at || new Date().toISOString()).getTime()) / 86400000))
    : 0;
  const stageLimit = pro ? PRO_DAILY_STAGES : FREE_STAGE_LIMIT;
  const dailyLimit = pro ? PRO_DAILY_STAGES : FREE_STAGE_LIMIT;

  return NextResponse.json({
    ok: true, registered: true, dailyLimit, used,
    remaining: Math.max(0, dailyLimit - used), pro,
    stageLimit, subscriptionDays,
    remainingStages: stageLimit,
    proPriceToman: PRO_PRICE_TOMAN, proExpiresAt: sub?.expires_at || null,
  });
}

export async function POST(request: Request) {
  if (!db) return NextResponse.json({ ok: false, error: "practice_store_not_configured" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const userId = String(body.userId || "").trim();
  const telegramId = String(body.telegramId || "").trim();
  if (!userId && !telegramId) return NextResponse.json({ ok: false, error: "userId_required" }, { status: 400 });

  const ids = collectIds(userId, telegramId);
  const used = await countDailyUsage(ids);
  const sub = await findActivePro(ids);
  const dailyLimit = sub ? PRO_DAILY_STAGES : FREE_STAGE_LIMIT;
  if (used >= dailyLimit) {
    return NextResponse.json({ ok: false, code: "daily_limit_reached", dailyLimit, used, remaining: 0 }, { status: 429 });
  }
  return NextResponse.json({ ok: true, dailyLimit, used, remaining: dailyLimit - used, pro: Boolean(sub) });
}
