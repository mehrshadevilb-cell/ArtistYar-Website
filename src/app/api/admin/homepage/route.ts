import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import { getHomepageConfig, saveHomepageConfig } from "@/lib/homepage";
import { mergeHomepageConfig, type HomepageConfig } from "@/data/homepage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const sessionCookie = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSession(sessionCookie);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const config = await getHomepageConfig();
  return NextResponse.json({ ok: true, config });
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const config = mergeHomepageConfig(
    (body as { config?: HomepageConfig })?.config ?? body,
  );
  const result = await saveHomepageConfig(config);
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        hint:
          result.error === "supabase_not_configured"
            ? "SUPABASE_URL / SERVICE_ROLE missing"
            : "Ensure table public.site_settings (key text primary key, value jsonb, updated_at timestamptz) exists",
      },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, config });
}
