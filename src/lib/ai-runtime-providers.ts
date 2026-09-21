import { createClient } from "@supabase/supabase-js";
import { decryptProviderKey, encryptProviderKey } from "@/lib/ai-provider-crypto";
import { getConfiguredProviders, type AIProvider } from "@/lib/ai-providers";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

function normalizeBase(value: string) {
  return value.replace(/\/+$/, "").replace(/\/chat\/completions$/i, "").replace(/\/messages$/i, "");
}

export async function loadRuntimeProviders(): Promise<AIProvider[]> {
  if (!supabase) throw new Error("ai_runtime_storage_not_configured");
  const { data, error } = await supabase.from("admin_ai_providers")
    .select("id,name,enabled,metadata,base_url,api_key_encrypted,provider_type,priority,cooldown_until")
    .eq("enabled", true).order("priority", { ascending: true }).order("id");
  if (error) throw error;
  const rows = data || [];
  const now = Date.now();
  return rows.filter((r: any) => r.api_key_encrypted && (!r.cooldown_until || new Date(r.cooldown_until).getTime() <= now)).map((r: any) => {
    const meta = r.metadata || {};
    return {
      id: r.id, name: r.name, baseUrl: normalizeBase(r.base_url || meta.baseUrl || ""),
      modelsUrl: meta.modelsUrl || "/models", chatPath: meta.chatPath || "/chat/completions",
      apiKey: decryptProviderKey(r.api_key_encrypted), modelsRequireAuth: true,
      authScheme: meta.authScheme || "bearer", chatStyle: meta.chatStyle || "openai",
      defaultModels: Array.isArray(meta.defaultModels) ? meta.defaultModels : [],
    } as AIProvider;
  }).filter((p: AIProvider) => p.baseUrl && p.apiKey);
}

export async function bootstrapRuntimeProvidersFromEnv(): Promise<number> {
  if (!supabase) throw new Error("ai_runtime_storage_not_configured");
  const existing = await supabase.from("admin_ai_providers").select("id").limit(1);
  if (existing.error) throw existing.error;
  if ((existing.data || []).length) return 0;
  const envProviders = getConfiguredProviders().filter((p) => p.apiKey && p.id !== "rahyar-gateway");
  if (!envProviders.length) return 0;
  const rows = envProviders.map((p, index) => ({
    id: p.id, name: p.name, enabled: true, base_url: normalizeBase(p.baseUrl),
    api_key_encrypted: encryptProviderKey(p.apiKey || ""), provider_type: p.chatStyle,
    priority: index + 10,
    metadata: { modelsUrl: p.modelsUrl, chatPath: p.chatPath, authScheme: p.authScheme, chatStyle: p.chatStyle, defaultModels: p.defaultModels || [] },
  }));
  const { error } = await supabase.from("admin_ai_providers").upsert(rows, { onConflict: "id" });
  if (error) throw error;
  return rows.length;
}

export async function getRuntimeProviderPool(): Promise<AIProvider[]> {
  try {
    const providers = await loadRuntimeProviders();
    if (providers.length) return providers;
  } catch {}
  await bootstrapRuntimeProvidersFromEnv();
  return loadRuntimeProviders();
}
