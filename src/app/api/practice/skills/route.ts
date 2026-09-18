import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { USER_SESSION_COOKIE, verifyUserSession } from "@/lib/server-admin-auth";
import { getSkillDashboard, hasSkillStore } from "@/lib/practice-skill-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId")?.trim();
  if (!userId) return NextResponse.json({ ok:false, error:"شناسه کاربر لازم است." }, { status:400 });
  const session = verifyUserSession((await cookies()).get(USER_SESSION_COOKIE)?.value);
  if (!session || session.id !== userId) return NextResponse.json({ ok:false, error:"unauthorized" }, { status:401 });
  if (!hasSkillStore()) return NextResponse.json({ ok:false, error:"Skill Engine تنظیم نشده است." }, { status:503 });
  try { return NextResponse.json({ ok:true, ...(await getSkillDashboard(userId)) }); }
  catch (error) { return NextResponse.json({ ok:false, error:error instanceof Error ? error.message:"خطای Skill Engine" }, { status:503 }); }
}