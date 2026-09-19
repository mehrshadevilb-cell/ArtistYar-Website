import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { USER_SESSION_COOKIE, verifyUserSession } from "@/lib/server-admin-auth";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const db = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

const FREE_STAGE_LIMIT = 5;
const PRO_STAGE_LIMIT = 500;
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
  const requestedUserId = params.get("userId")?.trim();
  const requestedTelegramId = params.get("telegramId")?.trim();
  const session = verifyUserSession((await cookies()).get(USER_SESSION_COOKIE)?.value);
  if (!session) {
    if (!requestedUserId && !requestedTelegramId) {
      return NextResponse.json({
        ok: true, registered: false, dailyLimit: FREE_STAGE_LIMIT, used: 0,
        remaining: FREE_STAGE_LIMIT, stageLimit: FREE_STAGE_LIMIT, remainingStages: FREE_STAGE_LIMIT, subscriptionDays: 0, pro: false, proPriceToman: PRO_PRICE_TOMAN,
      });
    }
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (requestedUserId && requestedUserId !== session.id) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (requestedTelegramId && session.telegramId && requestedTelegramId !== session.telegramId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const userId = session.id;
  const telegramId = session.telegramId || "";

  if (!userId && !telegramId) {
    return NextResponse.json({
      ok: true, registered: false, dailyLimit: FREE_STAGE_LIMIT, used: 0,
      remaining: FREE_STAGE_LIMIT, stageLimit: FREE_STAGE_LIMIT, remainingStages: FREE_STAGE_LIMIT, subscriptionDays: 0, pro: false, proPriceToman: PRO_PRICE_TOMAN,
    });
  }

  if (!db) {
    return NextResponse.json({
      ok: true, registered: true, dailyLimit: FREE_STAGE_LIMIT, used: 0,
      remaining: FREE_STAGE_LIMIT, stageLimit: FREE_STAGE_LIMIT, remainingStages: FREE_STAGE_LIMIT, subscriptionDays: 0, pro: false, proPriceToman: PRO_PRICE_TOMAN,
    });
  }

  const ids = collectIds(userId, telegramId);
  const [used, sub] = await Promise.all([countDailyUsage(ids), findActivePro(ids)]);
  const pro = Boolean(sub);
  const subscriptionDays = pro && sub?.expires_at
    ? Math.max(1, Math.ceil((new Date(sub.expires_at).getTime() - new Date(sub.created_at || new Date().toISOString()).getTime()) / 86400000))
    : 0;
  const stageLimit = pro ? PRO_STAGE_LIMIT : FREE_STAGE_LIMIT;
  const dailyLimit = pro ? 0 : FREE_STAGE_LIMIT;

  return NextResponse.json({
    ok: true, registered: true, dailyLimit, used,
    remaining: pro ? 0 : Math.max(0, dailyLimit - used), pro,
    stageLimit, subscriptionDays,
    remainingStages: pro ? 0 : Math.max(0, stageLimit - used),
    proPriceToman: PRO_PRICE_TOMAN, proExpiresAt: sub?.expires_at || null,
  });
}

export async function POST(request: Request) {
  if (!db) return NextResponse.json({ ok: false, error: "practice_store_not_configured" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const session = verifyUserSession((await cookies()).get(USER_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const requestedUserId = String(body.userId || "").trim();
  const requestedTelegramId = String(body.telegramId || "").trim();
  if (requestedUserId && requestedUserId !== session.id) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (requestedTelegramId && session.telegramId && requestedTelegramId !== session.telegramId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const userId = session.id;
  const telegramId = session.telegramId || "";

  const ids = collectIds(userId, telegramId);
  const used = await countDailyUsage(ids);
  const sub = await findActivePro(ids);
  if (sub) {
    return NextResponse.json({ ok: true, dailyLimit: 0, used, remaining: 0, pro: true, unlimited: true });
  }
  const dailyLimit = FREE_STAGE_LIMIT;
  if (used >= dailyLimit) {
    return NextResponse.json({ ok: false, code: "daily_limit_reached", dailyLimit, used, remaining: 0 }, { status: 429 });
  }
  return NextResponse.json({ ok: true, dailyLimit, used, remaining: dailyLimit - used, pro: Boolean(sub) });
}
