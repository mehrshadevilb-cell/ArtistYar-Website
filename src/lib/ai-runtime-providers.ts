import { createClient } from "@supabase/supabase-js";
import { decryptProviderKey, encryptProviderKey } from "@/lib/ai-provider-crypto";
import { discoverModels, getConfiguredProviders, type AIProvider } from "@/lib/ai-providers";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase =
  url && secret
    ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } })
    : null;

/** In-memory provider pool cache — avoids rediscovering models / hitting Supabase on every chat. */
const POOL_TTL_MS = 5 * 60 * 1000;
let poolCache: { at: number; providers: AIProvider[] } | null = null;

function normalizeBase(value: string) {
  return value
    .replace(/\/+$/, "")
    .replace(/\/chat\/completions$/i, "")
    .replace(/\/messages$/i, "");
}

/** Prefer providers known for low latency for public chat. */
const FAST_PROVIDER_ORDER: Record<string, number> = {
  xkiro: 0,
  openrouter: 1,
  groq: 2,
  google: 3,
  openai: 4,
  xai: 5,
  deepseek: 6,
  anthropic: 7,
  mistral: 8,
  opencode: 9,
  agentrouter: 10,
  "rahyar-gateway": 20,
};

export async function loadRuntimeProviders(): Promise<AIProvider[]> {
  if (!supabase) throw new Error("ai_runtime_storage_not_configured");
  const { data, error } = await supabase
    .from("admin_ai_providers")
    .select("id,name,enabled,metadata")
    .eq("enabled", true)
    .order("id");
  if (error) throw error;
  const now = Date.now();
  const rows = [...(data || [])].sort(
    (a: any, b: any) =>
      Number(a?.metadata?.priority || 100) - Number(b?.metadata?.priority || 100) ||
      String(a.id).localeCompare(String(b.id)),
  );
  return rows
    .filter((r: any) => {
      const meta = r.metadata || {};
      return meta.apiKeyEncrypted && (!meta.cooldownUntil || new Date(meta.cooldownUntil).getTime() <= now);
    })
    .map((r: any) => {
      const meta = r.metadata || {};
      return {
        id: r.id,
        name: r.name,
        baseUrl: normalizeBase(meta.baseUrl || ""),
        modelsUrl: meta.modelsUrl || "/models",
        chatPath: meta.chatPath || "/chat/completions",
        apiKey: decryptProviderKey(meta.apiKeyEncrypted),
        modelsRequireAuth: true,
        authScheme: meta.authScheme || "bearer",
        chatStyle: meta.chatStyle || "openai",
        defaultModels: Array.isArray(meta.defaultModels) ? meta.defaultModels : [],
      } as AIProvider;
    })
    .filter((p: AIProvider) => p.baseUrl && p.apiKey);
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
      priority: FAST_PROVIDER_ORDER[p.id] ?? index + 10,
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

/**
 * Fast path for chat: env keys are source of truth; Supabase can add extra providers.
 * Never call /models discovery on the hot path.
 */
export async function getRuntimeProviderPool(): Promise<AIProvider[]> {
  const now = Date.now();
  if (poolCache && now - poolCache.at < POOL_TTL_MS && poolCache.providers.length) {
    return poolCache.providers;
  }

  // Env first — production secrets live here.
  const envProviders = getConfiguredProviders().filter((p) => Boolean(p.apiKey) || p.id === "ollama");
  const byId = new Map<string, AIProvider>();
  for (const p of envProviders) byId.set(p.id, p);

  let dbProviders: AIProvider[] = [];
  try {
    dbProviders = await loadRuntimeProviders();
  } catch {
    try {
      await bootstrapRuntimeProvidersFromEnv();
      dbProviders = await loadRuntimeProviders();
    } catch {
      /* optional */
    }
  }

  for (const p of dbProviders) {
    const existing = byId.get(p.id);
    if (!existing) {
      byId.set(p.id, p);
      continue;
    }
    // Prefer ENV api key over DB (DB keys often go stale).
    const models = [
      ...new Set([...(existing.defaultModels || []), ...(p.defaultModels || [])].filter(Boolean)),
    ].slice(0, 6);
    byId.set(p.id, {
      ...p,
      ...existing,
      apiKey: existing.apiKey || p.apiKey,
      defaultModels: models.length ? models : existing.defaultModels || p.defaultModels,
      baseUrl: existing.baseUrl || p.baseUrl,
    });
  }

  const merged = [...byId.values()].sort(
    (a, b) => (FAST_PROVIDER_ORDER[a.id] ?? 50) - (FAST_PROVIDER_ORDER[b.id] ?? 50),
  );

  poolCache = { at: now, providers: merged };
  return merged;
}

/** Invalidate cache after admin changes providers (optional hook). */
export function invalidateRuntimeProviderPoolCache() {
  poolCache = null;
}
