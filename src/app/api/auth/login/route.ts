import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  createAdminSession,
} from "@/lib/server-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const backend = (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(/\/$/, "");

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
    try {
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

      // The admin session is an HttpOnly cookie. No secret is returned to JS.
      response.cookies.set(
        ADMIN_SESSION_COOKIE,
        createAdminSession(adminUser),
        adminSessionCookieOptions,
      );
      return response;
    } catch {
      return NextResponse.json(
        { ok: false, error: "تنظیمات نشست ادمین روی سرور کامل نیست. با پشتیبانی تماس بگیر." },
        { status: 503 },
      );
    }
  }

  try {
    const response = await fetch(`${backend}/api/v1/students/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: username, password }),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.ok && data.user) {
      return NextResponse.json(data);
    }
  } catch {
    return NextResponse.json({ ok: false, error: "student_login_backend_unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: false, error: "نام کاربری یا رمز عبور نادرست است." }, { status: 401 });
}
