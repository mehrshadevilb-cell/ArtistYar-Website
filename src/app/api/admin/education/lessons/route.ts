import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import { createEducationLesson, deleteEducationLesson, listEducationLessons, updateEducationLesson } from "@/lib/educational-videos";

async function admin() {
  const value = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSession(value);
}

export async function GET(request: Request) {
  if (!await admin()) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });
  const id = Number(new URL(request.url).searchParams.get("courseId") || 0);
  try { return NextResponse.json(await listEducationLessons(id || undefined)); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "storage_error" }, { status: 500 }); }
}

export async function POST(request: Request) {
  if (!await admin()) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const courseId = Number(body.courseId);
  if (!Number.isInteger(courseId) || courseId <= 0 || String(body.title || "").trim().length < 2) {
    return NextResponse.json({ error: "invalid_lesson" }, { status: 400 });
  }
  try { return NextResponse.json(await createEducationLesson({ courseId, title: String(body.title), description: String(body.description || ""), sortOrder: Number(body.sortOrder || 0) }), { status: 201 }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "storage_error" }, { status: 500 }); }
}

export async function PUT(request: Request) {
  if (!await admin()) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "lesson_id_required" }, { status: 400 });
  try { return NextResponse.json(await updateEducationLesson(String(body.id), { title: String(body.title || ""), description: String(body.description || ""), sortOrder: Number(body.sortOrder || 0), isActive: body.isActive !== false })); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "storage_error" }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  if (!await admin()) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "lesson_id_required" }, { status: 400 });
  try { await deleteEducationLesson(id); return new NextResponse(null, { status: 204 }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "storage_error" }, { status: 500 }); }
}
