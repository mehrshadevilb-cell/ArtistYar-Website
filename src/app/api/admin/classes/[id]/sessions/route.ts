import { NextResponse } from "next/server";
import { requireAdmin, errorResponse } from "@/lib/admin/classes/auth";
import { listSessions, createSession } from "@/lib/admin/classes/service";
import type { SessionStatus } from "@/lib/admin/classes/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await ctx.params;
    const url = new URL(request.url);
    const items = await listSessions(id, {
      from: url.searchParams.get("from") || undefined,
      to: url.searchParams.get("to") || undefined,
      status: (url.searchParams.get("status") as SessionStatus) || undefined,
      limit: Number(url.searchParams.get("limit") || 50),
    });
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await ctx.params;
    const item = await createSession(id, await request.json(), auth.username);
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
