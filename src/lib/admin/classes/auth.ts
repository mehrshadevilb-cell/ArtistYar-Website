import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";

export async function requireAdmin(): Promise<
  { ok: true; username: string } | { ok: false; response: NextResponse }
> {
  const session = verifyAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { ok: true, username: session.username };
}

export function errorResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : "error";
  const map: Record<string, number> = {
    unauthorized: 401,
    supabase_not_configured: 503,
    class_not_found: 404,
    session_not_found: 404,
    enrollment_not_found: 404,
    title_required: 400,
    class_full: 409,
    duplicate_enrollment: 409,
    duplicate_session: 409,
    session_overlap: 409,
    class_unavailable: 409,
    invalid_session_transition: 409,
    attendance_finalized: 409,
    end_before_start: 400,
    invalid_session_time: 400,
    invalid_date_range: 400,
    weekdays_required: 400,
    invalid_duration: 400,
    invalid_start_time: 400,
  };
  const status = map[msg] || 500;
  return NextResponse.json({ error: msg }, { status });
}
