import { NextResponse } from "next/server";
import { getStudentSession, verifyCourseAccess } from "@/lib/education-access";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const db = url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

export async function GET(request: Request) {
  const session = await getStudentSession();
  if (!session || !db) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const lessonId = new URL(request.url).searchParams.get("lessonId");
  if (!lessonId) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const result = await db.from("educational_video_progress").select("*").eq("user_id", Number(session.id)).eq("lesson_id", lessonId).maybeSingle();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json(result.data || { position_seconds: 0, completed: false });
}

export async function PUT(request: Request) {
  const session = await getStudentSession();
  if (!session || !db) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const lessonId = String(body.lessonId || "");
  const courseId = Number(body.courseId || 0);
  const positionSeconds = Math.max(0, Math.floor(Number(body.positionSeconds || 0)));
  const completed = body.completed === true;
  if (!lessonId || !Number.isInteger(courseId) || !(await verifyCourseAccess(session, courseId))) return NextResponse.json({ error: "course_access_required" }, { status: 403 });
  const result = await db.from("educational_video_progress").upsert({
    user_id: Number(session.id), lesson_id: lessonId, position_seconds: positionSeconds, completed, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,lesson_id" }).select("*").single();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json(result.data);
}
