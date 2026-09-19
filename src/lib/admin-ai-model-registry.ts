import { createClient } from "@supabase/supabase-js";
import { discoverAllModels } from "@/lib/ai-providers";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

export type AdminAiModel = {
  id: string; provider_id: string; model_id: string; display_name: string | null;
  enabled: boolean; priority: number; preferred: boolean; capabilities: Record<string, boolean>;
  status: string; last_validated_at: string | null;
};

function db() { if (!supabase) throw new Error("admin_ai_storage_not_configured"); return supabase; }

export async function syncAdminAiModels() {
  const discovered = await discoverAllModels();
  const rows = discovered.flatMap((entry) => entry.models.map((model) => ({
    provider_id: entry.provider.id,
    model_id: model.id,
    display_name: model.id,
    capabilities: { chat: true },
    enabled: false,
    status: "discovered",
    updated_at: new Date().toISOString(),
  })));
  if (!rows.length) return [];
  const result = await db().from("admin_ai_model_registry").upsert(rows, { onConflict: "provider_id,model_id", ignoreDuplicates: false });
  if (result.error) throw result.error;
  return listAdminAiModels();
}

export async function listAdminAiModels() {
  const result = await db().from("admin_ai_model_registry").select("id,provider_id,model_id,display_name,enabled,priority,preferred,capabilities,status,last_validated_at").order("priority", { ascending: false }).order("provider_id", { ascending: true });
  if (result.error) throw result.error;
  return (result.data || []) as AdminAiModel[];
}

export async function listAdminAiRoutingCandidates() {
  const result = await db().from("admin_ai_model_registry").select("provider_id,model_id,priority,preferred").eq("enabled", true).eq("status", "enabled").order("preferred", { ascending: false }).order("priority", { ascending: false });
  if (result.error) throw result.error;
  return result.data || [];
}

export async function getAdminAiRoutingPreference() {
  const result = await db().from("admin_ai_model_registry").select("provider_id,model_id").eq("enabled", true).eq("status", "enabled").order("preferred", { ascending: false }).order("priority", { ascending: false }).limit(1).maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}

export async function updateAdminAiModel(id: string, patch: Partial<Pick<AdminAiModel, "enabled" | "priority" | "preferred" | "status">>) {
  const result = await db().from("admin_ai_model_registry").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).select("id,provider_id,model_id,display_name,enabled,priority,preferred,capabilities,status,last_validated_at").maybeSingle();
  if (result.error) throw result.error;
  return result.data as AdminAiModel | null;
}