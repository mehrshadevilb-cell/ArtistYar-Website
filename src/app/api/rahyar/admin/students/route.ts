import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";

const backend = (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(/\/$/, "");

async function adminKey() {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSession(session) ? process.env.WEB_ADMIN_API_KEY || "" : null;
}

export async function GET(request: Request) {
  const key = await adminKey();
  if (key === null) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });
  if (!key) return NextResponse.json({ error: "web_admin_api_key_not_configured" }, { status: 503 });
  const query = new URL(request.url).search;
  const response = await fetch(`${backend}/api/v1/admin/students${query}`, { headers: { "X-Admin-Key": key }, cache: "no-store" });
  return NextResponse.json(await response.json(), { status: response.status });
}

export async function PUT(request: Request) {
  const key = await adminKey();
  if (key === null) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });
  if (!key) return NextResponse.json({ error: "web_admin_api_key_not_configured" }, { status: 503 });
  const body = await request.text();
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) return NextResponse.json({ error: "student_id_required" }, { status: 400 });
  const response = await fetch(`${backend}/api/v1/admin/students/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", "X-Admin-Key": key }, body, cache: "no-store" });
  return NextResponse.json(await response.json(), { status: response.status });
}
