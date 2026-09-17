import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";

const backend = (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(/\/$/, "");

async function getKey() {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSession(session) ? process.env.WEB_ADMIN_API_KEY || "" : null;
}

async function forward(path: string, init?: RequestInit) {
  const key = await getKey();
  if (key === null) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });
  if (!key) return NextResponse.json({ error: "web_admin_api_key_not_configured" }, { status: 503 });
  const response = await fetch(`${backend}${path}`, { ...init, headers: { "Content-Type": "application/json", "X-Admin-Key": key, ...(init?.headers || {}) }, cache: "no-store" });
  const text = await response.text();
  try { return NextResponse.json(JSON.parse(text), { status: response.status }); }
  catch { return NextResponse.json({ error: text || "backend_invalid_response" }, { status: response.status || 502 }); }
}

export async function GET() { return forward("/api/v1/admin/free-lessons"); }
export async function POST(request: Request) { return forward("/api/v1/admin/free-lessons", { method: "POST", body: await request.text() }); }
