import { NextResponse } from "next/server";
import { getStudentSession, verifyCourseAccess } from "@/lib/education-access";
import { db } from "@/lib/education-catalog";

function safeDbError() {
  return NextResponse.json({ error: "storage_unavailable" }, { status: 500 });
}

export async function GET(req: Request) {
  const s = await getStudentSession();
  if (!s || !db) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  const url = new URL(req.url);
  const lessonId = url.searchParams.get("lessonId");
  const courseId = Number(url.searchParams.get("courseId") || 0);

  // Single-lesson progress: require course access (same boundary as PUT).
  if (lessonId) {
    const lesson = await db
      .from("educational_lessons")
      .select("id,course_id,is_active")
      .eq("id", lessonId)
      .maybeSingle();
    if (lesson.error) return safeDbError();
    if (!lesson.data?.is_active) {
      return NextResponse.json({ error: "lesson_not_found" }, { status: 404 });
    }
    const lessonCourseId = Number(lesson.data.course_id);
    if (!Number.isInteger(lessonCourseId) || lessonCourseId <= 0 || !(await verifyCourseAccess(s, lessonCourseId))) {
      return NextResponse.json({ error: "course_access_required" }, { status: 403 });
    }
    const r = await db
      .from("educational_video_progress")
      .select("lesson_id,position_seconds,completed,updated_at,first_accessed_at,completed_at")
      .eq("user_id", Number(s.id))
      .eq("lesson_id", lessonId)
      .maybeSingle();
    if (r.error) return safeDbError();
    return NextResponse.json(r.data || { position_seconds: 0, completed: false });
  }

  if (!Number.isInteger(courseId) || courseId <= 0 || !(await verifyCourseAccess(s, courseId))) {
    return NextResponse.json({ error: "course_access_required" }, { status: 403 });
  }

  const [lessons, completion, activity] = await Promise.all([
    db.from("educational_lessons").select("id,is_required,is_active").eq("course_id", courseId),
    db
      .from("educational_course_completions")
      .select("*")
      .eq("user_id", Number(s.id))
      .eq("course_id", courseId)
      .maybeSingle(),
    db
      .from("educational_learning_activity")
      .select("lesson_id,event_type,position_seconds,occurred_at")
      .eq("user_id", Number(s.id))
      .eq("course_id", courseId)
      .order("occurred_at", { ascending: false })
      .limit(20),
  ]);
  if (lessons.error) return safeDbError();

  const ids = (lessons.data || []).filter((x: { is_active: boolean }) => x.is_active).map((x: { id: string }) => x.id);
  let p: Array<{ lesson_id: string; completed: boolean }> = [];
  if (ids.length) {
    const r = await db
      .from("educational_video_progress")
      .select("lesson_id,completed,position_seconds,updated_at,first_accessed_at,completed_at")
      .eq("user_id", Number(s.id))
      .in("lesson_id", ids);
    if (r.error) return safeDbError();
    p = r.data || [];
  }
  const required = (lessons.data || []).filter(
    (x: { is_active: boolean; is_required: boolean }) => x.is_active && x.is_required,
  );
  const done = new Set(p.filter((x) => x.completed).map((x) => x.lesson_id));
  const completedRequired = required.filter((x: { id: string }) => done.has(x.id)).length;
  const percent = required.length ? Math.round((completedRequired / required.length) * 100) : 0;
  return NextResponse.json({
    courseId,
    completionPercent: percent,
    completedLessons: done.size,
    requiredLessons: required.length,
    lastActivity: activity.data?.[0] || null,
    completedAt: completion.data?.completed_at || null,
    activity: activity.data || [],
  });
}

export async function PUT(req: Request) {
  const s = await getStudentSession();
  if (!s || !db) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const lessonId = String(b.lessonId || "");
  const courseId = Number(b.courseId || 0);
  const position = Math.max(0, Math.floor(Number(b.positionSeconds || 0)));
  const completed = b.completed === true;

  if (!lessonId || !Number.isInteger(courseId) || courseId <= 0 || !(await verifyCourseAccess(s, courseId))) {
    return NextResponse.json({ error: "course_access_required" }, { status: 403 });
  }

  const lesson = await db
    .from("educational_lessons")
    .select("id,is_required,is_active")
    .eq("id", lessonId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (lesson.error) return safeDbError();
  if (!lesson.data?.is_active) return NextResponse.json({ error: "lesson_not_found" }, { status: 404 });

  const now = new Date().toISOString();
  const existing = await db
    .from("educational_video_progress")
    .select("first_accessed_at")
    .eq("user_id", Number(s.id))
    .eq("lesson_id", lessonId)
    .maybeSingle();
  const r = await db
    .from("educational_video_progress")
    .upsert(
      {
        user_id: Number(s.id),
        lesson_id: lessonId,
        position_seconds: position,
        completed,
        updated_at: now,
        first_accessed_at: existing.data?.first_accessed_at || now,
        completed_at: completed ? now : null,
      },
      { onConflict: "user_id,lesson_id" },
    )
    .select("*")
    .single();
  if (r.error) return safeDbError();

  await db.from("educational_learning_activity").insert({
    user_id: Number(s.id),
    course_id: courseId,
    lesson_id: lessonId,
    event_type: completed ? "completed" : "progress",
    position_seconds: position,
  });

  const required = await db.from("educational_lessons").select("id,is_required,is_active").eq("course_id", courseId);
  const reqIds = (required.data || [])
    .filter((x: { is_active: boolean; is_required: boolean }) => x.is_active && x.is_required)
    .map((x: { id: string }) => x.id);
  let completedIds: string[] = [];
  if (reqIds.length) {
    const rr = await db
      .from("educational_video_progress")
      .select("lesson_id")
      .eq("user_id", Number(s.id))
      .eq("completed", true)
      .in("lesson_id", reqIds);
    completedIds = (rr.data || []).map((x: { lesson_id: string }) => x.lesson_id);
  }
  const courseComplete = reqIds.length > 0 && completedIds.length >= reqIds.length;
  if (courseComplete) {
    await db
      .from("educational_course_completions")
      .upsert({ user_id: Number(s.id), course_id: courseId, completed_at: now }, { onConflict: "user_id,course_id" });
  }
  return NextResponse.json({
    ...r.data,
    courseComplete,
    completionPercent: reqIds.length ? Math.round((completedIds.length / reqIds.length) * 100) : 0,
  });
}
