import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import { createEducationLesson, deleteEducationLesson, listEducationLessons, updateEducationLesson } from "@/lib/educational-videos";
import { writeAuditLog } from "@/lib/admin/audit";

async function admin() { return verifyAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value); }

export async function GET(request: Request) {
  if (!await admin()) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });
  const id = Number(new URL(request.url).searchParams.get("courseId") || 0);
  try { return NextResponse.json(await listEducationLessons(id || undefined)); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "storage_error" }, { status: 500 }); }
}

export async function POST(request: Request) {
  const session = await admin(); if (!session) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });
  const body = await request.json().catch(() => ({})); const courseId = Number(body.courseId); const title = String(body.title || "").trim();
  if (!Number.isInteger(courseId) || courseId <= 0 || title.length < 2) return NextResponse.json({ error: "invalid_lesson" }, { status: 400 });
  try {
    const row = await createEducationLesson({ courseId, title, description: String(body.description || ""), sortOrder: Number.isInteger(body.sortOrder) ? body.sortOrder : 0, sectionId: body.sectionId ? String(body.sectionId) : null, content: String(body.content || ""), lessonType: String(body.lessonType || "video"), accessType: String(body.accessType || "course"), isRequired: body.isRequired !== false });
    await writeAuditLog({ actor: String((session as any).username || (session as any).id || "admin"), action: "education.update", resource_type: "educational_lesson", resource_id: row.id, after: { course_id: row.course_id, title: row.title, section_id: row.section_id, lesson_type: row.lesson_type, access_type: row.access_type, is_required: row.is_required } });
    return NextResponse.json(row, { status: 201 });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "storage_error" }, { status: 500 }); }
}

export async function PUT(request: Request) {
  const session = await admin(); if (!session) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });
  const body = await request.json().catch(() => ({})); if (!body.id) return NextResponse.json({ error: "lesson_id_required" }, { status: 400 });
  try {
    const row = await updateEducationLesson(String(body.id), { title: String(body.title || ""), description: String(body.description || ""), sort_order: Number.isInteger(body.sortOrder) ? body.sortOrder : 0, is_active: body.isActive !== false, section_id: body.sectionId ? String(body.sectionId) : null, content: String(body.content || ""), lesson_type: String(body.lessonType || "video"), access_type: String(body.accessType || "course"), is_required: body.isRequired !== false, slug: body.slug ? String(body.slug) : undefined, duration_seconds: Number.isFinite(Number(body.durationSeconds)) ? Number(body.durationSeconds) : undefined });
    await writeAuditLog({ actor: String((session as any).username || (session as any).id || "admin"), action: "education.update", resource_type: "educational_lesson", resource_id: String(body.id), after: { course_id: row.course_id, title: row.title, section_id: row.section_id, is_active: row.is_active, is_required: row.is_required } });
    return NextResponse.json(row);
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "storage_error" }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  const session = await admin(); if (!session) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id"); if (!id) return NextResponse.json({ error: "lesson_id_required" }, { status: 400 });
  try { await deleteEducationLesson(id); await writeAuditLog({ actor: String((session as any).username || (session as any).id || "admin"), action: "education.update", resource_type: "educational_lesson", resource_id: id, after: { is_active: false } }); return new NextResponse(null, { status: 204 }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "storage_error" }, { status: 500 }); }
}
