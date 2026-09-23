import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { USER_SESSION_COOKIE, verifyUserSession } from "@/lib/server-admin-auth";
import { createClient } from "@supabase/supabase-js";
import { PRACTICE_FREE_DAILY_STAGE_LIMIT } from "@/lib/practice-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const db = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

const FREE_STAGE_LIMIT = PRACTICE_FREE_DAILY_STAGE_LIMIT || 5;
const PRO_STAGE_LIMIT = 0;
const PRO_PRICE_TOMAN = 40000;

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
  const { data, error } = await db
    .from("practice_subscriptions")
    .select("id,expires_at,created_at,status,user_id")
    .in("user_id", userIds)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(`practice_subscription_query_failed: ${error.message}`);
  return data?.[0] || null;
}

/** Prefer atomic quota table; fall back to counting practice_records if RPC missing. */
async function getDailyUsed(userId: string): Promise<{ used: number; remaining: number; source: string }> {
  if (!db) throw new Error("practice_store_unavailable");

  const { data, error } = await db.rpc("get_practice_daily_quota", { p_user_id: userId });
  if (!error && data && typeof data === "object") {
    const row = data as Record<string, unknown>;
    return {
      used: Number(row.consumed) || 0,
      remaining: Number(row.remaining) || 0,
      source: "quota_rpc",
    };
  }

  const start = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
  const end = new Date(start.getTime() + 86400000);
  const { data: rows, error: qErr } = await db
    .from("practice_records")
    .select("id")
    .eq("user_id", userId)
    .gte("played_at", start.toISOString())
    .lt("played_at", end.toISOString());
  if (qErr) throw new Error(`practice_daily_usage_query_failed: ${qErr.message}`);
  const used = rows?.length || 0;
  return {
    used,
    remaining: Math.max(0, FREE_STAGE_LIMIT - used),
    source: "records_fallback",
  };
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const requestedUserId = params.get("userId")?.trim();
  const requestedTelegramId = params.get("telegramId")?.trim();
  const session = verifyUserSession((await cookies()).get(USER_SESSION_COOKIE)?.value);

  if (!session) {
    if (!requestedUserId && !requestedTelegramId) {
      return NextResponse.json({
        ok: true,
        registered: false,
        dailyLimit: FREE_STAGE_LIMIT,
        used: 0,
        remaining: FREE_STAGE_LIMIT,
        stageLimit: FREE_STAGE_LIMIT,
        remainingStages: FREE_STAGE_LIMIT,
        subscriptionDays: 0,
        pro: false,
        proPriceToman: PRO_PRICE_TOMAN,
      });
    }
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (requestedUserId && requestedUserId !== session.id) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (requestedTelegramId && session.telegramId && requestedTelegramId !== session.telegramId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ ok: false, error: "practice_store_not_configured" }, { status: 503 });
  }

  const userId = session.id;
  const telegramId = session.telegramId || "";
  const ids = collectIds(userId, telegramId);

  try {
    const [quota, sub] = await Promise.all([getDailyUsed(userId), findActivePro(ids)]);
    const pro = Boolean(sub);
    const subscriptionDays =
      pro && sub?.expires_at
        ? Math.max(
            1,
            Math.ceil(
              (new Date(sub.expires_at).getTime() -
                new Date(sub.created_at || new Date().toISOString()).getTime()) /
                86400000,
            ),
          )
        : 0;
    const dailyLimit = pro ? 0 : FREE_STAGE_LIMIT;
    const stageLimit = pro ? PRO_STAGE_LIMIT : FREE_STAGE_LIMIT;

    return NextResponse.json({
      ok: true,
      registered: true,
      dailyLimit,
      used: pro ? 0 : quota.used,
      remaining: pro ? 0 : quota.remaining,
      pro,
      stageLimit,
      subscriptionDays,
      remainingStages: pro ? null : quota.remaining,
      proPriceToman: PRO_PRICE_TOMAN,
      proExpiresAt: sub?.expires_at || null,
      unlimited: pro,
      quotaSource: quota.source,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "status_failed" },
      { status: 503 },
    );
  }
}

/** Pre-check only — does NOT consume a stage. Authoritative consume is in POST /progress. */
export async function POST(request: Request) {
  if (!db) return NextResponse.json({ ok: false, error: "practice_store_not_configured" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const session = verifyUserSession((await cookies()).get(USER_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const requestedUserId = String(body.userId || "").trim();
  const requestedTelegramId = String(body.telegramId || "").trim();
  if (requestedUserId && requestedUserId !== session.id) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (requestedTelegramId && session.telegramId && requestedTelegramId !== session.telegramId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const userId = session.id;
  const telegramId = session.telegramId || "";
  const ids = collectIds(userId, telegramId);

  try {
    const sub = await findActivePro(ids);
    if (sub) {
      return NextResponse.json({ ok: true, dailyLimit: 0, used: 0, remaining: 0, pro: true, unlimited: true });
    }
    const quota = await getDailyUsed(userId);
    if (quota.used >= FREE_STAGE_LIMIT) {
      return NextResponse.json(
        {
          ok: false,
          code: "daily_limit_reached",
          dailyLimit: FREE_STAGE_LIMIT,
          used: quota.used,
          remaining: 0,
        },
        { status: 429 },
      );
    }
    return NextResponse.json({
      ok: true,
      dailyLimit: FREE_STAGE_LIMIT,
      used: quota.used,
      remaining: quota.remaining,
      pro: false,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "status_failed" },
      { status: 503 },
    );
  }
}
