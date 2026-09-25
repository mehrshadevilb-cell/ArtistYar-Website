import { NextResponse } from "next/server";
import { requireAdmin, errorResponse } from "@/lib/admin/classes/auth";
import { listEnrollments, enrollStudent, updateEnrollmentStatus } from "@/lib/admin/classes/service";
import type { EnrollmentStatus } from "@/lib/admin/classes/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await ctx.params;
    return NextResponse.json({ ok: true, items: await listEnrollments(id) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await ctx.params;
    const item = await enrollStudent(id, await request.json(), auth.username);
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    if (!body.enrollment_id || !body.status) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }
    const item = await updateEnrollmentStatus(
      body.enrollment_id,
      body.status as EnrollmentStatus,
      auth.username,
    );
    return NextResponse.json({ ok: true, item });
  } catch (e) {
    return errorResponse(e);
  }
}
