import { NextResponse } from "next/server";
import { proxyAdmin } from "@/lib/admin-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).search;
  return proxyAdmin(`/api/v1/admin/students${query}`);
}

export async function PUT(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "student_id_required", message: "شناسه هنرجو لازم است." }, { status: 400 });
  }
  const body = await request.text();
  return proxyAdmin(`/api/v1/admin/students/${id}`, {
    method: "PUT",
    body,
  });
}
