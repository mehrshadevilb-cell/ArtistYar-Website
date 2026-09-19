import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  createAdminSession,
  createUserSession,
  USER_SESSION_COOKIE,
  userSessionCookieOptions,
} from "@/lib/server-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const backend = (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(
  /\/$/,
  "",
);

/** Simple per-IP rate limit (in-memory; resets on process restart). */
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 20;
const MAX_LOGIN_BODY_BYTES = 16 * 1024;
const MAX_LOGIN_RATE_KEYS = 10_000;

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "unknown";
}

function checkRateLimit(key: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  for (const [storedKey, entry] of loginAttempts) {
    if (entry.resetAt <= now) loginAttempts.delete(storedKey);
  }
  if (!loginAttempts.has(key) && loginAttempts.size >= MAX_LOGIN_RATE_KEYS) {
    const oldest = loginAttempts.keys().next().value;
    if (oldest) loginAttempts.delete(oldest);
  }
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }
  entry.count += 1;
  if (entry.count > LOGIN_MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_LOGIN_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "درخواست ورود بیش از حد بزرگ است." }, { status: 413 });
  }

  const key = clientKey(request);
  const limit = checkRateLimit(key);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "تعداد تلاش‌های ورود زیاد است. چند دقیقه بعد دوباره امتحان کن." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

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

      response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSession(adminUser), adminSessionCookieOptions);
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
      const u = data.user as Record<string, unknown>;
      const normalized = {
        id: String(u.id ?? u.user_id ?? u.telegram_id ?? username),
        username: String(u.username ?? u.phone ?? username),
        fullName: String(u.fullName ?? u.full_name ?? u.name ?? username),
        role: "student" as const,
        telegramId:
          u.telegramId != null
            ? String(u.telegramId)
            : u.telegram_id != null
              ? String(u.telegram_id)
              : undefined,
      };
      const responseOut = NextResponse.json({ ...data, user: { ...data.user, ...normalized } });
      responseOut.cookies.set(USER_SESSION_COOKIE, createUserSession(normalized), userSessionCookieOptions);
      return responseOut;
    }
  } catch {
    return NextResponse.json({ ok: false, error: "student_login_backend_unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: false, error: "نام کاربری یا رمز عبور نادرست است." }, { status: 401 });
}
