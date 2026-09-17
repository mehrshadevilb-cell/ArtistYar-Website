import { cookies } from "next/headers";
import { NextResponse } from "next/server";
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
