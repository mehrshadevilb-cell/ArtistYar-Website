import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";

const backend = (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(/\/$/, "");

async function forward(id: string, method: "PUT" | "DELETE", body?: string) {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifyAdminSession(session)) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });
  const key = process.env.WEB_ADMIN_API_KEY || "";
  if (!key) return NextResponse.json({ error: "web_admin_api_key_not_configured" }, { status: 503 });
  const response = await fetch(`${backend}/api/v1/admin/free-lessons/${id}`, { method, headers: { "Content-Type": "application/json", "X-Admin-Key": key }, body, cache: "no-store" });
  if (response.status === 204) return new NextResponse(null, { status: 204 });
  const text = await response.text();
  try { return NextResponse.json(JSON.parse(text), { status: response.status }); }
  catch { return NextResponse.json({ error: text || "backend_invalid_response" }, { status: response.status || 502 }); }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) { return forward((await context.params).id, "PUT", await request.text()); }
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) { return forward((await context.params).id, "DELETE"); }
