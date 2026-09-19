import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";

export function backendBase(): string {
  return (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(
    /\/$/,
    "",
  );
}

export async function requireAdminBackendKey(): Promise<
  | { ok: true; key: string }
  | { ok: false; response: NextResponse }
> {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifyAdminSession(session)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "admin_session_required",
          message: "نشست مدیریت منقضی شده یا وارد نشده‌اید. از /login با حساب ادمین وارد شو.",
        },
        { status: 401 },
      ),
    };
  }

  const key = (process.env.WEB_ADMIN_API_KEY || "").trim();
  if (!key) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "web_admin_api_key_not_configured",
          message:
            "روی Render مقدار WEB_ADMIN_API_KEY را ست کن (باید با کلید backend راه‌یار یکی باشد).",
        },
        { status: 503 },
      ),
    };
  }

  return { ok: true, key };
}

export async function proxyAdmin(
  path: string,
  init?: RequestInit,
): Promise<NextResponse> {
  const auth = await requireAdminBackendKey();
  if (!auth.ok) return auth.response;

  const url = `${backendBase()}${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        "X-Admin-Key": auth.key,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers || {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });

    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { detail: text.slice(0, 500) || `HTTP ${response.status}` };
    }

    if (!response.ok) {
      const detail =
        typeof data === "object" && data && "detail" in data
          ? String((data as { detail: unknown }).detail)
          : typeof data === "object" && data && "error" in data
            ? String((data as { error: unknown }).error)
            : `backend_http_${response.status}`;
      return NextResponse.json(
        {
          error: detail,
          message: `ارتباط با backend ناموفق بود: ${detail}`,
          backend: backendBase(),
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data ?? {}, { status: response.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "backend_unreachable",
        message: `backend راه‌یار در دسترس نیست: ${msg}`,
        backend: backendBase(),
      },
      { status: 502 },
    );
  }
}
