import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  USER_SESSION_COOKIE,
  ADMIN_SESSION_COOKIE,
  verifyUserSession,
  verifyAdminSession,
} from "@/lib/server-admin-auth";
import {
  createGenerationJob,
  runGenerationJob,
  publicJobView,
} from "@/lib/music-generation/job-service";
import {
  chargeCredits,
  refundCredits,
  estimateGenerationCredits,
  getBalance,
} from "@/lib/music-generation/credits";
import type { GenerationSpec } from "@/lib/music-generation/types";
import { ecosystemDb, ownedProject, logProjectActivity } from "@/lib/user-ecosystem";
import { PERSIAN_ERROR_MESSAGES } from "@/lib/music-generation/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Long-running provider call
export const maxDuration = 120;

const rateMap = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;

function rateOk(userId: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(userId);
  if (!entry || entry.resetAt <= now) {
    rateMap.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_PER_WINDOW;
}

async function resolveUser(): Promise<{ id: string; username: string } | null> {
  const store = await cookies();
  const admin = verifyAdminSession(store.get(ADMIN_SESSION_COOKIE)?.value);
  if (admin) return { id: `admin:${admin.username}`, username: admin.username };
  const session = verifyUserSession(store.get(USER_SESSION_COOKIE)?.value);
  if (!session) return null;
  return { id: session.id, username: session.username };
}

export async function POST(request: Request) {
  const user = await resolveUser();
  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        code: "Unauthorized",
        error: "برای تولید موسیقی ابتدا وارد شوید.",
        loginUrl: "/login",
      },
      { status: 401 },
    );
  }
  if (!rateOk(user.id)) {
    return NextResponse.json(
      { ok: false, error: "تعداد درخواست‌ها زیاد است. کمی صبر کنید.", code: "RateLimited" },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const prompt = String(body.prompt || "").trim();
  const projectId = typeof body.projectId === "string" ? body.projectId.trim().slice(0, 80) : "";
  if (!prompt || prompt.length < 3) {
    return NextResponse.json({ ok: false, error: "توضیح درخواست موسیقی را بنویسید." }, { status: 400 });
  }

  const partialSpec: Partial<GenerationSpec> = {};
  if (body.bpm != null && Number.isFinite(Number(body.bpm))) partialSpec.bpm = Number(body.bpm);
  if (body.bars != null && Number.isFinite(Number(body.bars))) partialSpec.bars = Number(body.bars);
  if (typeof body.key === "string" && body.key.trim()) partialSpec.key = body.key.trim().slice(0, 12);
  if (typeof body.instrument === "string") partialSpec.instrument = body.instrument as GenerationSpec["instrument"];
  if (typeof body.assetType === "string") partialSpec.assetType = body.assetType as GenerationSpec["assetType"];
  if (typeof body.meter === "string") partialSpec.meter = body.meter.slice(0, 8);

  const idempotencyKey =
    typeof body.idempotencyKey === "string"
      ? body.idempotencyKey.trim().slice(0, 120)
      : `gen:${user.id}:${Date.now()}`;

  try {
    const creditCost = estimateGenerationCredits(
      partialSpec.bars && partialSpec.bpm
        ? Math.round((partialSpec.bars * 4 * 60_000) / partialSpec.bpm)
        : undefined,
    );

    const charge = await chargeCredits({
      userId: user.id,
      amount: creditCost,
      idempotencyKey: `charge:${idempotencyKey}`,
    });
    if (!charge.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: "InsufficientCredits",
          error: PERSIAN_ERROR_MESSAGES.InsufficientCredits,
          balance: charge.balance,
        },
        { status: 402 },
      );
    }

    if (projectId && !user.id.startsWith("admin:")) {
      const project = await ownedProject(user.id, projectId);
      if (!project) return NextResponse.json({ ok: false, error: "پروژه انتخاب‌شده معتبر نیست." }, { status: 404 });
    }

    const job = await createGenerationJob({
      userId: user.id,
      prompt,
      partialSpec,
      idempotencyKey,
    });

    const finished = await runGenerationJob(job.id);

    if (finished.status === "failed" || finished.status === "cancelled") {
      await refundCredits({
        userId: user.id,
        amount: charge.charged,
        jobId: job.id,
        idempotencyKey: `refund:${idempotencyKey}`,
      });
    }

    const balance = await getBalance(user.id);
    const view = publicJobView(finished);
    if (projectId && !user.id.startsWith("admin:") && finished.status === "completed" && ecosystemDb) {
      try {
        const inserted = await ecosystemDb.from("artistyar_project_generations").insert({ project_id: projectId, user_id: user.id, generation_id: job.id, prompt, output_url: view.outputUrl || null, payload: { spec: view.spec || null, status: view.status } }).select("id").single();
        if (!inserted.error) await logProjectActivity({ userId: user.id, projectId, eventType: "ai_generation_attached", entityType: "generation", entityId: inserted.data?.id, payload: { generationId: job.id } });
      } catch { /* generated output remains valid if project persistence is unavailable */ }
    }

    // Always 200 with job payload so UI can show status + errorMessage
    return NextResponse.json(
      {
        ok: finished.status === "completed",
        job: view,
        credits: { charged: charge.charged, balance },
        error:
          finished.status !== "completed"
            ? finished.errorMessage || PERSIAN_ERROR_MESSAGES.InternalError
            : undefined,
        code: finished.errorCode,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "internal";
    if (msg.includes("supabase_not_configured")) {
      return NextResponse.json(
        { ok: false, error: "ذخیره‌سازی هنوز پیکربندی نشده است." },
        { status: 503 },
      );
    }
    console.error("[music/generate]", msg);
    return NextResponse.json(
      { ok: false, error: "خطا در ایجاد درخواست تولید.", detail: msg.slice(0, 240) },
      { status: 500 },
    );
  }
}
