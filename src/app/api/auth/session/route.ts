import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const backend = (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(/\/$/, "");
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSession,
  USER_SESSION_COOKIE,
  verifyUserSession,
  createUserSession,
  userSessionCookieOptions,
} from "@/lib/server-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function botToken() {
  return (
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.TELEGRAM_TOKEN ||
    process.env.BOT_TOKEN ||
    ""
  ).trim();
}

/**
 * Validate Telegram Mini App initData locally (HMAC-SHA-256) so login still
 * works when the RahYar bridge is temporarily unavailable.
 * Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function validateTelegramInitData(initData: string, maxAgeSeconds = 86400): {
  ok: true;
  user: { id: string; username: string; fullName: string; telegramId: string };
} | { ok: false; error: string } {
  const token = botToken();
  if (!token) return { ok: false, error: "telegram_bot_token_missing" };

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, error: "telegram_hash_missing" };

  const pairs: string[] = [];
  params.forEach((value, key) => {
    if (key === "hash") return;
    pairs.push(`${key}=${value}`);
  });
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(token).digest();
  const computed = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  try {
    const a = Buffer.from(computed, "hex");
    const b = Buffer.from(hash, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, error: "telegram_hash_invalid" };
    }
  } catch {
    return { ok: false, error: "telegram_hash_invalid" };
  }

  const authDate = Number(params.get("auth_date") || 0);
  if (!Number.isFinite(authDate) || authDate <= 0) {
    return { ok: false, error: "telegram_auth_date_missing" };
  }
  const age = Math.floor(Date.now() / 1000) - authDate;
  if (age < -60 || age > maxAgeSeconds) {
    return { ok: false, error: "telegram_auth_date_expired" };
  }

  let tgUser: any = null;
  try {
    tgUser = JSON.parse(params.get("user") || "null");
  } catch {
    return { ok: false, error: "telegram_user_invalid" };
  }
  if (!tgUser?.id) return { ok: false, error: "telegram_user_missing" };

  const telegramId = String(tgUser.id);
  const username = String(tgUser.username || telegramId);
  const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ").trim() || "هنرجو";

  return {
    ok: true,
    user: {
      id: telegramId,
      username,
      fullName,
      telegramId,
    },
  };
}

export async function GET() {
  const cookieStore = await cookies();
  const session = verifyAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (session) {
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

  const userSession = verifyUserSession(cookieStore.get(USER_SESSION_COOKIE)?.value);
  if (userSession) {
    return NextResponse.json(
      { authenticated: true, user: userSession },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }
  return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const initData = String(body.initData || "").trim();
  if (!initData) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 400 });
  }

  // Prefer RahYar bridge when available so student records stay synchronized.
  try {
    const response = await fetch(`${backend}/api/v1/telegram/webapp-auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.RAHYAR_AI_BRIDGE_SECRET
          ? { "x-bridge-secret": process.env.RAHYAR_AI_BRIDGE_SECRET }
          : {}),
      },
      body: JSON.stringify({ initData }),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.ok && data.user) {
      const u = data.user as Record<string, unknown>;
      const normalized = {
        id: String(u.id ?? u.user_id ?? u.telegram_id ?? "telegram-user"),
        username: String(u.username ?? u.phone ?? u.telegram_id ?? "telegram-user"),
        fullName: String(u.fullName ?? u.full_name ?? u.name ?? "هنرجو"),
        role: "student" as const,
        telegramId:
          u.telegramId != null
            ? String(u.telegramId)
            : u.telegram_id != null
              ? String(u.telegram_id)
              : undefined,
      };
      const responseOut = NextResponse.json(
        { authenticated: true, user: { ...data.user, ...normalized }, source: "rahyar" },
        { headers: { "Cache-Control": "private, no-store" } },
      );
      responseOut.cookies.set(
        USER_SESSION_COOKIE,
        createUserSession(normalized),
        userSessionCookieOptions,
      );
      return responseOut;
    }
  } catch {
    // Fall through to local HMAC validation.
  }

  const local = validateTelegramInitData(initData);
  if (!local.ok) {
    return NextResponse.json(
      { authenticated: false, user: null, error: local.error },
      { status: 401 },
    );
  }

  const normalized = {
    id: local.user.id,
    username: local.user.username,
    fullName: local.user.fullName,
    role: "student" as const,
    telegramId: local.user.telegramId,
  };
  const responseOut = NextResponse.json(
    {
      authenticated: true,
      user: { ...normalized, telegramLinked: true },
      source: "local_initdata",
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
  responseOut.cookies.set(
    USER_SESSION_COOKIE,
    createUserSession(normalized),
    userSessionCookieOptions,
  );
  return responseOut;
}
