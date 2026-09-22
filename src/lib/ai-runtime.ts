import { chatWithProvider, type ChatMessage, type AIProvider } from "@/lib/ai-providers";
import { getRuntimeProviderPool } from "@/lib/ai-runtime-providers";

const cooldown = new Map<string, number>();

/** Per-attempt timeout so one slow free model cannot burn the whole request. */
const ATTEMPT_TIMEOUT_MS = 12_000;
/** Max models tried per provider on the hot path. */
const MODELS_PER_PROVIDER = 2;
/** Max total candidates to try before failing. */
const MAX_CANDIDATES = 8;

function exhausted(message: string) {
  return /429|402|403|rate.?limit|quota|credit|credits|insufficient|billing|balance|funds|payment required|capacity|limit/i.test(
    message,
  );
}

function cooldownMs(message: string) {
  if (/429|rate.?limit/i.test(message)) return 60_000;
  if (/402|403|credit|credits|quota|billing|balance|funds|payment required/i.test(message)) return 3_600_000;
  return 12_000;
}

/** Higher = try first. Prefer instant/flash/mini free models. */
function scoreModel(modelId: string): number {
  const id = modelId.toLowerCase();
  if (/instant|8b-instant|flash-lite|haiku/.test(id)) return 100;
  if (/flash|mini|8b|small|fast/.test(id)) return 92;
  if (/llama-3\.3|llama-3\.1|gemini-2\.5-flash|gpt-4o-mini|deepseek-chat/.test(id)) return 88;
  if (/:free$/.test(id)) return 75;
  if (/70b|sonnet|gpt-4o(?!-mini)|pro/.test(id)) return 55;
  return 65;
}

function scoreProvider(providerId: string): number {
  const map: Record<string, number> = {
    groq: 100,
    google: 95,
    openai: 90,
    openrouter: 85,
    xai: 80,
    deepseek: 78,
    anthropic: 70,
    xkiro: 60,
    agentrouter: 50,
    "rahyar-gateway": 40,
  };
  return map[providerId] ?? 45;
}

function pickModels(p: AIProvider): string[] {
  const list = [...new Set((p.defaultModels || []).filter(Boolean))];
  // If registry has no defaults (e.g. xkiro without XKIRO_MODEL), use safe fast free fallbacks.
  if (!list.length && p.id === "xkiro") {
    return [
      "qwen/qwen3-8b:free",
      "qwen/qwen3.8-omni-flash:free",
      "meta-llama/llama-3.3-70b-instruct:free",
    ].slice(0, MODELS_PER_PROVIDER);
  }
  if (!list.length && p.id === "groq") {
    return ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"];
  }
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
    const ctrl = new AbortController();
    const onParentAbort = () => {
      ctrl.abort();
      reject(new Error("aborted"));
    };
    parent?.addEventListener("abort", onParentAbort, { once: true });
    const t = setTimeout(() => {
      ctrl.abort();
      reject(new Error(`timeout_${ms}ms:${label}`));
    }, ms);
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

  for (const p of providers) {
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
  const errors: string[] = [];
  const deadProviders = new Set<string>();

  for (const candidate of limited) {
    if (signal?.aborted) throw new Error("aborted");
    if (deadProviders.has(candidate.provider.id)) continue;

    const key = candidate.provider.id + "::" + candidate.model;
    const until = cooldown.get(key) || 0;
    if (until > Date.now()) continue;

    try {
      const reply = await withTimeout(
        chatWithProvider(candidate.provider, candidate.model, messages, signal),
        ATTEMPT_TIMEOUT_MS,
        key,
        signal,
      );
      cooldown.delete(key);
      return { reply, provider: candidate.provider.id, model: candidate.model };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(key + "=" + message.slice(0, 160));
      cooldown.set(key, Date.now() + cooldownMs(message));
      // Kill whole provider on auth/billing/timeout storms so we move on fast.
      if (exhausted(message) || /timeout_|401|403|invalid api key|unauthorized/i.test(message)) {
        deadProviders.add(candidate.provider.id);
      }
    }
  }

  throw new Error("all_providers_failed:" + errors.slice(0, 8).join(" | "));
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
