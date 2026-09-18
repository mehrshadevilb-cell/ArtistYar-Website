import { NextResponse } from "next/server";
import { getLeaderboard, hasPracticeStore } from "@/lib/practice-progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!hasPracticeStore()) return NextResponse.json({ ok: false, error: "Leaderboard هنوز به دیتابیس متصل نشده است." }, { status: 503 });
  const limit = Math.min(100, Math.max(5, Number(new URL(request.url).searchParams.get("limit")) || 50));
  try { return NextResponse.json({ ok: true, leaderboard: await getLeaderboard(limit) }); }
  catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "خطای leaderboard" }, { status: 503 }); }
}
