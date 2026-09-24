import { chatWithProvider, type ChatMessage, type AIProvider } from "@/lib/ai-providers";
import { getRuntimeProviderPool } from "@/lib/ai-runtime-providers";
import { GENERIC_OPENAI_MODELS } from "@/lib/ai-env-providers";

const cooldown = new Map<string, number>();
/** Providers with bad keys / hard quota — skip for a while without re-probing every request. */
const deadUntil = new Map<string, number>();

/** Models tried per provider on the hot path (configured + fallbacks). */
const MODELS_PER_PROVIDER = 4;
/** Keep the request bounded so fallback latency stays well below the API deadline. */
const MAX_CANDIDATES = 24;
const MAX_PARALLEL_ATTEMPTS = 3;
const ATTEMPT_TIMEOUT_MS = 9_000;
const TOTAL_RUNTIME_TIMEOUT_MS = 50_000;

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

/**
 * Race a promise against a timeout. On timeout or parent abort, the returned
 * AbortSignal is aborted so upstream fetch() is cancelled (not just ignored).
 */
function linkAbortSignals(parent?: AbortSignal): {
  signal: AbortSignal;
  abort: (reason?: string) => void;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const onParent = () => {
    if (!controller.signal.aborted) controller.abort();
  };
  if (parent) {
    if (parent.aborted) controller.abort();
    else parent.addEventListener("abort", onParent, { once: true });
  }
  return {
    signal: controller.signal,
    abort: (reason?: string) => {
      if (!controller.signal.aborted) controller.abort(reason as any);
    },
    cleanup: () => parent?.removeEventListener("abort", onParent),
  };
}

function withTimeout<T>(
  factory: (signal: AbortSignal) => Promise<T>,
  ms: number,
  label: string,
  parent?: AbortSignal,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (parent?.aborted) {
      reject(new Error("aborted"));
      return;
    }
    const linked = linkAbortSignals(parent);
    const t = setTimeout(() => {
      linked.abort(`timeout_${ms}ms`);
      reject(new Error(`timeout_${ms}ms:${label}`));
    }, ms);
    factory(linked.signal).then(
      (v) => {
        clearTimeout(t);
        linked.cleanup();
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        linked.cleanup();
        const msg = e instanceof Error ? e.message : String(e);
        if (linked.signal.aborted && /abort/i.test(msg)) {
          reject(new Error(parent?.aborted ? "aborted" : `timeout_${ms}ms:${label}`));
        } else {
          reject(e);
        }
      },
    );
  });
}

/**
 * Multi-provider failover chat.
 * - Uses every env-configured provider from getRuntimeProviderPool()
 * - On limit/error: skip that model, try next model, then next provider
 * - Only permanently cools a whole provider on auth failure or hard billing exhaustion
 * - Timeout aborts the upstream fetch so the next candidate can start immediately
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
  const skipProviderThisRequest = new Set<string>();

  // Round-robin models by provider. This prevents one broken provider/model
  // from consuming the entire request budget before another healthy provider
  // gets a chance. At most one model per provider is attempted per wave.
  const byProvider = new Map<string, Cand[]>();
  for (const candidate of limited) {
    const list = byProvider.get(candidate.provider.id) || [];
    list.push(candidate);
    byProvider.set(candidate.provider.id, list);
  }
  const providerQueues = [...byProvider.values()]
    .sort((a, b) => b[0].score - a[0].score)
    .map((list) => list.slice().sort((a, b) => b.score - a.score));
  const orderedCandidates: Cand[] = [];
  for (let round = 0; round < MODELS_PER_PROVIDER; round++) {
    for (const queue of providerQueues) {
      const candidate = queue[round];
      if (candidate) orderedCandidates.push(candidate);
    }
  }
  const waves: Cand[][] = [];
  for (let i = 0; i < orderedCandidates.length; i += MAX_PARALLEL_ATTEMPTS) {
    waves.push(orderedCandidates.slice(i, i + MAX_PARALLEL_ATTEMPTS));
  }

  const deadline = Date.now() + TOTAL_RUNTIME_TIMEOUT_MS;

  for (const wave of waves) {
    if (signal?.aborted) throw new Error("aborted");
    if (Date.now() >= deadline) break;

    const batchController = new AbortController();
    const onParentAbort = () => batchController.abort();
    if (signal) {
      if (signal.aborted) throw new Error("aborted");
      signal.addEventListener("abort", onParentAbort, { once: true });
    }

    const eligible = wave.filter((candidate) => {
      if (skipProviderThisRequest.has(candidate.provider.id)) return false;
      const key = candidate.provider.id + "::" + candidate.model;
      if ((cooldown.get(key) || 0) > Date.now()) return false;
      if ((deadUntil.get(candidate.provider.id) || 0) > Date.now()) return false;
      return true;
    });

    try {
      const results = await Promise.allSettled(
        eligible.map(async (candidate) => {
          const key = candidate.provider.id + "::" + candidate.model;
          const remaining = Math.max(1_000, Math.min(ATTEMPT_TIMEOUT_MS, deadline - Date.now()));
          const reply = await withTimeout(
            (sig) => chatWithProvider(candidate.provider, candidate.model, messages, sig),
            remaining,
            key,
            batchController.signal,
          );
          if (!reply?.trim()) throw new Error("empty_reply");
          return { reply, provider: candidate.provider.id, model: candidate.model, key };
        }),
      );

      const winner = results.find(
        (result): result is PromiseFulfilledResult<{ reply: string; provider: string; model: string; key: string }> =>
          result.status === "fulfilled" && Boolean(result.value.reply.trim()),
      );
      if (winner) {
        batchController.abort("winner");
        cooldown.delete(winner.value.key);
        return {
          reply: winner.value.reply,
          provider: winner.value.provider,
          model: winner.value.model,
        };
      }

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const candidate = eligible[i];
        if (!candidate || result.status !== "rejected") continue;
        const key = candidate.provider.id + "::" + candidate.model;
        const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
        errors.push(key + "=" + message.slice(0, 120));
        cooldown.set(key, Date.now() + cooldownMs(message));

        if (isAuthError(message) || exhausted(message)) {
          skipProviderThisRequest.add(candidate.provider.id);
          deadUntil.set(candidate.provider.id, Date.now() + 3_600_000);
        } else if (isRateLimit(message)) {
          skipProviderThisRequest.add(candidate.provider.id);
        }
      }
    } finally {
      batchController.abort("wave_complete");
      signal?.removeEventListener("abort", onParentAbort);
    }
  }

  if (signal?.aborted) throw new Error("aborted");
  const reason = Date.now() >= deadline ? "deadline_exceeded" : "candidates_exhausted";
  throw new Error("all_providers_failed:" + reason + ":" + errors.slice(0, 12).join(" | "));
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
