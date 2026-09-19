import { NextResponse } from "next/server";
import { getStudentSession, verifyCourseAccess } from "@/lib/education-access";
import { listEducationLessons, listEducationVideos } from "@/lib/educational-videos";

export async function GET(request: Request) {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const courseId = Number(new URL(request.url).searchParams.get("courseId") || 0);
  if (!Number.isInteger(courseId) || courseId <= 0) return NextResponse.json({ error: "invalid_course" }, { status: 400 });
  if (!await verifyCourseAccess(session, courseId)) return NextResponse.json({ error: "course_access_required" }, { status: 403 });
  try {
    const lessons = await listEducationLessons(courseId);
    const result = await Promise.all(lessons.filter(x => x.is_active).map(async lesson => ({
      ...lesson,
      videos: (await listEducationVideos(courseId, lesson.id)).filter(v => v.is_active),
    })));
    return NextResponse.json({ courseId, lessons: result }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "education_unavailable" }, { status: 500 });
  }
}
