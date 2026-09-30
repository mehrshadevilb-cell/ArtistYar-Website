import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
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
export const maxDuration = 120;

async function resolveUser(): Promise<{ id: string } | null> {
  const store = await cookies();
  const admin = verifyAdminSession(store.get(ADMIN_SESSION_COOKIE)?.value);
  if (admin) return { id: `admin:${admin.username}` };
  const session = verifyUserSession(store.get(USER_SESSION_COOKIE)?.value);
  if (!session) return null;
  return { id: session.id };
}

/**
 * Durable variation identity.
 * Prefer caller body.idempotencyKey so retries share one charge + one job.
 * Without a caller key each attempt is a new variation (randomUUID) — never Date.now().
 * Do not hash parent+hint alone: identical hints are allowed as independent variations
 * when the client intentionally omits a shared key.
 */
function resolveVariationIdempotencyKey(
  body: Record<string, unknown>,
  parentId: string,
  userId: string,
): string {
  if (typeof body.idempotencyKey === "string") {
    const key = body.idempotencyKey.trim().slice(0, 120);
    if (key.length >= 8) return key;
  }
  return `var:${parentId}:${userId}:${randomUUID()}`;
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const hint = String(body.hint || body.prompt || "").trim().slice(0, 500);

  let chargedAmount = 0;
  let idempotencyKey = "";

  try {
    const parent = await getJob(id, user.id);
    if (!parent) return NextResponse.json({ ok: false, error: "یافت نشد." }, { status: 404 });
    if (parent.status !== "completed") {
      return NextResponse.json(
        { ok: false, error: "فقط روی خروجی کامل‌شده می‌توان variation ساخت." },
        { status: 422 },
      );
    }

    const baseSpec = { ...parent.spec } as GenerationSpec;
    const newPrompt = hint
      ? `${parent.prompt}\n\nVariation: ${hint}`
      : `${parent.prompt} (variation)`;
    if (hint) {
      baseSpec.extraHints = [...(baseSpec.extraHints || []), hint];
      baseSpec.prompt = newPrompt;
    }

    idempotencyKey = resolveVariationIdempotencyKey(body, id, user.id);
    const cost = estimateGenerationCredits(baseSpec.durationMs);
    const charge = await chargeCredits({
      userId: user.id,
      amount: cost,
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
    chargedAmount = charge.charged;

    const job = await createGenerationJob({
      userId: user.id,
      prompt: newPrompt,
      partialSpec: baseSpec,
      idempotencyKey,
    });

    // Link lineage (best-effort; job already exists)
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

    const finished =
      job.status === "completed" ||
      job.status === "failed" ||
      job.status === "cancelled" ||
      job.status === "expired"
        ? job
        : await runGenerationJob(job.id);

    if (finished.status === "failed" || finished.status === "cancelled") {
      await refundCredits({
        userId: user.id,
        amount: chargedAmount,
        jobId: job.id,
        idempotencyKey: `refund:${idempotencyKey}`,
      });
    }

    return NextResponse.json({
      ok: finished.status === "completed",
      job: publicJobView(finished),
      credits: { charged: chargedAmount, balance: await getBalance(user.id) },
      error:
        finished.status !== "completed"
          ? finished.errorMessage || PERSIAN_ERROR_MESSAGES.InternalError
          : undefined,
      code: finished.errorCode,
    });
  } catch (err) {
    if (chargedAmount > 0 && idempotencyKey) {
      try {
        await refundCredits({
          userId: user.id,
          amount: chargedAmount,
          idempotencyKey: `refund:${idempotencyKey}:abort`,
        });
      } catch (refundErr) {
        console.error(
          "[music/variation] refund_after_failure",
          refundErr instanceof Error ? refundErr.message : String(refundErr),
        );
      }
    }
    console.error("[music/variation]", err);
    return NextResponse.json({ ok: false, error: "variation ناموفق بود." }, { status: 500 });
  }
}
