import { chatWithProvider, type ChatMessage, type AIProvider } from "@/lib/ai-providers";
import { getRuntimeProviderPool } from "@/lib/ai-runtime-providers";

const cooldown = new Map<string, number>();
/** Providers with bad keys — skip for 1 hour without re-probing every request. */
const deadUntil = new Map<string, number>();

/** Max models tried per provider on the hot path. */
const MODELS_PER_PROVIDER = 2;
/** Max total candidates to try before failing. */
const MAX_CANDIDATES = 12;

function exhausted(message: string) {
  return /429|402|403|rate.?limit|quota|credit|credits|insufficient|billing|balance|funds|payment required|capacity|limit/i.test(
    message,
  );
}

function isAuthError(message: string) {
  return /invalid api key|unauthorized|401|403|api key not valid|incorrect api key|authentication|permission_denied|API_KEY_INVALID/i.test(
    message,
  );
}

function cooldownMs(message: string) {
  if (isAuthError(message)) return 3_600_000;
  if (/429|rate.?limit/i.test(message)) return 60_000;
  if (/402|credit|credits|quota|billing|balance|funds|payment required/i.test(message)) return 3_600_000;
  return 8_000;
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
    // Prefer free gateways when paid keys may be stale
    xkiro: 100,
    openrouter: 95,
    groq: 90,
    google: 85,
    openai: 80,
    xai: 75,
    deepseek: 70,
    anthropic: 60,
    agentrouter: 50,
    "rahyar-gateway": 40,
  };
  return map[providerId] ?? 45;
}

const FALLBACK_MODELS: Record<string, string[]> = {
  xkiro: ["qwen/qwen3.8-omni-flash:free", "qwen/qwen3-8b:free", "meta-llama/llama-3.3-70b-instruct:free"],
  openrouter: ["google/gemini-2.0-flash-exp:free", "qwen/qwen3-8b:free", "meta-llama/llama-3.3-70b-instruct:free"],
  groq: ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"],
  google: ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"],
  openai: ["gpt-4o-mini", "gpt-4o"],
};

function pickModels(p: AIProvider): string[] {
  const configured = [...new Set((p.defaultModels || []).filter(Boolean))];
  const fallback = FALLBACK_MODELS[p.id] || [];
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
  const deadProviders = new Set<string>();

  for (const candidate of limited) {
    if (signal?.aborted) throw new Error("aborted");
    if (deadProviders.has(candidate.provider.id)) continue;

    const key = candidate.provider.id + "::" + candidate.model;
    const until = cooldown.get(key) || 0;
    if (until > Date.now()) continue;

    const timeoutMs = 8_000;
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
        deadProviders.add(candidate.provider.id);
        deadUntil.set(candidate.provider.id, Date.now() + 3_600_000);
      } else if (/timeout_/i.test(message) || /not found|404|model/i.test(message)) {
        deadProviders.add(candidate.provider.id);
      }
    }
  }

  throw new Error("all_providers_failed:" + errors.slice(0, 10).join(" | "));
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
