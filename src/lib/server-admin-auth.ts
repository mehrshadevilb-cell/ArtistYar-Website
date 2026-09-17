import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "artistyar_admin_session";
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

type SessionPayload = { username: string; issuedAt: number };

function secret(): string {
  return process.env.ARTISTYAR_ADMIN_PASSWORD || "";
}

function signature(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex").slice(0, 32);
}

export function createAdminSession(username: string): string {
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
