import { chatWithProvider, type ChatMessage, type AIProvider } from "@/lib/ai-providers";
import { getRuntimeProviderPool } from "@/lib/ai-runtime-providers";
import { GENERIC_OPENAI_MODELS } from "@/lib/ai-env-providers";

const cooldown = new Map<string, number>();
/** Providers with bad keys / hard quota — skip for a while without re-probing every request. */
const deadUntil = new Map<string, number>();

/** Models tried per provider on the hot path (configured + fallbacks). */
const MODELS_PER_PROVIDER = 3;
/** Keep the request bounded so fallback latency stays well below the API deadline. */
const MAX_CANDIDATES = 18;
const MAX_PARALLEL_ATTEMPTS = 4;
const ATTEMPT_TIMEOUT_MS = 7_000;
const TOTAL_RUNTIME_TIMEOUT_MS = 42_000;

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
  // Auth/billing: cool the *model key* briefly; whole-provider deadUntil is set separately and shorter.
  if (isAuthError(message) || exhausted(message)) return 120_000; // 2 min model key
  if (isRateLimit(message)) return 20_000;
  if (isModelMissing(message)) return 5 * 60_000; // 5 min, not 15
  if (/timeout/i.test(message)) return 3_000;
  return 4_000;
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
  xkiro: ["qwen/qwen3-8b:free", "meta-llama/llama-3.3-70b-instruct:free", "google/gemini-2.0-flash-exp:free"],
  openrouter: ["google/gemini-2.0-flash-exp:free", "qwen/qwen3-8b:free", "meta-llama/llama-3.3-70b-instruct:free", "openai/gpt-4o-mini"],
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
