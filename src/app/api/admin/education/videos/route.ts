import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import { createEducationVideo, deleteEducationVideo, listEducationVideos, updateEducationVideo } from "@/lib/educational-videos";

async function admin() {
  const value = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSession(value);
}

export async function GET(request: Request) {
  if (!await admin()) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });
  const q = new URL(request.url).searchParams;
  try { return NextResponse.json(await listEducationVideos(Number(q.get("courseId") || 0) || undefined, q.get("lessonId") || undefined)); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "database_error" }, { status: 500 }); }
}

export async function POST(request: Request) {
  if (!await admin()) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const courseId = Number(body.courseId), lessonId = String(body.lessonId || ""), storagePath = String(body.storagePath || "").trim();
  if (!Number.isInteger(courseId) || courseId <= 0 || !lessonId || !storagePath) return NextResponse.json({ error: "invalid_video" }, { status: 400 });
  try {
    const result = await createEducationVideo({
      course_id: courseId,
      lesson_id: lessonId,
      title: String(body.title || storagePath.split("/").pop() || "Educational video").slice(0, 200),
      description: String(body.description || "").slice(0, 2000),
      storage_bucket: String(body.storageBucket || "artistyar-media"),
      storage_path: storagePath,
      mime_type: String(body.mimeType || "video/mp4"),
      file_size: Number(body.fileSize || 0) || null,
      duration_seconds: Number(body.durationSeconds || 0) || null,
      thumbnail_path: body.thumbnailPath ? String(body.thumbnailPath) : null,
      sort_order: Number(body.sortOrder || 0),
      is_active: body.isActive !== false,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "database_error" }, { status: 500 }); }
}

export async function PUT(request: Request) {
  if (!await admin()) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "video_id_required" }, { status: 400 });
  try { return NextResponse.json(await updateEducationVideo(String(body.id), body)); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "database_error" }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  if (!await admin()) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "video_id_required" }, { status: 400 });
  try { await deleteEducationVideo(id); return new NextResponse(null, { status: 204 }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "database_error" }, { status: 500 }); }
}
