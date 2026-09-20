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

function db() {
  if (!supabase) throw new Error("admin_ai_storage_not_configured");
  return supabase;
}

function priorityForModel(modelId: string): number {
  const lower = modelId.toLowerCase();
  if (/gpt-4o(?!-mini)|gpt-4\.1(?!-)|claude-sonnet|gemini-2\.5-pro|o3|o4/.test(lower)) return 100;
  if (/gpt-4o-mini|gpt-4\.1-mini|claude-3-5|gemini-2\.5-flash|gemini-2\.0|deepseek|llama-3\.3|70b/.test(lower)) return 90;
  if (/flash|mini|haiku|nano|lite|small|8b/.test(lower)) return 70;
  if (/gpt|claude|gemini|llama|qwen|kimi|deepseek/.test(lower)) return 80;
  return 50;
}

export async function syncAdminAiModels(options: { autoEnable?: boolean } = {}) {
  const autoEnable = options.autoEnable !== false;
  const discovered = await discoverAllModels();
  const rows = discovered.flatMap((entry) =>
    entry.models.map((model) => ({
      provider_id: entry.provider.id,
      model_id: model.id,
      display_name: model.id,
      capabilities: { chat: true },
      priority: priorityForModel(model.id),
      // Auto-enable so Admin AI can route without manual UI steps.
      ...(autoEnable
        ? {
            enabled: true,
            status: "enabled",
            preferred: false,
            last_validated_at: new Date().toISOString(),
          }
        : {}),
      updated_at: new Date().toISOString(),
    })),
  );
  if (!rows.length) return [];
  const result = await db()
    .from("admin_ai_model_registry")
    .upsert(rows, { onConflict: "provider_id,model_id", ignoreDuplicates: false });
  if (result.error) throw result.error;
  return listAdminAiModels();
}

export async function listAdminAiModels() {
  const result = await db()
    .from("admin_ai_model_registry")
    .select("id,provider_id,model_id,display_name,enabled,priority,preferred,capabilities,status,last_validated_at")
    .order("priority", { ascending: false })
    .order("provider_id", { ascending: true });
  if (result.error) throw result.error;
  return (result.data || []) as AdminAiModel[];
}

export async function listAdminAiRoutingCandidates() {
  const result = await db()
    .from("admin_ai_model_registry")
    .select("provider_id,model_id,priority,preferred")
    .eq("enabled", true)
    .eq("status", "enabled")
    .order("preferred", { ascending: false })
    .order("priority", { ascending: false });
  if (result.error) throw result.error;
  const rows = result.data || [];
  if (rows.length) return rows;

  // First-run bootstrap: discover providers and enable all chat models automatically.
  try {
    await syncAdminAiModels({ autoEnable: true });
  } catch (error) {
    console.error("admin ai model auto-sync failed", error instanceof Error ? error.message : "unknown");
    return [];
  }

  const after = await db()
    .from("admin_ai_model_registry")
    .select("provider_id,model_id,priority,preferred")
    .eq("enabled", true)
    .eq("status", "enabled")
    .order("preferred", { ascending: false })
    .order("priority", { ascending: false });
  if (after.error) throw after.error;
  return after.data || [];
}

export async function getAdminAiRoutingPreference() {
  const candidates = await listAdminAiRoutingCandidates();
  return candidates[0] || null;
}

export async function validateAdminAiModel(id: string) {
  const current = await db().from("admin_ai_model_registry").select("id,provider_id,model_id").eq("id", id).maybeSingle();
  if (current.error) throw current.error;
  const currentModel = current.data;
  if (!currentModel) return null;
  const discovered = await discoverAllModels({ allowFallback: false });
  const provider = discovered.find((entry) => entry.provider.id === currentModel.provider_id);
  const valid = Boolean(provider?.models.some((model) => model.id === currentModel.model_id));
  const result = await db()
    .from("admin_ai_model_registry")
    .update({
      status: valid ? "registered" : "disabled",
      enabled: false,
      preferred: false,
      last_validated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id,provider_id,model_id,display_name,enabled,priority,preferred,capabilities,status,last_validated_at")
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data as AdminAiModel | null;
}

export async function updateAdminAiModel(
  id: string,
  patch: Partial<Pick<AdminAiModel, "enabled" | "priority" | "preferred" | "status">>,
) {
  const current = await db().from("admin_ai_model_registry").select("id,status,enabled,preferred").eq("id", id).maybeSingle();
  if (current.error) throw current.error;
  if (!current.data) return null;
  if ((patch.enabled === true || patch.status === "enabled") && current.data.status !== "registered" && current.data.status !== "enabled") {
    throw new Error("admin_ai_model_must_be_validated_first");
  }
  if (patch.enabled === false && patch.status === "enabled") {
    throw new Error("admin_ai_enabled_status_conflicts_with_disabled");
  }
  if (patch.preferred === true && patch.enabled === false) throw new Error("admin_ai_preferred_model_must_be_enabled");
  if (patch.preferred === true && patch.enabled === undefined && current.data.enabled !== true) {
    throw new Error("admin_ai_preferred_model_must_be_enabled");
  }

  const update = { ...patch, updated_at: new Date().toISOString() } as Record<string, unknown>;
  if (patch.enabled === true) update.status = "enabled";
  if (patch.enabled === false) {
    update.status = "disabled";
    update.preferred = false;
  } else if (patch.status === "enabled") {
    update.enabled = true;
  } else if (patch.status === "disabled" || patch.status === "deprecated") {
    update.enabled = false;
    update.preferred = false;
  }

  const result = await db()
    .from("admin_ai_model_registry")
    .update(update)
    .eq("id", id)
    .select("id,provider_id,model_id,display_name,enabled,priority,preferred,capabilities,status,last_validated_at")
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data as AdminAiModel | null;
}
