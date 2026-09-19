import { NextResponse } from "next/server";
import { getStudentSession, verifyCourseAccess } from "@/lib/education-access";
import { listEducationVideos, signEducationVideo } from "@/lib/educational-videos";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const { id } = await params;
  try {
    const video = (await listEducationVideos()).find(v => v.id === id && v.is_active);
    if (!video) return NextResponse.json({ error: "video_not_found" }, { status: 404 });
    if (!await verifyCourseAccess(session, video.course_id)) return NextResponse.json({ error: "course_access_required" }, { status: 403 });
    const url = await signEducationVideo(video, 300);
    return NextResponse.json({ url, expiresIn: 300 }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "video_unavailable" }, { status: 500 });
  }
}
