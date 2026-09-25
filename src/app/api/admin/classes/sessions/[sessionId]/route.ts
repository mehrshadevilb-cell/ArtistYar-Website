import { NextResponse } from "next/server";
import { requireAdmin, errorResponse } from "@/lib/admin/classes/auth";
import { getSession, updateSession } from "@/lib/admin/classes/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const { sessionId } = await ctx.params;
    const item = await getSession(sessionId);
    if (!item) return NextResponse.json({ error: "session_not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, item });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(request: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const { sessionId } = await ctx.params;
    const item = await updateSession(sessionId, await request.json(), auth.username);
    return NextResponse.json({ ok: true, item });
  } catch (e) {
    return errorResponse(e);
  }
}
