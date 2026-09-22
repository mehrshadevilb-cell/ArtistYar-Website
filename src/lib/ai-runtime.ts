import { chatWithProvider, type ChatMessage, type AIProvider } from "@/lib/ai-providers";
import { getRuntimeProviderPool } from "@/lib/ai-runtime-providers";
import { GENERIC_OPENAI_MODELS } from "@/lib/ai-env-providers";

const cooldown = new Map<string, number>();
/** Providers with bad keys / hard quota — skip for a while without re-probing every request. */
const deadUntil = new Map<string, number>();

/** Models tried per provider on the hot path (configured + fallbacks). */
const MODELS_PER_PROVIDER = 4;
/** Try many candidates so every env provider gets a turn before failing. */
const MAX_CANDIDATES = 28;

function exhausted(message: string) {
  return /402|credit|credits|insufficient|billing|balance|funds|payment required|quota exceeded|out of credits/i.test(
    message,
  );
}

function isRateLimit(message: string) {
  return /429|rate.?limit|too many requests|capacity/i.test(message);
}

function isAuthError(message: string) {
  return /invalid api key|unauthorized|401|api key not valid|incorrect api key|authentication|permission_denied|API_KEY_INVALID|forbidden/i.test(
    message,
  );
}

function isModelMissing(message: string) {
  return /not found|404|model.?not|unknown model|does not exist|invalid model/i.test(message);
}

function cooldownMs(message: string) {
  if (isAuthError(message) || exhausted(message)) return 3_600_000;
  if (isRateLimit(message)) return 45_000;
  if (isModelMissing(message)) return 15 * 60_000;
  return 6_000;
}

/** Higher = try first. Prefer instant/flash/mini free models. */
function scoreModel(modelId: string): number {
  const id = modelId.toLowerCase();
  if (/instant|8b-instant|flash-lite|haiku/.test(id)) return 100;
  if (/:free$/.test(id)) return 95;
  if (/flash|mini|8b|small|fast/.test(id)) return 92;
  if (/llama-3\.3|llama-3\.1|gemini-2\.0-flash|gemini-2\.5-flash|gpt-4o-mini|deepseek-chat/.test(id)) return 88;
  if (/70b|sonnet|gpt-4o(?!-mini)|pro/.test(id)) return 55;
  return 65;
}

function scoreProvider(providerId: string): number {
  const map: Record<string, number> = {
    // Prefer free/fast gateways; paid keys still used when healthy
    xkiro: 100,
    openrouter: 95,
    groq: 90,
    google: 85,
    openai: 80,
    xai: 75,
    deepseek: 70,
    anthropic: 60,
    agentrouter: 50,
    opencode: 48,
    "rahyar-gateway": 40,
  };
  return map[providerId] ?? 45;
}

const FALLBACK_MODELS: Record<string, string[]> = {
  xkiro: ["qwen/qwen3.8-omni-flash:free", "qwen/qwen3-8b:free", "meta-llama/llama-3.3-70b-instruct:free"],
  openrouter: ["google/gemini-2.0-flash-exp:free", "qwen/qwen3-8b:free", "meta-llama/llama-3.3-70b-instruct:free"],
  groq: ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "gemma2-9b-it"],
  google: ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"],
  openai: ["gpt-4o-mini", "gpt-4o"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  xai: ["grok-3-mini", "grok-3"],
  anthropic: ["claude-3-5-haiku-20241022", "claude-sonnet-4-20250514"],
  mistral: ["mistral-small-latest", "mistral-large-latest"],
};

function pickModels(p: AIProvider): string[] {
  const configured = [...new Set((p.defaultModels || []).filter(Boolean))];
  const fallback = FALLBACK_MODELS[p.id] || (p.chatStyle === "openai" ? GENERIC_OPENAI_MODELS : []);
  const list = [...new Set([...configured, ...fallback])];
  return list
    .map((m) => ({ m, s: scoreModel(m) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.m)
    .slice(0, MODELS_PER_PROVIDER);
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string, parent?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (parent?.aborted) {
      reject(new Error("aborted"));
      return;
    }
    const onParentAbort = () => reject(new Error("aborted"));
    parent?.addEventListener("abort", onParentAbort, { once: true });
    const t = setTimeout(() => reject(new Error(`timeout_${ms}ms:${label}`)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        parent?.removeEventListener("abort", onParentAbort);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        parent?.removeEventListener("abort", onParentAbort);
        reject(e);
      },
    );
  });
}

/**
 * Multi-provider failover chat.
 * - Uses every env-configured provider from getRuntimeProviderPool()
 * - On limit/error: skip that model, try next model, then next provider
 * - Only permanently cools a whole provider on auth failure or hard billing exhaustion
 */
export async function runtimeAutoChat(
  messages: ChatMessage[],
  preferredProvider?: string,
  preferredModel?: string,
  _clientId = "artistyar-web",
  signal?: AbortSignal,
) {
  const providers = await getRuntimeProviderPool();
  if (!providers.length) throw new Error("no_provider_configured");

  type Cand = { provider: AIProvider; model: string; score: number };
  const candidates: Cand[] = [];
  const now = Date.now();

  for (const p of providers) {
    const until = deadUntil.get(p.id) || 0;
    if (until > now) continue;
    for (const model of pickModels(p)) {
      candidates.push({
        provider: p,
        model,
        score: scoreProvider(p.id) * 10 + scoreModel(model),
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  if (preferredProvider && preferredModel) {
    candidates.sort(
      (a, b) =>
        Number(b.provider.id === preferredProvider && b.model === preferredModel) -
        Number(a.provider.id === preferredProvider && a.model === preferredModel),
    );
  }

  const limited = candidates.slice(0, MAX_CANDIDATES);
  if (!limited.length) throw new Error("no_provider_configured");

  const errors: string[] = [];
  /** Providers to skip for the rest of THIS request only (rate limit / hard fail). */
  const skipProviderThisRequest = new Set<string>();

  for (const candidate of limited) {
    if (signal?.aborted) throw new Error("aborted");
    if (skipProviderThisRequest.has(candidate.provider.id)) continue;

    const key = candidate.provider.id + "::" + candidate.model;
    const until = cooldown.get(key) || 0;
    if (until > Date.now()) continue;

    // Auth-dead for this process lifetime window
    const providerDead = deadUntil.get(candidate.provider.id) || 0;
    if (providerDead > Date.now()) continue;

    const timeoutMs = 10_000;
    try {
      const reply = await withTimeout(
        chatWithProvider(candidate.provider, candidate.model, messages, signal),
        timeoutMs,
        key,
        signal,
      );
      if (!reply?.trim()) throw new Error("empty_reply");
      cooldown.delete(key);
      return { reply, provider: candidate.provider.id, model: candidate.model };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(key + "=" + message.slice(0, 120));
      cooldown.set(key, Date.now() + cooldownMs(message));

      if (isAuthError(message) || exhausted(message)) {
        // Bad key or no credits — skip this provider for an hour
        skipProviderThisRequest.add(candidate.provider.id);
        deadUntil.set(candidate.provider.id, Date.now() + 3_600_000);
      } else if (isRateLimit(message)) {
        // Rate limit: skip remaining models of this provider for this request only;
        // model-level cooldown handles the next request window.
        skipProviderThisRequest.add(candidate.provider.id);
      }
      // timeout / 404 / model missing → only that model is cooled; try next candidate
    }
  }

  throw new Error("all_providers_failed:" + errors.slice(0, 12).join(" | "));
}

export async function runtimeGenerateJson(
  prompt: string,
  system = "Return only valid JSON.",
  signal?: AbortSignal,
) {
  return runtimeAutoChat(
    [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    undefined,
    undefined,
    "artistyar-runtime-json",
    signal,
  );
}

/** Debug helper: list providers currently in the runtime pool (no secrets). */
export async function listRuntimePoolStatus() {
  const providers = await getRuntimeProviderPool();
  const now = Date.now();
  return providers.map((p) => ({
    id: p.id,
    name: p.name,
    hasKey: Boolean(p.apiKey),
    baseUrl: p.baseUrl,
    chatStyle: p.chatStyle,
    models: pickModels(p),
    deadForMs: Math.max(0, (deadUntil.get(p.id) || 0) - now),
  }));
}
