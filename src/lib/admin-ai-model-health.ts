import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

function db() {
  if (!supabase) throw new Error("admin_ai_storage_not_configured");
  return supabase;
}

function sanitizeProviderError(error: unknown): string {
  return String(error instanceof Error ? error.message : error)
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/(?:api[_-]?key|token|secret|password)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, "sk-[redacted]")
    .slice(0, 1000);
}

export type AdminAiHealth = {
  provider_id: string;
  model_id: string;
  consecutive_failures: number;
  success_count: number;
  failure_count: number;
  cooldown_until: string | null;
  last_error: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
};

export async function listHealthyAdminAiModels(models: Array<{ provider_id: string; model_id: string }>) {
  if (!models.length) return models;
  const result = await db().from("admin_ai_model_health")
    .select("provider_id,model_id,consecutive_failures,success_count,failure_count,cooldown_until,last_error,last_success_at,last_failure_at")
    .in("provider_id", [...new Set(models.map((m) => m.provider_id))]);
  if (result.error) throw result.error;
  const now = Date.now();
  const cooling = new Set((result.data || [])
    .filter((h) => h.cooldown_until && new Date(h.cooldown_until).getTime() > now)
    .map((h) => h.provider_id + "::" + h.model_id));
  return models.filter((m) => !cooling.has(m.provider_id + "::" + m.model_id));
}

export async function recordAdminAiModelSuccess(providerId: string, modelId: string) {
  const now = new Date().toISOString();
  const existing = await db().from("admin_ai_model_health").select("success_count").eq("provider_id", providerId).eq("model_id", modelId).maybeSingle();
  if (existing.error) throw existing.error;
  const result = await db().from("admin_ai_model_health").upsert({
    provider_id: providerId, model_id: modelId, consecutive_failures: 0,
    success_count: (existing.data?.success_count || 0) + 1, last_success_at: now, cooldown_until: null, last_error: null, updated_at: now
  }, { onConflict: "provider_id,model_id" });
  if (result.error) throw result.error;
}

export async function recordAdminAiModelFailure(providerId: string, modelId: string, error: unknown) {
  const now = new Date();
  const message = sanitizeProviderError(error);
  const existing = await db().from("admin_ai_model_health").select("consecutive_failures,failure_count")
    .eq("provider_id", providerId).eq("model_id", modelId).maybeSingle();
  if (existing.error) throw existing.error;
  const consecutive = (existing.data?.consecutive_failures || 0) + 1;
  const failures = (existing.data?.failure_count || 0) + 1;
  const cooldownMs = consecutive >= 3 ? 5 * 60_000 : consecutive >= 2 ? 60_000 : 0;
  const result = await db().from("admin_ai_model_health").upsert({
    provider_id: providerId, model_id: modelId, consecutive_failures: consecutive,
    failure_count: failures, cooldown_until: cooldownMs ? new Date(now.getTime() + cooldownMs).toISOString() : null,
    last_error: message, last_failure_at: now.toISOString(), updated_at: now.toISOString()
  }, { onConflict: "provider_id,model_id" });
  if (result.error) throw result.error;
}
