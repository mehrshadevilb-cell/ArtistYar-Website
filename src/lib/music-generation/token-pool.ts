/**
 * Admin-managed music provider token pool.
 * Supports ElevenLabs-style and OpenAI-compatible music proxies.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type ProviderTokenRow = {
  id: string;
  label: string;
  provider_kind: "elevenlabs" | "openai_compat" | "custom";
  base_url: string;
  api_key: string;
  model_id: string | null;
  path: string | null;
  enabled: boolean;
  priority: number;
  credits_total: number | null;
  credits_remaining: number | null;
  request_count: number;
  success_count: number;
  fail_count: number;
  last_used_at: string | null;
  last_error: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function db(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !secret) throw new Error("supabase_not_configured");
  return createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

export function publicTokenView(row: ProviderTokenRow) {
  return {
    id: row.id,
    label: row.label,
    providerKind: row.provider_kind,
    baseUrl: row.base_url,
    apiKeyMasked: maskKey(row.api_key),
    modelId: row.model_id,
    path: row.path || "/music/generate",
    enabled: row.enabled,
    priority: row.priority,
    creditsTotal: row.credits_total,
    creditsRemaining: row.credits_remaining,
    requestCount: row.request_count,
    successCount: row.success_count,
    failCount: row.fail_count,
    lastUsedAt: row.last_used_at,
    lastError: row.last_error,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listProviderTokens(): Promise<ProviderTokenRow[]> {
  const client = db();
  const res = await client
    .from("ai_music_provider_tokens")
    .select("*")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });
  if (res.error) throw new Error(res.error.message);
  return (res.data || []) as ProviderTokenRow[];
}

/** Pick best enabled token (priority, remaining credits). */
export async function selectProviderToken(): Promise<ProviderTokenRow | null> {
  const all = await listProviderTokens();
  const enabled = all.filter((t) => t.enabled);
  if (!enabled.length) return null;
  enabled.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const ar = a.credits_remaining ?? Number.POSITIVE_INFINITY;
    const br = b.credits_remaining ?? Number.POSITIVE_INFINITY;
    return br - ar;
  });
  // Prefer tokens that still have remaining credits if tracked
  const withCredits = enabled.filter(
    (t) => t.credits_remaining == null || Number(t.credits_remaining) > 0,
  );
  return (withCredits[0] || enabled[0]) ?? null;
}

export async function createProviderToken(input: {
  label: string;
  providerKind?: ProviderTokenRow["provider_kind"];
  baseUrl: string;
  apiKey: string;
  modelId?: string;
  path?: string;
  priority?: number;
  creditsTotal?: number;
  notes?: string;
}): Promise<ProviderTokenRow> {
  const client = db();
  const baseUrl = input.baseUrl.trim().replace(/\/$/, "");
  const apiKey = input.apiKey.trim();
  if (!baseUrl || !apiKey) throw new Error("base_url_and_api_key_required");

  const total = input.creditsTotal != null ? Number(input.creditsTotal) : null;
  const inserted = await client
    .from("ai_music_provider_tokens")
    .insert({
      label: input.label.trim().slice(0, 120) || "token",
      provider_kind: input.providerKind || "openai_compat",
      base_url: baseUrl,
      api_key: apiKey,
      model_id: input.modelId?.trim() || null,
      path: input.path?.trim() || "/music/generate",
      enabled: true,
      priority: input.priority ?? 100,
      credits_total: total,
      credits_remaining: total,
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();
  if (inserted.error) throw new Error(inserted.error.message);
  return inserted.data as ProviderTokenRow;
}

export async function updateProviderToken(
  id: string,
  patch: Partial<{
    label: string;
    providerKind: ProviderTokenRow["provider_kind"];
    baseUrl: string;
    apiKey: string;
    modelId: string | null;
    path: string | null;
    enabled: boolean;
    priority: number;
    creditsTotal: number | null;
    creditsRemaining: number | null;
    notes: string | null;
  }>,
): Promise<ProviderTokenRow> {
  const client = db();
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.label != null) row.label = patch.label.trim().slice(0, 120);
  if (patch.providerKind != null) row.provider_kind = patch.providerKind;
  if (patch.baseUrl != null) row.base_url = patch.baseUrl.trim().replace(/\/$/, "");
  if (patch.apiKey != null && patch.apiKey.trim()) row.api_key = patch.apiKey.trim();
  if (patch.modelId !== undefined) row.model_id = patch.modelId;
  if (patch.path !== undefined) row.path = patch.path;
  if (patch.enabled != null) row.enabled = patch.enabled;
  if (patch.priority != null) row.priority = patch.priority;
  if (patch.creditsTotal !== undefined) row.credits_total = patch.creditsTotal;
  if (patch.creditsRemaining !== undefined) row.credits_remaining = patch.creditsRemaining;
  if (patch.notes !== undefined) row.notes = patch.notes;

  const res = await client.from("ai_music_provider_tokens").update(row).eq("id", id).select("*").single();
  if (res.error) throw new Error(res.error.message);
  return res.data as ProviderTokenRow;
}

export async function deleteProviderToken(id: string): Promise<void> {
  const client = db();
  const res = await client.from("ai_music_provider_tokens").delete().eq("id", id);
  if (res.error) throw new Error(res.error.message);
}

export async function recordTokenUsage(input: {
  tokenId: string;
  jobId?: string;
  userId?: string;
  success: boolean;
  creditsUsed?: number;
  latencyMs?: number;
  errorMessage?: string;
}): Promise<void> {
  const client = db();
  const creditsUsed = input.creditsUsed ?? 1;

  await client.from("ai_music_provider_token_usage").insert({
    token_id: input.tokenId,
    job_id: input.jobId || null,
    user_id: input.userId || null,
    success: input.success,
    credits_used: creditsUsed,
    latency_ms: input.latencyMs ?? null,
    error_message: input.errorMessage?.slice(0, 500) || null,
  });

  // Update aggregates
  const current = await client
    .from("ai_music_provider_tokens")
    .select("request_count, success_count, fail_count, credits_remaining")
    .eq("id", input.tokenId)
    .maybeSingle();

  if (!current.data) return;

  const nextRemaining =
    current.data.credits_remaining != null
      ? Math.max(0, Number(current.data.credits_remaining) - (input.success ? creditsUsed : 0))
      : null;

  await client
    .from("ai_music_provider_tokens")
    .update({
      request_count: (Number(current.data.request_count) || 0) + 1,
      success_count: (Number(current.data.success_count) || 0) + (input.success ? 1 : 0),
      fail_count: (Number(current.data.fail_count) || 0) + (input.success ? 0 : 1),
      credits_remaining: nextRemaining,
      last_used_at: new Date().toISOString(),
      last_error: input.success ? null : (input.errorMessage?.slice(0, 500) || "error"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.tokenId);
}

export async function listTokenUsage(opts?: {
  tokenId?: string;
  limit?: number;
}): Promise<
  Array<{
    id: string;
    token_id: string;
    job_id: string | null;
    user_id: string | null;
    success: boolean;
    credits_used: number;
    latency_ms: number | null;
    error_message: string | null;
    created_at: string;
  }>
> {
  const client = db();
  let q = client
    .from("ai_music_provider_token_usage")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 50);
  if (opts?.tokenId) q = q.eq("token_id", opts.tokenId);
  const res = await q;
  if (res.error) throw new Error(res.error.message);
  return (res.data || []) as Array<{
    id: string;
    token_id: string;
    job_id: string | null;
    user_id: string | null;
    success: boolean;
    credits_used: number;
    latency_ms: number | null;
    error_message: string | null;
    created_at: string;
  }>;
}

export async function usageSummary() {
  const tokens = await listProviderTokens();
  const totalRequests = tokens.reduce((s, t) => s + (Number(t.request_count) || 0), 0);
  const totalSuccess = tokens.reduce((s, t) => s + (Number(t.success_count) || 0), 0);
  const totalFail = tokens.reduce((s, t) => s + (Number(t.fail_count) || 0), 0);
  const creditsRemaining = tokens.reduce(
    (s, t) => s + (t.credits_remaining != null ? Number(t.credits_remaining) : 0),
    0,
  );
  const creditsTotal = tokens.reduce(
    (s, t) => s + (t.credits_total != null ? Number(t.credits_total) : 0),
    0,
  );
  return {
    tokenCount: tokens.length,
    enabledCount: tokens.filter((t) => t.enabled).length,
    totalRequests,
    totalSuccess,
    totalFail,
    creditsRemaining,
    creditsTotal,
    tokens: tokens.map(publicTokenView),
  };
}
