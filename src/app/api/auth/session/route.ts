import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const backend = (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(/\/$/, "");
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSession,
} from "@/lib/server-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const session = verifyAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!session) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  return NextResponse.json(
    {
      authenticated: true,
      user: {
        id: "admin",
        username: session.username,
        fullName: "مدیر آکادمی",
        role: "admin" as const,
        telegramLinked: true,
        telegramId: "owner",
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const initData = String(body.initData || "").trim();
  if (!initData) return NextResponse.json({ authenticated: false, user: null }, { status: 400 });

  try {
    const response = await fetch(`${backend}/api/v1/telegram/webapp-auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.RAHYAR_AI_BRIDGE_SECRET ? { "x-bridge-secret": process.env.RAHYAR_AI_BRIDGE_SECRET } : {}),
      },
      body: JSON.stringify({ initData }),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok || !data.user) {
      return NextResponse.json({ authenticated: false, user: null, error: data.error || "telegram_auth_failed" }, { status: response.status || 401 });
    }
    return NextResponse.json({ authenticated: true, user: data.user }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ authenticated: false, user: null, error: "telegram_auth_backend_unavailable" }, { status: 503 });
  }
}
