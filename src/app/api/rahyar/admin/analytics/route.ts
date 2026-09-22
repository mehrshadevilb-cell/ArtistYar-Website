import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const backend = (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(/\/$/, "");

function parseDays(value: string | null): number {
  const parsed = Number(value || 30);
  return Number.isFinite(parsed) ? Math.min(365, Math.max(1, Math.floor(parsed))) : 30;
}

function normalizeBackendError(status: number, body: any): { status: number; body: Record<string, unknown> } {
  const detail =
    (typeof body?.detail === "string" && body.detail) ||
    (typeof body?.message === "string" && body.message) ||
    (typeof body?.error === "string" && body.error) ||
    "";

  if (status === 401 || status === 403 || /admin_access_denied|unauthorized|forbidden/i.test(detail)) {
    return {
      status: 403,
      body: {
        error: "admin_key_mismatch",
        message:
          "دسترسی آمار بک‌اند رد شد. WEB_ADMIN_API_KEY روی Render را با کلید ادمین سیستم راه‌یار یکسان کن.",
      },
    };
  }

  if (status >= 500) {
    return {
      status: 502,
      body: {
        error: "backend_internal_error",
        message: detail
          ? `سرور راه‌یار خطای داخلی داد: ${detail.slice(0, 180)}`
          : "سرور راه‌یار برای آمار خطای داخلی داد. چند دقیقه بعد دوباره تلاش کن.",
      },
    };
  }

  if (status >= 400) {
    return {
      status,
      body: {
        error: body?.error || "analytics_upstream_error",
        message: detail || `دریافت آمار ناموفق بود (HTTP ${status}).`,
        ...(body && typeof body === "object" ? body : {}),
      },
    };
  }

  return { status, body: body && typeof body === "object" ? body : { data: body } };
}

export async function GET(request: Request) {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifyAdminSession(session)) {
    return NextResponse.json({ error: "admin_session_required", message: "نشست ادمین معتبر نیست." }, { status: 401 });
  }

  const key = (process.env.WEB_ADMIN_API_KEY || "").trim();
  if (!key) {
    return NextResponse.json(
      {
        error: "web_admin_api_key_not_configured",
        message: "WEB_ADMIN_API_KEY روی Render تنظیم نشده است.",
      },
      { status: 503 },
    );
  }

  const days = parseDays(new URL(request.url).searchParams.get("days"));

  try {
    const response = await fetch(`${backend}/api/v1/admin/analytics/summary?days=${days}`, {
      headers: { "X-Admin-Key": key, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });
    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    if (!parsed) {
      return NextResponse.json(
        {
          error: "backend_invalid_json",
          message: `بک‌اند راه‌یار پاسخ JSON معتبر برنگرداند (HTTP ${response.status}).`,
        },
        { status: 502 },
      );
    }

    const normalized = normalizeBackendError(response.status, parsed);
    return NextResponse.json(normalized.body, { status: normalized.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "backend_unreachable";
    const timedOut = /abort|timeout/i.test(message);
    return NextResponse.json(
      {
        error: timedOut ? "backend_timeout" : "backend_unreachable",
        message: timedOut
          ? "پاسخ آمار از بک‌اند راه‌یار طول کشید (timeout)."
          : "اتصال به بک‌اند راه‌یار برای آمار برقرار نشد.",
      },
      { status: 502 },
    );
  }
}
