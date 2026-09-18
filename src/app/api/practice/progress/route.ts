import { NextResponse } from "next/server";
import { getPracticeProfile, hasPracticeStore, savePracticeResult } from "@/lib/practice-progress";
import { createClient } from "@supabase/supabase-js";
import { recordSkillEvent } from "@/lib/practice-skill-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const db = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
const MEMBER_DAILY_STAGES = 5;
const PRO_DAILY_STAGES = 40;

function collectIds(...values: Array<string | null | undefined>) {
  const ids = new Set<string>();
  for (const value of values) {
    const cleaned = String(value || "").trim();
    if (cleaned) ids.add(cleaned);
  }
  return [...ids];
}

async function isProUser(...candidateIds: string[]) {
  if (!db) return false;
  const ids = collectIds(...candidateIds);
  if (!ids.length) return false;
  const { data } = await db
    .from("practice_subscriptions")
    .select("id")
    .in("user_id", ids)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .limit(1);
  return Boolean(data?.length);
}

async function dailyUsage(userId: string) {
  if (!db) return 0;
  const start = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
  const end = new Date(start.getTime() + 86400000);
  const { data } = await db
    .from("practice_records")
    .select("id")
    .eq("user_id", userId)
    .gte("played_at", start.toISOString())
    .lt("played_at", end.toISOString());
  return data?.length || 0;
}

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId")?.trim();
  if (!userId) return NextResponse.json({ ok: false, error: "شناسه کاربر لازم است." }, { status: 400 });
  if (!hasPracticeStore()) return NextResponse.json({ ok: false, error: "ذخیره‌سازی تمرین تنظیم نشده است." }, { status: 503 });
  try {
    return NextResponse.json({ ok: true, ...(await getPracticeProfile(userId)) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "خطای ذخیره‌سازی" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!hasPracticeStore()) return NextResponse.json({ ok: false, error: "ذخیره‌سازی تمرین تنظیم نشده است." }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (!body.userId || !body.username) return NextResponse.json({ ok: false, error: "اطلاعات کاربر ناقص است." }, { status: 400 });
  try {
    const userId = String(body.userId).slice(0, 120);
    const telegramId = body.telegramId ? String(body.telegramId).slice(0, 50) : "";
    const gameId = String(body.gameId || "unknown").slice(0, 80);
    const pro = await isProUser(userId, telegramId);
    const dailyLimit = pro ? PRO_DAILY_STAGES : MEMBER_DAILY_STAGES;
    const usedToday = await dailyUsage(userId);
    if (usedToday >= dailyLimit) {
      return NextResponse.json(
        { ok: false, code: "daily_limit_reached", pro, dailyLimit, used: usedToday, remaining: 0 },
        { status: 429 },
      );
    }
    const row = await savePracticeResult({
      user_id: userId,
      username: String(body.username).slice(0, 120),
      full_name: String(body.fullName || body.username).slice(0, 160),
      game_id: gameId,
      score: Number(body.score) || 0,
      accuracy: Number(body.accuracy) || 0,
      streak: Number(body.streak) || 0,
      best_score: Number(body.bestScore) || 0,
      metadata: {
        ...(typeof body.metadata === "object" && body.metadata ? body.metadata : {}),
        ...(telegramId ? { telegramId } : {}),
      },
    });
    try {
      await recordSkillEvent({
        userId,
        gameId,
        xp: Math.max(0, Number(body.score) || 0),
        accuracy: Number(body.accuracy) || 0,
        difficulty: Number(body.metadata?.difficulty || 0),
        correct: Number(body.accuracy) >= 50,
        metadata: { ...(body.metadata || {}), streak: Number(body.streak) || 0 },
      });
    } catch {
      // Skill analytics are additive; a migration/provider issue must not block practice.
    }
    return NextResponse.json({ ok: true, row, pro, remaining: Math.max(0, dailyLimit - usedToday - 1) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "ذخیره ناموفق بود." }, { status: 503 });
  }
}
