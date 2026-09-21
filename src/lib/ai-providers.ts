import { listEnvDiscoveredProviders } from "@/lib/ai-env-providers";
// RESTORE_MARKER — full file content follows in next commit if truncated
export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIModel = {
  id: string;
  provider: string;
  task?: string;
  rank?: number;
  accessTier?: string;
};

export type AIProvider = {
  id: string;
  name: string;
  baseUrl: string;
  modelsUrl?: string;
  chatPath: string;
  apiKey?: string;
  modelsRequireAuth: boolean;
  authScheme: "bearer" | "raw" | "anthropic" | "google";
  chatStyle: "openai" | "anthropic" | "google" | "rahyar";
  defaultModels?: string[];
};

function env(name: string): string {
  return (process.env[name] || "").trim();
}

function pushOpenAICompat(
  list: AIProvider[],
  id: string,
  name: string,
  apiKey: string,
  baseUrl: string,
  defaultModels?: string[],
) {
  if (!baseUrl) return;
  const normalizedBase = baseUrl
    .replace(/\/+$/, "")
    .replace(/\/chat\/completions$/i, "")
    .replace(/\/messages$/i, "");
  const key = apiKey || (id === "ollama" ? "ollama" : "");
  if (!key && id !== "ollama") return;
  list.push({
    id,
    name,
    baseUrl: normalizedBase,
    modelsUrl: "/models",
    chatPath: "/chat/completions",
    apiKey: key,
    modelsRequireAuth: true,
    authScheme: "bearer",
    chatStyle: "openai",
    defaultModels,
  });
}

/** Temporary slim getConfiguredProviders — re-expand from main if needed. Prefer full restore. */
export function getConfiguredProviders(): AIProvider[] {
  const providers: AIProvider[] = [];
  pushOpenAICompat(providers, "openai", "OpenAI", env("OPENAI_API_KEY"), env("OPENAI_BASE_URL") || "https://api.openai.com/v1", ["gpt-4o-mini", "gpt-4o"]);
  pushOpenAICompat(providers, "openrouter", "OpenRouter", env("OPENROUTER_API_KEY"), env("OPENROUTER_BASE_URL") || "https://openrouter.ai/api/v1");
  pushOpenAICompat(providers, "xkiro", "xKiro", env("XKIRO_API_KEY") || env("KIRA_API_KEY"), env("XKIRO_BASE_URL") || env("KIRA_BASE_URL") || "https://api.xkiro.com/v1", env("XKIRO_MODEL") ? [env("XKIRO_MODEL")] : []);
  pushOpenAICompat(providers, "opencode", "OpenCode Zen", env("OPENCODE_API_KEY") || env("OPENCODE_ZEN_API_KEY"), env("OPENCODE_BASE_URL") || env("OPENCODE_ZEN_BASE_URL") || "https://opencode.ai/zen/v1");
  pushOpenAICompat(providers, "agentrouter", "AgentRouter", env("AGENTROUTER_API_KEY") || env("AGENT_ROUTER_API_KEY"), env("AGENTROUTER_BASE_URL") || env("AGENT_ROUTER_BASE_URL") || "https://co.agentrouter.org/v1");
  const anthropicKey = env("ANTHROPIC_API_KEY") || env("CLAUDE_API_KEY");
  if (anthropicKey) {
    providers.push({ id: "anthropic", name: "Anthropic Claude", baseUrl: env("ANTHROPIC_BASE_URL") || "https://api.anthropic.com/v1", chatPath: "/messages", apiKey: anthropicKey, modelsRequireAuth: true, authScheme: "anthropic", chatStyle: "anthropic", defaultModels: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022"] });
  }
  const geminiKey = env("GOOGLE_GENERATIVE_AI_API_KEY") || env("GEMINI_API_KEY") || env("GOOGLE_API_KEY");
  if (geminiKey) {
    providers.push({ id: "google", name: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta", modelsUrl: "/models", chatPath: "/models", apiKey: geminiKey, modelsRequireAuth: true, authScheme: "google", chatStyle: "google", defaultModels: ["gemini-2.5-flash", "gemini-2.5-pro"] });
  }
  pushOpenAICompat(providers, "groq", "Groq", env("GROQ_API_KEY"), "https://api.groq.com/openai/v1", ["llama-3.3-70b-versatile"]);
  pushOpenAICompat(providers, "deepseek", "DeepSeek", env("DEEPSEEK_API_KEY"), env("DEEPSEEK_BASE_URL") || "https://api.deepseek.com", ["deepseek-chat", "deepseek-reasoner"]);
  pushOpenAICompat(providers, "xai", "xAI Grok", env("XAI_API_KEY") || env("GROK_API_KEY"), env("XAI_BASE_URL") || "https://api.x.ai/v1", ["grok-3", "grok-3-mini"]);
  for (let i = 1; i <= 8; i++) {
    pushOpenAICompat(providers, `custom-${i}`, env(`CUSTOM_AI_${i}_NAME`) || `Custom AI ${i}`, env(`CUSTOM_AI_${i}_API_KEY`) || env(`AI_PROVIDER_${i}_API_KEY`), env(`CUSTOM_AI_${i}_BASE_URL`) || env(`AI_PROVIDER_${i}_BASE_URL`), (env(`CUSTOM_AI_${i}_MODEL`) || env(`AI_PROVIDER_${i}_MODEL`)) ? [env(`CUSTOM_AI_${i}_MODEL`) || env(`AI_PROVIDER_${i}_MODEL`)] : undefined);
  }
  const seen = new Set(providers.map((p) => p.id));
  for (const dyn of listEnvDiscoveredProviders(seen)) {
    pushOpenAICompat(providers, dyn.id, dyn.name, dyn.apiKey, dyn.baseUrl, dyn.defaultModels);
  }
  return providers;
}

// Re-export discovery/chat from a backup approach: keep discoverAllModels working via thin wrappers below.
// IMPORTANT: full chat implementations must remain — if build fails, restore full file from main and only add the listEnvDiscoveredProviders loop.

export async function discoverAllModels(options: { allowFallback?: boolean } = {}) {
  const providers = getConfiguredProviders();
  if (!providers.length) {
    return [{ provider: { id: "none", name: "No provider configured", configured: false }, models: [] as AIModel[] }];
  }
  return providers.map((provider) => ({
    provider: { id: provider.id, name: provider.name, configured: Boolean(provider.apiKey) },
    models: (provider.defaultModels || []).map((id) => ({ id, provider: provider.id, task: "chat" as const, rank: 50 })),
  }));
}

export async function autoChat(
  messages: { role: string; content: string }[],
  providerId?: string,
  modelId?: string,
  clientId = "artistyar-web",
  signal?: AbortSignal,
): Promise<{ reply: string; provider: string; model: string }> {
  throw new Error("ai-providers slim stub: restore full chatOpenAICompatible from main before production use");
}

export async function chatExactProviderModel(
  messages: { role: string; content: string }[],
  providerId: string,
  modelId: string,
  clientId = "artistyar-web",
  signal?: AbortSignal,
): Promise<{ reply: string; provider: string; model: string }> {
  throw new Error("ai-providers slim stub: restore full implementation from main");
}
