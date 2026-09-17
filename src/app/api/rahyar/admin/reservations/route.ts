import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";

const backend = (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(/\/$/, "");

async function forward(path: string, init?: RequestInit) {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifyAdminSession(session)) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });
  const key = process.env.WEB_ADMIN_API_KEY || "";
  if (!key) return NextResponse.json({ error: "web_admin_api_key_not_configured" }, { status: 503 });
  const response = await fetch(`${backend}${path}`, { ...init, headers: { "Content-Type": "application/json", "X-Admin-Key": key }, cache: "no-store" });
  const text = await response.text();
  try { return NextResponse.json(JSON.parse(text), { status: response.status }); }
  catch { return NextResponse.json({ error: text || "backend_invalid_response" }, { status: response.status || 502 }); }
}

export async function GET() { return forward("/api/v1/admin/reservations"); }

export async function POST(request: Request) {
  const body = await request.text();
  const parsed = JSON.parse(body) as { id?: number; action?: string; notes?: string };
  if (!parsed.id) return NextResponse.json({ error: "reservation_id_required" }, { status: 400 });
  return forward(`/api/v1/admin/reservations/${parsed.id}/review`, { method: "POST", body: JSON.stringify({ action: parsed.action, notes: parsed.notes || null }) });
}
