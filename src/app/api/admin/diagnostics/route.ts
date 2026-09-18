import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import { backendBase } from "@/lib/admin-proxy";
import { hasSupabase } from "@/lib/supabase-media";
import { getConfiguredProviders } from "@/lib/ai-providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sessionCookie = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  const session = verifyAdminSession(sessionCookie);

  const checks: Array<{
    id: string;
    label: string;
    ok: boolean;
    detail: string;
  }> = [];

  checks.push({
    id: "admin_session",
    label: "نشست ادمین",
    ok: Boolean(session),
    detail: session
      ? `وارد شده به عنوان ${session.username}`
      : "وارد نشده — از /login با ARTISTYAR_ADMIN_USERNAME وارد شو",
  });

  const adminUser = Boolean((process.env.ARTISTYAR_ADMIN_USERNAME || "").trim());
  const adminPass = Boolean((process.env.ARTISTYAR_ADMIN_PASSWORD || "").trim());
  const sessionSecret = Boolean(
    (process.env.ARTISTYAR_SESSION_SECRET || process.env.ARTISTYAR_ADMIN_PASSWORD || "").trim(),
  );
  checks.push({
    id: "admin_env",
    label: "Env ورود ادمین",
    ok: adminUser && adminPass && sessionSecret,
    detail:
      adminUser && adminPass
        ? "ARTISTYAR_ADMIN_USERNAME/PASSWORD ست شده"
        : "ARTISTYAR_ADMIN_USERNAME یا PASSWORD روی Render خالی است",
  });

  const webAdminKey = Boolean((process.env.WEB_ADMIN_API_KEY || "").trim());
  checks.push({
    id: "web_admin_key",
    label: "کلید ارتباط با backend",
    ok: webAdminKey,
    detail: webAdminKey
      ? "WEB_ADMIN_API_KEY ست شده"
      : "WEB_ADMIN_API_KEY خالی است — هنرجوها/رزرو/پرداخت کار نمی‌کند",
  });

  checks.push({
    id: "supabase",
    label: "Supabase (آپلود محتوا)",
    ok: hasSupabase(),
    detail: hasSupabase()
      ? "SUPABASE_URL + SECRET ست شده"
      : "SUPABASE_URL / SUPABASE_SECRET_KEY ست نیست — آپلود محتوا کار نمی‌کند",
  });

  const providers = getConfiguredProviders();
  checks.push({
    id: "ai",
    label: "AI providers",
    ok: providers.length > 0,
    detail: providers.length
      ? `${providers.length} provider فعال: ${providers.map((p) => p.id).join(", ")}`
      : "هیچ کلید AI در env نیست",
  });

  let backendOk = false;
  let backendDetail = backendBase();
  try {
    const res = await fetch(`${backendBase()}/api/v1/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    backendOk = res.ok;
    backendDetail = res.ok
      ? `backend آنلاین (${backendBase()})`
      : `backend HTTP ${res.status} — ${backendBase()}`;
  } catch (err) {
    backendDetail = `backend در دسترس نیست: ${err instanceof Error ? err.message : String(err)}`;
  }
  checks.push({
    id: "backend",
    label: "راه‌یار backend",
    ok: backendOk,
    detail: backendDetail,
  });

  // Optional: probe admin students if session + key exist
  let studentsProbe: { ok: boolean; detail: string } | null = null;
  if (session && webAdminKey) {
    try {
      const res = await fetch(`${backendBase()}/api/v1/admin/students?limit=1`, {
        headers: { "X-Admin-Key": process.env.WEB_ADMIN_API_KEY || "" },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      const text = await res.text();
      studentsProbe = {
        ok: res.ok,
        detail: res.ok
          ? "endpoint هنرجوها پاسخ می‌دهد"
          : `admin/students → HTTP ${res.status}: ${text.slice(0, 120)}`,
      };
    } catch (err) {
      studentsProbe = {
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }
  if (studentsProbe) {
    checks.push({
      id: "students_api",
      label: "API هنرجوها",
      ok: studentsProbe.ok,
      detail: studentsProbe.detail,
    });
  }

  const allOk = checks.every((c) => c.ok);
  return NextResponse.json({
    ok: allOk,
    checks,
    backend: backendBase(),
    session: session ? { username: session.username } : null,
  });
}
