import { NextResponse } from "next/server";
import { getSkillDashboard, hasSkillStore } from "@/lib/practice-skill-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId")?.trim();
  if (!userId) return NextResponse.json({ ok:false, error:"شناسه کاربر لازم است." }, { status:400 });
  if (!hasSkillStore()) return NextResponse.json({ ok:false, error:"Skill Engine تنظیم نشده است." }, { status:503 });
  try { return NextResponse.json({ ok:true, ...(await getSkillDashboard(userId)) }); }
  catch (error) { return NextResponse.json({ ok:false, error:error instanceof Error ? error.message:"خطای Skill Engine" }, { status:503 }); }
}