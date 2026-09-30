/**
 * Telegram plugin admin route authentication.
 * Header-only: never accept secrets from query strings (logs/referrers/history risk).
 */
import { timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** WEB_ADMIN_API_KEY via x-web-admin-key / x-admin-api-key headers only. */
export function isTelegramAdminAuthorized(request: Request): boolean {
  const expected = (process.env.WEB_ADMIN_API_KEY || "").trim();
  if (!expected) return false;
  const provided =
    request.headers.get("x-web-admin-key") ||
    request.headers.get("x-admin-api-key") ||
    "";
  return Boolean(provided) && safeEqual(provided, expected);
}

/**
 * Process endpoint: admin header OR dedicated process-secret header.
 * Query-string secrets are never accepted.
 */
export function isTelegramProcessAuthorized(request: Request): boolean {
  if (isTelegramAdminAuthorized(request)) return true;
  const processSecret = (process.env.TELEGRAM_PLUGIN_PROCESS_SECRET || "").trim();
  if (!processSecret) return false;
  const provided = request.headers.get("x-telegram-plugin-process-secret") || "";
  return Boolean(provided) && safeEqual(provided, processSecret);
}
