/**
 * Credits accounting for User AI Music Generator.
 * Free: 3 generates without subscription (MUSIC_GEN_FREE_CREDITS default 3).
 * Paid: purchase grants more credits (reason=purchase).
 *
 * Charge/refund prefer atomic Postgres RPCs (charge_ai_music_credits /
 * refund_ai_music_credits) so balance + ledger move in one transaction.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function db(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !secret) throw new Error("supabase_not_configured");
  return createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Users without subscription get this many free generation credits. */
const FREE_GRANT_ON_FIRST_TOUCH = Number(process.env.MUSIC_GEN_FREE_CREDITS || "3");

export async function ensureCreditAccount(userId: string): Promise<{ balance: number }> {
  const client = db();
  const existing = await client
    .from("ai_music_generation_credits")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing.data) return { balance: Number(existing.data.balance) || 0 };

  const grantKey = `grant:welcome:${userId}`;
  const inserted = await client
    .from("ai_music_generation_credits")
    .insert({
      user_id: userId,
      balance: FREE_GRANT_ON_FIRST_TOUCH,
      lifetime_granted: FREE_GRANT_ON_FIRST_TOUCH,
      lifetime_spent: 0,
    })
    .select("balance")
    .single();

  if (inserted.error) {
    const again = await client
      .from("ai_music_generation_credits")
      .select("balance")
      .eq("user_id", userId)
      .single();
    if (again.error) throw new Error(again.error.message);
    return { balance: Number(again.data.balance) || 0 };
  }

  if (FREE_GRANT_ON_FIRST_TOUCH > 0) {
    await client.from("ai_music_generation_credit_ledger").upsert(
      {
        user_id: userId,
        delta: FREE_GRANT_ON_FIRST_TOUCH,
        reason: "grant",
        balance_after: FREE_GRANT_ON_FIRST_TOUCH,
        idempotency_key: grantKey,
      },
      { onConflict: "user_id,idempotency_key", ignoreDuplicates: true },
    );
  }

  return { balance: FREE_GRANT_ON_FIRST_TOUCH };
}

export async function getBalance(userId: string): Promise<number> {
  const { balance } = await ensureCreditAccount(userId);
  return balance;
}

export async function chargeCredits(input: {
  userId: string;
  amount: number;
  jobId?: string;
  idempotencyKey: string;
}): Promise<{ ok: boolean; balance: number; charged: number; reason?: string }> {
  const amount = Math.max(0, Number(input.amount) || 0);
  if (amount === 0) {
    const bal = await getBalance(input.userId);
    return { ok: true, balance: bal, charged: 0 };
  }

  const client = db();
  await ensureCreditAccount(input.userId);

  const { data, error } = await client.rpc("charge_ai_music_credits", {
    p_user_id: input.userId,
    p_amount: amount,
    p_idempotency_key: input.idempotencyKey,
    p_job_id: input.jobId || null,
  });

  if (error) {
    throw new Error(`charge_ai_music_credits_failed: ${error.message}`);
  }

  const row = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const ok = Boolean(row.ok);
  return {
    ok,
    balance: Number(row.balance) || 0,
    charged: Number(row.charged) || 0,
    reason: row.reason ? String(row.reason) : undefined,
  };
}

export async function refundCredits(input: {
  userId: string;
  amount: number;
  jobId?: string;
  idempotencyKey: string;
}): Promise<{ ok: boolean; balance: number }> {
  const amount = Math.max(0, Number(input.amount) || 0);
  const client = db();
  await ensureCreditAccount(input.userId);

  const { data, error } = await client.rpc("refund_ai_music_credits", {
    p_user_id: input.userId,
    p_amount: amount,
    p_idempotency_key: input.idempotencyKey,
    p_job_id: input.jobId || null,
  });

  if (error) {
    throw new Error(`refund_ai_music_credits_failed: ${error.message}`);
  }

  const row = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  return {
    ok: Boolean(row.ok),
    balance: Number(row.balance) || 0,
  };
}

/** Grant credits after payment (idempotent by paymentId). */
export async function grantPurchaseCredits(input: {
  userId: string;
  amount: number;
  paymentId: string;
}): Promise<{ ok: boolean; balance: number }> {
  const amount = Math.max(0, Math.floor(Number(input.amount) || 0));
  if (amount <= 0) return { ok: false, balance: await getBalance(input.userId) };

  const client = db();
  await ensureCreditAccount(input.userId);
  const idempotencyKey = `purchase:${input.paymentId}`;

  const prior = await client
    .from("ai_music_generation_credit_ledger")
    .select("id, balance_after")
    .eq("user_id", input.userId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (prior.data) {
    return { ok: true, balance: Number(prior.data.balance_after) || 0 };
  }

  const current = await client
    .from("ai_music_generation_credits")
    .select("balance, lifetime_granted")
    .eq("user_id", input.userId)
    .single();
  if (current.error) throw new Error(current.error.message);

  const balance = Number(current.data.balance) || 0;
  const next = balance + amount;
  const lifetimeGranted = (Number(current.data.lifetime_granted) || 0) + amount;

  await client
    .from("ai_music_generation_credits")
    .update({
      balance: next,
      lifetime_granted: lifetimeGranted,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", input.userId);

  await client.from("ai_music_generation_credit_ledger").insert({
    user_id: input.userId,
    delta: amount,
    reason: "purchase",
    balance_after: next,
    idempotency_key: idempotencyKey,
  });

  return { ok: true, balance: next };
}

/** 1 credit ≈ 1 short generation; longer clips cost more. */
export function estimateGenerationCredits(durationMs?: number): number {
  if (!durationMs || durationMs <= 15_000) return 1;
  if (durationMs <= 45_000) return 2;
  return 3;
}

export const FREE_GENERATION_CREDITS = FREE_GRANT_ON_FIRST_TOUCH;
