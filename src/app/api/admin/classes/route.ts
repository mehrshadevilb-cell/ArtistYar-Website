import { NextResponse } from "next/server";
import { requireAdmin, errorResponse } from "@/lib/admin/classes/auth";
import { listClasses, createClass } from "@/lib/admin/classes/service";
import type { ClassStatus } from "@/lib/admin/classes/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const url = new URL(request.url);
    const result = await listClasses({
      q: url.searchParams.get("q") || undefined,
      status: (url.searchParams.get("status") || "all") as ClassStatus | "all",
      limit: Number(url.searchParams.get("limit") || 30),
      offset: Number(url.searchParams.get("offset") || 0),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const item = await createClass(await request.json(), auth.username);
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
