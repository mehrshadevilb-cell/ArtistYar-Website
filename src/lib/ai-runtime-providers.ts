import { createClient } from "@supabase/supabase-js";
import { decryptProviderKey, encryptProviderKey } from "@/lib/ai-provider-crypto";
import { discoverModels, getConfiguredProviders, type AIProvider } from "@/lib/ai-providers";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

function normalizeBase(value: string) {
  return value.replace(/\/+$/, "").replace(/\/chat\/completions$/i, "").replace(/\/messages$/i, "");
}

export async function loadRuntimeProviders(): Promise<AIProvider[]> {
  if (!supabase) throw new Error("ai_runtime_storage_not_configured");
  const { data, error } = await supabase.from("admin_ai_providers")
    .select("id,name,enabled,metadata")
    .eq("enabled", true).order("id");
  if (error) throw error;
  const now = Date.now();
  const rows = [...(data || [])].sort((a: any, b: any) => Number(a?.metadata?.priority || 100) - Number(b?.metadata?.priority || 100) || String(a.id).localeCompare(String(b.id)));
  return rows.filter((r: any) => {
    const meta = r.metadata || {};
    return meta.apiKeyEncrypted && (!meta.cooldownUntil || new Date(meta.cooldownUntil).getTime() <= now);
  }).map((r: any) => {
    const meta = r.metadata || {};
    return {
      id: r.id, name: r.name, baseUrl: normalizeBase(meta.baseUrl || ""),
      modelsUrl: meta.modelsUrl || "/models", chatPath: meta.chatPath || "/chat/completions",
      apiKey: decryptProviderKey(meta.apiKeyEncrypted), modelsRequireAuth: true,
      authScheme: meta.authScheme || "bearer", chatStyle: meta.chatStyle || "openai",
      defaultModels: Array.isArray(meta.defaultModels) ? meta.defaultModels : [],
    } as AIProvider;
  }).filter((p: AIProvider) => p.baseUrl && p.apiKey);
}

export async function bootstrapRuntimeProvidersFromEnv(): Promise<number> {
  if (!supabase) throw new Error("ai_runtime_storage_not_configured");
  const existing = await supabase.from("admin_ai_providers").select("id,metadata");
  if (existing.error) throw existing.error;
  if ((existing.data || []).some((r: any) => r?.metadata?.apiKeyEncrypted)) return 0;

  const envProviders = getConfiguredProviders().filter((p) => p.apiKey && p.id !== "rahyar-gateway");
  if (!envProviders.length) return 0;
  const existingById = new Map((existing.data || []).map((r: any) => [r.id, r]));
  const rows = envProviders.map((p, index) => ({
    id: p.id,
    name: p.name,
    enabled: true,
    metadata: {
      ...(existingById.get(p.id)?.metadata || {}),
      baseUrl: normalizeBase(p.baseUrl),
      apiKeyEncrypted: encryptProviderKey(p.apiKey || ""),
      providerType: p.chatStyle,
      priority: index + 10,
      modelsUrl: p.modelsUrl,
      chatPath: p.chatPath,
      authScheme: p.authScheme,
      chatStyle: p.chatStyle,
      defaultModels: p.defaultModels || [],
    },
  }));
  const { error } = await supabase.from("admin_ai_providers").upsert(rows, { onConflict: "id" });
  if (error) throw error;
  return rows.length;
}

export async function getRuntimeProviderPool(): Promise<AIProvider[]> {
  let providers: AIProvider[] = [];
  try { providers = await loadRuntimeProviders(); } catch {}
  if (!providers.length) {
    await bootstrapRuntimeProvidersFromEnv();
    providers = await loadRuntimeProviders();
  }
  const enriched = await Promise.all(providers.map(async (provider) => {
    try {
      const live = await discoverModels(provider);
      const merged = [...new Set([...(provider.defaultModels || []), ...live.map((m) => m.id)])].slice(0, 8);
      return { ...provider, defaultModels: merged };
    } catch {
      return provider;
    }
  }));
  return enriched;
}
