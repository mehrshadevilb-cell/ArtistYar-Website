import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function base() {
  return (process.env.RAHYAR_API_URL || "").replace(/\/$/, "");
}

export async function GET() {
  const session = verifyAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ ok: false, error: "دسترسی مدیریت لازم است." }, { status: 401 });

  const backend = base();
  if (!backend) {
    return NextResponse.json({ ok: false, source: "demo", note: "RAHYAR_API_URL not set", chat_assistant_enabled: false, self_check: "Backend connected نیست.", agent_status: "n/a" });
  }
  try {
    const headers: Record<string, string> = {};
    const secret = process.env.RAHYAR_WEB_API_SECRET || "";
    if (secret) headers["X-Rahyar-Key"] = secret;
    const res = await fetch(`${backend}/api/v1/ai/status`, { headers, cache: "no-store", signal: AbortSignal.timeout(8000) });
    const data = await res.json().catch(() => null);
    return NextResponse.json({ ...(data && typeof data === "object" ? data : {}), source: "rahyar" }, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, source: "error", error: "وضعیت دستیار موقتاً در دسترس نیست." }, { status: 502 });
  }
}
