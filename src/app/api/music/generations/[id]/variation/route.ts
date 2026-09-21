import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  USER_SESSION_COOKIE,
  ADMIN_SESSION_COOKIE,
  verifyUserSession,
  verifyAdminSession,
} from "@/lib/server-admin-auth";
import {
  getJob,
  createGenerationJob,
  runGenerationJob,
  publicJobView,
} from "@/lib/music-generation/job-service";
import { chargeCredits, refundCredits, estimateGenerationCredits, getBalance } from "@/lib/music-generation/credits";
import { PERSIAN_ERROR_MESSAGES } from "@/lib/music-generation/types";
import type { GenerationSpec } from "@/lib/music-generation/types";
import { createClient } from "@supabase/supabase-js";

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

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const hint = String(body.hint || body.prompt || "").trim().slice(0, 500);

  try {
    const parent = await getJob(id, user.id);
    if (!parent) return NextResponse.json({ ok: false, error: "یافت نشد." }, { status: 404 });
    if (parent.status !== "completed") {
      return NextResponse.json({ ok: false, error: "فقط روی خروجی کامل‌شده می‌توان variation ساخت." }, { status: 422 });
    }

    const baseSpec = { ...parent.spec } as GenerationSpec;
    const newPrompt = hint
      ? `${parent.prompt}\n\nVariation: ${hint}`
      : `${parent.prompt} (variation)`;
    if (hint) {
      baseSpec.extraHints = [...(baseSpec.extraHints || []), hint];
      baseSpec.prompt = newPrompt;
    }

    const idempotencyKey = `var:${id}:${hint.slice(0, 40)}:${Date.now()}`;
    const cost = estimateGenerationCredits(baseSpec.durationMs);
    const charge = await chargeCredits({
      userId: user.id,
      amount: cost,
      idempotencyKey: `charge:${idempotencyKey}`,
    });
    if (!charge.ok) {
      return NextResponse.json(
        { ok: false, code: "InsufficientCredits", error: PERSIAN_ERROR_MESSAGES.InsufficientCredits, balance: charge.balance },
        { status: 402 },
      );
    }

    const job = await createGenerationJob({
      userId: user.id,
      prompt: newPrompt,
      partialSpec: baseSpec,
      idempotencyKey,
    });

    // Link lineage
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (url && secret) {
      const db = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
      await db
        .from("ai_music_generation_jobs")
        .update({
          parent_job_id: parent.id,
          variation_of_id: parent.id,
          lineage_root_id: parent.lineageRootId || parent.id,
        })
        .eq("id", job.id);
    }

    const finished = await runGenerationJob(job.id);
    if (finished.status === "failed") {
      await refundCredits({
        userId: user.id,
        amount: charge.charged,
        jobId: job.id,
        idempotencyKey: `refund:${idempotencyKey}`,
      });
    }

    return NextResponse.json({
      ok: true,
      job: publicJobView(finished),
      credits: { charged: charge.charged, balance: await getBalance(user.id) },
    });
  } catch (err) {
    console.error("[music/variation]", err);
    return NextResponse.json({ ok: false, error: "variation ناموفق بود." }, { status: 500 });
  }
}
