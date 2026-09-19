import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  USER_SESSION_COOKIE,
  userSessionCookieOptions,
} from "@/lib/server-admin-auth";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", { ...adminSessionCookieOptions, maxAge: 0 });
  response.cookies.set(USER_SESSION_COOKIE, "", { ...userSessionCookieOptions, maxAge: 0 });
  // Touch the cookie store so this route remains explicit about the session it clears.
  await cookies();
  return response;
}
