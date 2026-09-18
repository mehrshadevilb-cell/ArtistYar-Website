import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "artistyar_admin_session";
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

type SessionPayload = { username: string; issuedAt: number };

function secret(): string {
  // Keep existing deployments working during the one-time migration to the
  // dedicated session secret. Once ARTISTYAR_SESSION_SECRET is configured,
  // new sessions use it and operators can rotate the admin password safely.
  return process.env.ARTISTYAR_SESSION_SECRET || process.env.ARTISTYAR_ADMIN_PASSWORD || "";
}

function signature(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex").slice(0, 32);
}

export function createAdminSession(username: string): string {
  if (!secret()) throw new Error("artistyar_session_secret_missing");
  const payload = `${username}:${Date.now()}`;
  return `${Buffer.from(payload).toString("base64url")}.${signature(payload)}`;
}

export function verifyAdminSession(value: string | undefined): SessionPayload | null {
  if (!value || !secret()) return null;

  try {
    const [encoded, providedSignature] = value.split(".");
    if (!encoded || !providedSignature) return null;

    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const expectedSignature = signature(payload);
    const a = Buffer.from(providedSignature);
    const b = Buffer.from(expectedSignature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const separator = payload.lastIndexOf(":");
    if (separator <= 0) return null;
    const username = payload.slice(0, separator);
    const issuedAt = Number(payload.slice(separator + 1));
    if (!username || !Number.isFinite(issuedAt)) return null;

    const ageSeconds = Math.floor((Date.now() - issuedAt) / 1000);
    if (ageSeconds < 0 || ageSeconds > SESSION_MAX_AGE_SECONDS) return null;

    return { username, issuedAt };
  } catch {
    return null;
  }
}

export const adminSessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};


export type WebUserSession = {
  id: string;
  username: string;
  fullName: string;
  role: "student";
  telegramId?: string;
};

export const USER_SESSION_COOKIE = "artistyar_user_session";
const USER_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function userSignature(payload: string): string {
  return createHmac("sha256", secret()).update("user:" + payload).digest("hex").slice(0, 32);
}

export function createUserSession(user: WebUserSession): string {
  if (!secret()) throw new Error("artistyar_session_secret_missing");
  const payload = JSON.stringify({ ...user, issuedAt: Date.now() });
  return `${Buffer.from(payload).toString("base64url")}.${userSignature(payload)}`;
}

export function verifyUserSession(value: string | undefined): WebUserSession | null {
  if (!value || !secret()) return null;
  try {
    const [encoded, providedSignature] = value.split(".");
    if (!encoded || !providedSignature) return null;
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const expected = userSignature(payload);
    const a = Buffer.from(providedSignature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(payload) as Partial<WebUserSession> & { issuedAt?: number };
    if (parsed.role !== "student" || typeof parsed.id !== "string" || typeof parsed.username !== "string" || !Number.isFinite(parsed.issuedAt)) return null;
    const age = Math.floor((Date.now() - Number(parsed.issuedAt)) / 1000);
    if (age < 0 || age > USER_SESSION_MAX_AGE_SECONDS) return null;
    return {
      id: parsed.id,
      username: parsed.username,
      fullName: typeof parsed.fullName === "string" ? parsed.fullName : parsed.username,
      role: "student",
      telegramId: typeof parsed.telegramId === "string" ? parsed.telegramId : undefined,
    };
  } catch {
    return null;
  }
}

export const userSessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: USER_SESSION_MAX_AGE_SECONDS,
};
