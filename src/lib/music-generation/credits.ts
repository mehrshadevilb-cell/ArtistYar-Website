/**
 * Credits accounting for User AI Music Generator.
 * Idempotent charge/refund — retries must not double-charge.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function db(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !secret) throw new Error("supabase_not_configured");
  return createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
}

const FREE_GRANT_ON_FIRST_TOUCH = Number(process.env.MUSIC_GEN_FREE_CREDITS || "10");

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
    // race: another request created the row
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

/**
 * Charge credits. Same idempotencyKey → no double charge.
 * Returns { ok, balance, charged }.
 */
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

  // Already applied?
  const prior = await client
    .from("ai_music_generation_credit_ledger")
    .select("id, balance_after, delta")
    .eq("user_id", input.userId)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (prior.data) {
    return {
      ok: true,
      balance: Number(prior.data.balance_after) || 0,
      charged: Math.abs(Number(prior.data.delta) || 0),
    };
  }

  const current = await client
    .from("ai_music_generation_credits")
    .select("balance, lifetime_spent")
    .eq("user_id", input.userId)
    .single();
  if (current.error) throw new Error(current.error.message);
  const balance = Number(current.data.balance) || 0;
  if (balance < amount) {
    return { ok: false, balance, charged: 0, reason: "InsufficientCredits" };
  }

  const next = balance - amount;
  const lifetimeSpent = (Number(current.data.lifetime_spent) || 0) + amount;
  const upd = await client
    .from("ai_music_generation_credits")
    .update({ balance: next, lifetime_spent: lifetimeSpent, updated_at: new Date().toISOString() })
    .eq("user_id", input.userId)
    .eq("balance", balance) // optimistic lock
    .select("balance")
    .maybeSingle();

  if (!upd.data) {
    // concurrent charge — retry once via re-read
    return chargeCredits(input);
  }

  await client.from("ai_music_generation_credit_ledger").insert({
    user_id: input.userId,
    job_id: input.jobId || null,
    delta: -amount,
    reason: "charge",
    balance_after: next,
    idempotency_key: input.idempotencyKey,
  });

  return { ok: true, balance: next, charged: amount };
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

  const prior = await client
    .from("ai_music_generation_credit_ledger")
    .select("id, balance_after")
    .eq("user_id", input.userId)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (prior.data) {
    return { ok: true, balance: Number(prior.data.balance_after) || 0 };
  }

  if (amount === 0) {
    return { ok: true, balance: await getBalance(input.userId) };
  }

  const current = await client
    .from("ai_music_generation_credits")
    .select("balance, lifetime_spent")
    .eq("user_id", input.userId)
    .single();
  if (current.error) throw new Error(current.error.message);
  const balance = Number(current.data.balance) || 0;
  const next = balance + amount;
  const lifetimeSpent = Math.max(0, (Number(current.data.lifetime_spent) || 0) - amount);

  await client
    .from("ai_music_generation_credits")
    .update({ balance: next, lifetime_spent: lifetimeSpent, updated_at: new Date().toISOString() })
    .eq("user_id", input.userId);

  await client.from("ai_music_generation_credit_ledger").insert({
    user_id: input.userId,
    job_id: input.jobId || null,
    delta: amount,
    reason: "refund",
    balance_after: next,
    idempotency_key: input.idempotencyKey,
  });

  return { ok: true, balance: next };
}

/** Default credit cost for a generation (can be tuned by duration/quality later). */
export function estimateGenerationCredits(durationMs?: number): number {
  if (!durationMs || durationMs <= 15_000) return 1;
  if (durationMs <= 45_000) return 2;
  return 3;
}
