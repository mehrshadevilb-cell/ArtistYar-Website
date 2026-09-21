import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  USER_SESSION_COOKIE,
  ADMIN_SESSION_COOKIE,
  verifyUserSession,
  verifyAdminSession,
} from "@/lib/server-admin-auth";
import { listUserJobs, publicJobView } from "@/lib/music-generation/job-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveUser(): Promise<{ id: string } | null> {
  const store = await cookies();
  const admin = verifyAdminSession(store.get(ADMIN_SESSION_COOKIE)?.value);
  if (admin) return { id: `admin:${admin.username}` };
  const session = verifyUserSession(store.get(USER_SESSION_COOKIE)?.value);
  if (!session) return null;
  return { id: session.id };
}

export async function GET(request: Request) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const limit = Math.min(100, Math.max(1, Number(new URL(request.url).searchParams.get("limit")) || 30));

  try {
    const jobs = await listUserJobs(user.id, { limit });
    return NextResponse.json(
      {
        ok: true,
        items: jobs.map(publicJobView),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("supabase_not_configured")) {
      return NextResponse.json({ ok: false, error: "ذخیره‌سازی پیکربندی نشده." }, { status: 503 });
    }
    console.error("[music/library]", err);
    return NextResponse.json({ ok: false, error: "خطا در دریافت کتابخانه." }, { status: 500 });
  }
}
