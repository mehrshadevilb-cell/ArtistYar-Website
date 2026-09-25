import { NextResponse } from "next/server";
import { requireAdmin, errorResponse } from "@/lib/admin/classes/auth";
import {
  listSessionAttendance,
  upsertAttendance,
  finalizeAttendance,
} from "@/lib/admin/classes/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const { sessionId } = await ctx.params;
    return NextResponse.json({ ok: true, items: await listSessionAttendance(sessionId) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PUT(request: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const { sessionId } = await ctx.params;
    const body = await request.json();
    if (body.finalize === true || body.finalize === false) {
      const session = await finalizeAttendance(sessionId, auth.username, body.finalize);
      return NextResponse.json({ ok: true, session });
    }
    if (!Array.isArray(body.items)) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }
    const items = await upsertAttendance(sessionId, body.items, auth.username);
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    return errorResponse(e);
  }
}
