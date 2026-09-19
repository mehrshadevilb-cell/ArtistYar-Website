import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";

const backend = (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(/\/$/, "");

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifyAdminSession(session)) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });
  const key = process.env.WEB_ADMIN_API_KEY || "";
  const id = (await context.params).id;
  if (!key) return NextResponse.json({ error: "web_admin_api_key_not_configured" }, { status: 503 });
  const response = await fetch(`${backend}/api/v1/admin/students/${id}/enrollments`, { headers: { "X-Admin-Key": key }, cache: "no-store" });
  return NextResponse.json(await response.json(), { status: response.status });
}
