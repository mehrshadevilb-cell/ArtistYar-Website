import { NextResponse } from "next/server";
import { getPracticeProfile, hasPracticeStore, savePracticeResult } from "@/lib/practice-progress";
import { recordSkillEvent } from "@/lib/practice-skill-engine";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, USER_SESSION_COOKIE, verifyAdminSession, verifyUserSession } from "@/lib/server-admin-auth";
import { verifyPracticeQuestionToken } from "@/lib/practice-question-token";
import { PRACTICE_FREE_DAILY_STAGE_LIMIT } from "@/lib/practice-types";
import { calculateRoundXp } from "@/lib/practice-xp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_DAILY = PRACTICE_FREE_DAILY_STAGE_LIMIT || 5;

async function getDb() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !secret) return null;
  return createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
}

type QuotaResult = {
  allowed: boolean;
  pro: boolean;
  consumed: number;
  remaining: number | null;
  dailyLimit: number | null;
  error?: string;
};

/** Atomic Free daily-stage consume via DB RPC. Pro/admin: allowed without consuming. Fail closed on errors. */
async function consumeDailyStage(userId: string, isPro: boolean): Promise<QuotaResult> {
  const db = await getDb();
  if (!db) throw new Error("practice_store_unavailable");
  const { data, error } = await db.rpc("consume_practice_daily_stage", {
    p_user_id: userId,
    p_is_pro: isPro,
  });
  if (error) throw new Error(`consume_practice_daily_stage_failed: ${error.message}`);
  const row = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  return {
    allowed: Boolean(row.allowed),
    pro: Boolean(row.pro),
    consumed: Number(row.consumed) || 0,
    remaining: row.remaining == null ? null : Number(row.remaining),
    dailyLimit: row.dailyLimit == null ? null : Number(row.dailyLimit),
    error: row.error ? String(row.error) : undefined,
  };
}

/** Refund one Free stage after a failed save (best-effort). */
async function refundDailyStage(userId: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.rpc("refund_practice_daily_stage", { p_user_id: userId });
  } catch {
    /* best-effort refund */
  }
}

async function isProUser(userIds: string[]) {
  const db = await getDb();
  if (!db || !userIds.length) return false;
  const { data, error } = await db
    .from("practice_subscriptions")
    .select("id")
    .in("user_id", userIds)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .limit(1);
  if (error) throw new Error(`practice_subscription_query_failed: ${error.message}`);
  return Boolean(data?.length);
}

async function isDuplicateSubmission(userId: string, itemKey: string | null) {
  if (!itemKey || itemKey.length < 4) return false;
  const db = await getDb();
  if (!db) throw new Error("practice_store_unavailable");
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { data: recent, error } = await db
    .from("practice_records")
    .select("id,metadata")
    .eq("user_id", userId)
    .gte("played_at", since)
    .limit(40);
  if (error) throw new Error(`practice_duplicate_query_failed: ${error.message}`);
  return (recent || []).some((r) => {
    const m = r.metadata as Record<string, unknown> | null;
    return m && String(m.itemKey || "") === itemKey;
  });
}

async function authorizedUser(_request: Request, requestedId: string) {
  const store = await cookies();
  const admin = verifyAdminSession(store.get(ADMIN_SESSION_COOKIE)?.value);
  if (admin) {
    return {
      id: requestedId || admin.username,
      admin: true,
      username: admin.username,
      fullName: admin.username,
      telegramId: "",
    };
  }
  const session = verifyUserSession(store.get(USER_SESSION_COOKIE)?.value);
  if (!session) return null;
  return {
    id: session.id,
    admin: false,
    username: session.username || session.id,
    fullName: session.fullName || session.username || session.id,
    telegramId: session.telegramId || "",
  };
}

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId")?.trim();
  if (!userId) return NextResponse.json({ ok: false, error: "شناسه کاربر لازم است." }, { status: 400 });
  if (!hasPracticeStore()) return NextResponse.json({ ok: false, error: "ذخیره‌سازی تمرین تنظیم نشده است." }, { status: 503 });
  const auth = await authorizedUser(request, userId);
  if (!auth || (auth.id !== userId && !auth.admin)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await getPracticeProfile(userId)) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "خطای ذخیره‌سازی" },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  if (!hasPracticeStore()) {
    return NextResponse.json({ ok: false, error: "ذخیره‌سازی تمرین تنظیم نشده است." }, { status: 503 });
  }
  const body = await request.json().catch(() => ({}));
  const requestedUserId = String(body.userId || "").slice(0, 120);
  const auth = await authorizedUser(request, requestedUserId);
  if (!auth) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  if (!auth.admin && requestedUserId && requestedUserId !== auth.id) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let quotaConsumed = false;
  const userId = auth.id;

  try {
    const telegramId = auth.telegramId;
    const userIds = [...new Set([userId, telegramId].filter(Boolean))];
    const gameId = String(body.gameId || "unknown").slice(0, 80);
    const metadata =
      typeof body.metadata === "object" && body.metadata
        ? (body.metadata as Record<string, unknown>)
        : {};

    const itemKey =
      typeof metadata.itemKey === "string"
        ? metadata.itemKey.slice(0, 240)
        : typeof metadata.fingerprint === "string"
          ? String(metadata.fingerprint).slice(0, 240)
          : null;

    // 1) Duplicate check BEFORE quota consume
    if (itemKey && (await isDuplicateSubmission(userId, itemKey))) {
      return NextResponse.json(
        { ok: false, error: "duplicate_round", code: "duplicate" },
        { status: 409 },
      );
    }

    const coreQuestion = metadata.source === "core_ear_gym";
    const claims = coreQuestion
      ? verifyPracticeQuestionToken(metadata.verificationToken, userId)
      : null;
    if (
      coreQuestion &&
      (!claims || claims.gameId !== gameId || claims.fingerprint !== String(metadata.itemKey || ""))
    ) {
      return NextResponse.json(
        { ok: false, error: "سؤال تمرین معتبر نیست یا منقضی شده است." },
        { status: 422 },
      );
    }

    const verifiedCorrect = claims
      ? String(metadata.answer ?? "") === claims.answer
      : Boolean(metadata.correct);

    const difficulty = Math.max(
      1,
      Math.min(500, Number(claims?.difficulty || metadata.difficulty || body.difficulty || 1)),
    );
    const responseTimeMs =
      Number(metadata.responseTimeMs) > 0
        ? Math.min(60000, Math.round(Number(metadata.responseTimeMs)))
        : null;

    const rated = metadata.rated !== false;

    let score: number;
    if (claims) {
      score = verifiedCorrect ? 20 : 0;
    } else if (!rated) {
      score = 0;
    } else {
      score = calculateRoundXp({
        correct: verifiedCorrect,
        accuracy: verifiedCorrect ? 100 : 0,
        difficulty,
        responseTimeMs,
        rated: true,
        recentPerfectEasyCount: Number(metadata.recentPerfectEasyCount) || 0,
        workoutBonus: metadata.source === "workout",
        challengeBonus: metadata.source === "daily_challenge",
      });
      score = Math.max(-12, Math.min(45, score));
    }

    const accuracy = claims
      ? verifiedCorrect
        ? 100
        : 0
      : Number.isFinite(Number(body.accuracy))
        ? Math.max(0, Math.min(100, Number(body.accuracy) <= 1 ? Number(body.accuracy) * 100 : Number(body.accuracy)))
        : verifiedCorrect
          ? 100
          : 0;

    const streak = verifiedCorrect ? 1 : 0;
    const bestScore = Math.max(0, Math.min(45, score));

    const pro = auth.admin || (await isProUser(userIds));

    let quota: QuotaResult = {
      allowed: true,
      pro,
      consumed: 0,
      remaining: pro ? null : FREE_DAILY,
      dailyLimit: pro ? null : FREE_DAILY,
    };

    // 2) Atomic daily quota — only rated Free stages
    if (rated) {
      quota = await consumeDailyStage(userId, pro);
      if (!pro && quota.allowed) quotaConsumed = true;

      if (!quota.allowed) {
        return NextResponse.json(
          {
            ok: false,
            code: "daily_limit_reached",
            pro: false,
            dailyLimit: quota.dailyLimit ?? FREE_DAILY,
            used: quota.consumed,
            remaining: 0,
          },
          { status: 429 },
        );
      }
    }

    // 3) Persist; refund if insert fails
    let row;
    try {
      row = await savePracticeResult({
        user_id: userId,
        username: String(auth.username).slice(0, 120),
        full_name: String(auth.fullName).slice(0, 160),
        game_id: gameId,
        score,
        accuracy,
        streak,
        best_score: bestScore,
        metadata: {
          ...metadata,
          itemKey,
          verifiedCorrect,
          difficulty,
          responseTimeMs,
          serverXp: score,
          rated,
          ...(telegramId ? { telegramId } : {}),
        },
      });
    } catch (saveErr) {
      if (quotaConsumed) await refundDailyStage(userId);
      throw saveErr;
    }

    try {
      await recordSkillEvent({
        userId,
        gameId,
        xp: Math.max(0, score),
        accuracy,
        difficulty,
        correct: verifiedCorrect,
        metadata: {
          ...metadata,
          itemKey,
          verifiedCorrect,
          streak,
          responseTimeMs,
          rated,
        },
      });
    } catch {
      /* skill store optional */
    }

    return NextResponse.json({
      ok: true,
      row,
      pro,
      unlimited: pro,
      score,
      remaining: pro ? null : quota.remaining,
      dailyLimit: pro ? null : quota.dailyLimit ?? FREE_DAILY,
      used: pro ? null : quota.consumed,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "ذخیره ناموفق بود." },
      { status: 503 },
    );
  }
}
