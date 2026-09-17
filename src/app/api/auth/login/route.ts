import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  createAdminSession,
} from "@/lib/server-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!username || !password) {
    return NextResponse.json({ ok: false, error: "نام کاربری و رمز عبور لازم است." }, { status: 400 });
  }

  const adminUser = (process.env.ARTISTYAR_ADMIN_USERNAME || "").trim();
  const adminPass = process.env.ARTISTYAR_ADMIN_PASSWORD || "";

  if (!adminUser || !adminPass) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "ورود ادمین هنوز روی سرور پیکربندی نشده. متغیرهای ARTISTYAR_ADMIN_USERNAME و ARTISTYAR_ADMIN_PASSWORD را در Render تنظیم کن.",
      },
      { status: 503 },
    );
  }

  if (safeEqual(username, adminUser) && safeEqual(password, adminPass)) {
    const response = NextResponse.json({
      ok: true,
      user: {
        id: "admin",
        username: adminUser,
        fullName: "مدیر آکادمی",
        role: "admin" as const,
        telegramLinked: true,
        telegramId: "owner",
      },
    });

    // The admin session is now an HttpOnly cookie. No upload/admin token is
    // returned to JavaScript or stored in sessionStorage/localStorage.
    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      createAdminSession(adminUser),
      adminSessionCookieOptions,
    );
    return response;
  }

  return NextResponse.json({ ok: false, error: "نام کاربری یا رمز عبور نادرست است." }, { status: 401 });
}
