import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";

const backend = (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(/\/$/, "");

export async function GET(request: Request) {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifyAdminSession(session)) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });

  const key = process.env.WEB_ADMIN_API_KEY || "";
  if (!key) return NextResponse.json({ error: "web_admin_api_key_not_configured" }, { status: 503 });

  const url = new URL(request.url);
  const rawDays = Number(url.searchParams.get("days") || 30);
  const days = Number.isFinite(rawDays) ? Math.min(365, Math.max(1, Math.floor(rawDays))) : 30;
  try {
    const response = await fetch(`${backend}/api/v1/admin/analytics/ai?days=${days}`, {
      headers: { "X-Admin-Key": key, Accept: "application/json" },
      signal: AbortSignal.timeout(60_000),
      cache: "no-store",
    });
    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch {
    return NextResponse.json({ error: "analytics_ai_unavailable" }, { status: 503 });
  }
}
