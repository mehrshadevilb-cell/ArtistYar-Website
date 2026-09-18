import { NextResponse } from "next/server";
import { getPracticeProfile, hasPracticeStore, savePracticeResult } from "@/lib/practice-progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId")?.trim();
  if (!userId) return NextResponse.json({ ok: false, error: "شناسه کاربر لازم است." }, { status: 400 });
  if (!hasPracticeStore()) return NextResponse.json({ ok: false, error: "ذخیره‌سازی تمرین تنظیم نشده است." }, { status: 503 });
  try { return NextResponse.json({ ok: true, ...(await getPracticeProfile(userId)) }); }
  catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "خطای ذخیره‌سازی" }, { status: 503 }); }
}

export async function POST(request: Request) {
  if (!hasPracticeStore()) return NextResponse.json({ ok: false, error: "ذخیره‌سازی تمرین تنظیم نشده است." }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (!body.userId || !body.username) return NextResponse.json({ ok: false, error: "اطلاعات کاربر ناقص است." }, { status: 400 });
  try {
    const row = await savePracticeResult({
      user_id: String(body.userId).slice(0, 120),
      username: String(body.username).slice(0, 120),
      full_name: String(body.fullName || body.username).slice(0, 160),
      game_id: String(body.gameId || "unknown").slice(0, 80),
      score: Number(body.score) || 0,
      accuracy: Number(body.accuracy) || 0,
      streak: Number(body.streak) || 0,
      best_score: Number(body.bestScore) || 0,
      metadata: typeof body.metadata === "object" && body.metadata ? body.metadata : {},
    });
    return NextResponse.json({ ok: true, row });
  } catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "ذخیره ناموفق بود." }, { status: 503 }); }
}
