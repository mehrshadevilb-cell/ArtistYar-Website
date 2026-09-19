import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdaptivePlan, hasSkillStore } from "@/lib/practice-skill-engine";
import { USER_SESSION_COOKIE, verifyUserSession } from "@/lib/server-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestedUserId = new URL(request.url).searchParams.get("userId")?.trim();
  const session = verifyUserSession((await cookies()).get(USER_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (requestedUserId && requestedUserId !== session.id) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const userId = session.id;
  if (!hasSkillStore()) return NextResponse.json({ ok: false, error: "Skill Engine تنظیم نشده است." }, { status: 503 });
  try { return NextResponse.json({ ok: true, ...(await getAdaptivePlan(userId)) }); }
  catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "خطای Adaptive Engine" }, { status: 503 }); }
}
