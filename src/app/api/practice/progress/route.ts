import { NextResponse } from "next/server";
import { getPracticeProfile, hasPracticeStore, savePracticeResult } from "@/lib/practice-progress";
import { recordSkillEvent } from "@/lib/practice-skill-engine";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, USER_SESSION_COOKIE, verifyAdminSession, verifyUserSession } from "@/lib/server-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function dailyUsage(userId: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !secret) return 0;
  const db = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  const start = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
  const end = new Date(start.getTime() + 86400000);
  const { data } = await db.from("practice_records").select("id").eq("user_id", userId).gte("played_at", start.toISOString()).lt("played_at", end.toISOString());
  return data?.length || 0;
}

async function isProUser(userId: string, telegramId?: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !secret) return false;
  const db = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  const ids = [...new Set([userId, telegramId || ""].filter(Boolean))];
  const { data } = await db.from("practice_subscriptions").select("id").in("user_id", ids).eq("status", "active").gt("expires_at", new Date().toISOString()).limit(1);
  return Boolean(data?.length);
}

async function authorizedUser(request: Request, requestedId: string) {
  const store = await cookies();
  const admin = verifyAdminSession(store.get(ADMIN_SESSION_COOKIE)?.value);
  if (admin) return { id: requestedId, admin: true, username: admin.username, fullName: admin.username, telegramId: "" };
  const session = verifyUserSession(store.get(USER_SESSION_COOKIE)?.value);
  if (!session || session.id !== requestedId) return null;
  return { id: session.id, admin: false, username: session.username, fullName: session.fullName, telegramId: session.telegramId || "" };
}

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId")?.trim();
  if (!userId) return NextResponse.json({ ok: false, error: "شناسه کاربر لازم است." }, { status: 400 });
  if (!hasPracticeStore()) return NextResponse.json({ ok: false, error: "ذخیره‌سازی تمرین تنظیم نشده است." }, { status: 503 });
  if (!await authorizedUser(request, userId)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try { return NextResponse.json({ ok: true, ...(await getPracticeProfile(userId)) }); }
  catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "خطای ذخیره‌سازی" }, { status: 503 }); }
}

export async function POST(request: Request) {
  if (!hasPracticeStore()) return NextResponse.json({ ok: false, error: "ذخیره‌سازی تمرین تنظیم نشده است." }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (!body.userId) return NextResponse.json({ ok: false, error: "شناسه کاربر لازم است." }, { status: 400 });
  const requestedUserId = String(body.userId).slice(0, 120);
  const auth = await authorizedUser(request, requestedUserId);
  if (!auth) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  try {
    const userId = auth.id;
    const telegramId = auth.telegramId;
    const gameId = String(body.gameId || "unknown").slice(0, 80);
    const score = Number.isFinite(Number(body.score)) ? Math.max(-8, Math.min(20, Math.round(Number(body.score)))) : 0;
    const accuracy = Number.isFinite(Number(body.accuracy)) ? Math.max(0, Math.min(100, Number(body.accuracy))) : 0;
    const streak = Number.isFinite(Number(body.streak)) ? Math.max(0, Math.min(1, Math.round(Number(body.streak)))) : 0;
    const bestScore = Number.isFinite(Number(body.bestScore)) ? Math.max(0, Math.min(20, Math.round(Number(body.bestScore)))) : 0;
    const pro = auth.admin || await isProUser(userId, telegramId);
    let usedToday = 0;
    if (!pro) {
      usedToday = await dailyUsage(userId);
      if (usedToday >= 5) return NextResponse.json({ ok: false, code: "daily_limit_reached", pro: false, dailyLimit: 5, used: usedToday, remaining: 0 }, { status: 429 });
    }
    const row = await savePracticeResult({
      user_id: userId,
      username: auth.username.slice(0, 120),
      full_name: auth.fullName.slice(0, 160),
      game_id: gameId,
      score, accuracy, streak, best_score: bestScore,
      metadata: { ...(typeof body.metadata === "object" && body.metadata ? body.metadata : {}), ...(telegramId ? { telegramId } : {}) },
    });
    try {
      await recordSkillEvent({ userId, gameId, xp: Math.max(0, score), accuracy, difficulty: Number(body.metadata?.difficulty || 0), correct: accuracy >= 50, metadata: { ...(body.metadata || {}), streak } });
    } catch {}
    return NextResponse.json({ ok: true, row, pro, unlimited: pro, remaining: pro ? null : Math.max(0, 5 - usedToday - 1) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "ذخیره ناموفق بود." }, { status: 503 });
  }
}
