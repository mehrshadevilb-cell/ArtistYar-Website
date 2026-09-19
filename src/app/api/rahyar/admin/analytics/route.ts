import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";

const backend = (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(/\/$/, "");

function parseDays(value: string | null): number {
  const parsed = Number(value || 30);
  return Number.isFinite(parsed) ? Math.min(365, Math.max(1, Math.floor(parsed))) : 30;
}

export async function GET(request: Request) {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifyAdminSession(session)) return NextResponse.json({ error: "admin_session_required" }, { status: 401 });
  const key = (process.env.WEB_ADMIN_API_KEY || "").trim();
  if (!key) return NextResponse.json({ error: "web_admin_api_key_not_configured" }, { status: 503 });

  const days = parseDays(new URL(request.url).searchParams.get("days"));

  try {
    const response = await fetch(`${backend}/api/v1/admin/analytics/summary?days=${days}`, {
      headers: { "X-Admin-Key": key, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });
    const text = await response.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { error: "backend_invalid_json", message: `Backend returned invalid JSON (HTTP ${response.status}).` };
    }
    return NextResponse.json(body ?? {}, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "backend_unreachable";
    return NextResponse.json({ error: "backend_unreachable", message }, { status: 502 });
  }
}
