import { NextResponse } from "next/server";
import { requireAdmin, errorResponse } from "@/lib/admin/classes/auth";
import { listCalendarSessions } from "@/lib/admin/classes/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    if (!from || !to) return NextResponse.json({ error: "from_to_required" }, { status: 400 });
    const items = await listCalendarSessions({
      from,
      to,
      classId: url.searchParams.get("classId") || undefined,
      limit: Number(url.searchParams.get("limit") || 200),
    });
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    return errorResponse(e);
  }
}
