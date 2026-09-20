import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  USER_SESSION_COOKIE,
  ADMIN_SESSION_COOKIE,
  verifyUserSession,
  verifyAdminSession,
} from "@/lib/server-admin-auth";
import { getJob, cancelJob, publicJobView, runGenerationJob } from "@/lib/music-generation/job-service";

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

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });

  try {
    let job = await getJob(id, user.id);
    if (!job) return NextResponse.json({ ok: false, error: "یافت نشد." }, { status: 404 });

    // Resume stuck queued jobs (e.g. previous request dropped)
    if (job.status === "queued") {
      job = await runGenerationJob(job.id);
    }

    return NextResponse.json(
      { ok: true, job: publicJobView(job) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    console.error("[music/generations GET]", err);
    return NextResponse.json({ ok: false, error: "خطا در دریافت وضعیت." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  try {
    const job = await cancelJob(id, user.id);
    if (!job) return NextResponse.json({ ok: false, error: "یافت نشد." }, { status: 404 });
    return NextResponse.json({ ok: true, job: publicJobView(job) });
  } catch (err) {
    console.error("[music/generations DELETE]", err);
    return NextResponse.json({ ok: false, error: "لغو ناموفق بود." }, { status: 500 });
  }
}
