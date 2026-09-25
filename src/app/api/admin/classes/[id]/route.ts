import { NextResponse } from "next/server";
import { requireAdmin, errorResponse } from "@/lib/admin/classes/auth";
import { getClass, updateClass, classAttendanceReport } from "@/lib/admin/classes/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await ctx.params;
    const item = await getClass(id);
    if (!item) return NextResponse.json({ error: "class_not_found" }, { status: 404 });
    const report = await classAttendanceReport(id);
    return NextResponse.json({ ok: true, item, report });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await ctx.params;
    const item = await updateClass(id, await request.json(), auth.username);
    return NextResponse.json({ ok: true, item });
  } catch (e) {
    return errorResponse(e);
  }
}
