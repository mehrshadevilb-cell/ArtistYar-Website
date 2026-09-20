import { createClient } from "@supabase/supabase-js";
import { estimateCostUsd } from "./admin-ai-platform";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

function db() {
  if (!supabase) throw new Error("admin_ai_storage_not_configured");
  return supabase;
}

export async function recordUsage(input: {
  adminUsername: string;
  feature: string;
  provider?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  metadata?: Record<string, unknown>;
}) {
  if (!supabase) return null;
  const inputTokens = Math.max(0, Number(input.inputTokens || 0));
  const outputTokens = Math.max(0, Number(input.outputTokens || 0));
  const cost = estimateCostUsd(inputTokens, outputTokens, input.model || "");
  const result = await db()
    .from("admin_ai_usage")
    .insert({
      admin_username: input.adminUsername,
      feature: input.feature.slice(0, 64),
      provider: input.provider || null,
      model: input.model || null,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: cost,
      metadata: input.metadata || {},
    })
    .select("id,cost_usd,created_at")
    .single();
  if (result.error) throw result.error;
  return result.data;
}

export async function usageSummary(adminUsername: string, days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const result = await db()
    .from("admin_ai_usage")
    .select("feature,provider,model,input_tokens,output_tokens,cost_usd,created_at")
    .eq("admin_username", adminUsername)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);
  if (result.error) throw result.error;
  const rows = result.data || [];
  const totalCost = rows.reduce((sum, r) => sum + Number(r.cost_usd || 0), 0);
  const totalIn = rows.reduce((sum, r) => sum + Number(r.input_tokens || 0), 0);
  const totalOut = rows.reduce((sum, r) => sum + Number(r.output_tokens || 0), 0);
  return { days, totalCost, totalIn, totalOut, count: rows.length, rows: rows.slice(0, 100) };
}
