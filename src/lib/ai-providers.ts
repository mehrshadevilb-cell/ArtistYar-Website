import { listEnvDiscoveredProviders, GENERIC_OPENAI_MODELS } from "@/lib/ai-env-providers";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type AIModel = { id: string; provider: string; task?: string; rank?: number };
export type AIProvider = {
  id: string; name: string; baseUrl: string; modelsUrl?: string; chatPath: string;
  apiKey?: string; modelsRequireAuth: boolean;
  authScheme: "bearer" | "raw" | "anthropic" | "google";
  chatStyle: "openai" | "anthropic" | "google" | "rahyar";
  defaultModels?: string[];
};

function env(name: string): string { return (process.env[name] || "").trim(); }

function pushOpenAICompat(list: AIProvider[], id: string, name: string, apiKey: string, baseUrl: string, defaultModels?: string[]) {
  if (!baseUrl) return;
  const normalizedBase = baseUrl.replace(/\/+$/, "").replace(/\/chat\/completions$/i, "").replace(/\/messages$/i, "");
  const key = apiKey || (id === "ollama" ? "ollama" : "");
  if (!key && id !== "ollama") return;
  list.push({ id, name, baseUrl: normalizedBase, modelsUrl: "/models", chatPath: "/chat/completions", apiKey: key, modelsRequireAuth: true, authScheme: "bearer", chatStyle: "openai", defaultModels });
}

export function getConfiguredProviders(): AIProvider[] {
  const providers: AIProvider[] = [];
  pushOpenAICompat(providers, "openai", "OpenAI", env("OPENAI_API_KEY"), env("OPENAI_BASE_URL") || "https://api.openai.com/v1", ["gpt-4o-mini", "gpt-4o"]);
  pushOpenAICompat(providers, "openrouter", "OpenRouter", env("OPENROUTER_API_KEY"), env("OPENROUTER_BASE_URL") || "https://openrouter.ai/api/v1", ["google/gemini-2.0-flash-exp:free", "qwen/qwen3-8b:free", "openai/gpt-4o-mini"]);
  pushOpenAICompat(providers, "xkiro", "xKiro", env("XKIRO_API_KEY") || env("KIRA_API_KEY") || env("XTROUTER_API_KEY"), env("XKIRO_BASE_URL") || env("KIRA_BASE_URL") || "https://api.xkiro.com/v1", env("XKIRO_MODEL") ? [env("XKIRO_MODEL")] : ["qwen/qwen3.8-omni-flash:free", "qwen/qwen3-8b:free"]);
  pushOpenAICompat(providers, "opencode", "OpenCode Zen", env("OPENCODE_API_KEY") || env("OPENCODE_ZEN_API_KEY"), env("OPENCODE_BASE_URL") || env("OPENCODE_ZEN_BASE_URL") || "https://opencode.ai/zen/v1", [env("OPENCODE_MODEL") || "kimi-k2"]);
  pushOpenAICompat(providers, "agentrouter", "AgentRouter", env("AGENTROUTER_API_KEY") || env("AGENT_ROUTER_API_KEY"), env("AGENTROUTER_BASE_URL") || env("AGENT_ROUTER_BASE_URL") || "https://co.agentrouter.org/v1", [env("AGENTROUTER_MODEL") || "gpt-5.5"]);
  const anthropicKey = env("ANTHROPIC_API_KEY") || env("CLAUDE_API_KEY");
  if (anthropicKey) providers.push({ id: "anthropic", name: "Anthropic Claude", baseUrl: env("ANTHROPIC_BASE_URL") || "https://api.anthropic.com/v1", chatPath: "/messages", apiKey: anthropicKey, modelsRequireAuth: true, authScheme: "anthropic", chatStyle: "anthropic", defaultModels: ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022"] });
  const geminiKey = env("GOOGLE_GENERATIVE_AI_API_KEY") || env("GEMINI_API_KEY") || env("GOOGLE_API_KEY");
  if (geminiKey) providers.push({ id: "google", name: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta", modelsUrl: "/models", chatPath: "/models", apiKey: geminiKey, modelsRequireAuth: true, authScheme: "google", chatStyle: "google", defaultModels: ["gemini-2.5-flash", "gemini-2.0-flash"] });
  pushOpenAICompat(providers, "groq", "Groq", env("GROQ_API_KEY"), "https://api.groq.com/openai/v1", ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]);
  pushOpenAICompat(providers, "deepseek", "DeepSeek", env("DEEPSEEK_API_KEY"), env("DEEPSEEK_BASE_URL") || "https://api.deepseek.com/v1", ["deepseek-chat"]);
  pushOpenAICompat(providers, "mistral", "Mistral", env("MISTRAL_API_KEY"), env("MISTRAL_BASE_URL") || "https://api.mistral.ai/v1", ["mistral-large-latest"]);
  pushOpenAICompat(providers, "xai", "xAI Grok", env("XAI_API_KEY") || env("GROK_API_KEY"), env("XAI_BASE_URL") || "https://api.x.ai/v1", ["grok-3", "grok-3-mini"]);
  for (let i = 1; i <= 8; i++) {
    const customModel = env(`CUSTOM_AI_${i}_MODEL`) || env(`AI_PROVIDER_${i}_MODEL`);
    const customModels = customModel
      ? [customModel]
      : (env(`CUSTOM_AI_${i}_BASE_URL`) || env(`AI_PROVIDER_${i}_BASE_URL`) ? GENERIC_OPENAI_MODELS.slice(0, 3) : undefined);
    pushOpenAICompat(
      providers,
      `custom-${i}`,
      env(`CUSTOM_AI_${i}_NAME`) || env(`AI_PROVIDER_${i}_NAME`) || `Custom AI ${i}`,
      env(`CUSTOM_AI_${i}_API_KEY`) || env(`AI_PROVIDER_${i}_API_KEY`),
      env(`CUSTOM_AI_${i}_BASE_URL`) || env(`AI_PROVIDER_${i}_BASE_URL`),
      customModels,
    );
  }
  const gw = (env("RAHYAR_AI_GATEWAY_URL") || env("RAHYAR_API_URL")).replace(/\/$/, "");
  const secret = env("RAHYAR_AI_BRIDGE_SECRET") || env("RAHYAR_AI_KEY");
  if (gw && secret) providers.push({ id: "rahyar-gateway", name: "RahYar AI Gateway", baseUrl: gw, modelsUrl: "/api/v1/ai/status", chatPath: "/api/v1/assistant/chat", apiKey: secret, modelsRequireAuth: true, authScheme: "raw", chatStyle: "rahyar", defaultModels: ["centralized-router"] });
  const seen = new Set(providers.map((p) => p.id));
  for (const dyn of listEnvDiscoveredProviders(seen)) pushOpenAICompat(providers, dyn.id, dyn.name, dyn.apiKey, dyn.baseUrl, dyn.defaultModels);
  return providers;
}

function authHeaders(provider: AIProvider): Record<string, string> {
  const key = provider.apiKey || "";
  if (!key) return { "Content-Type": "application/json" };
  if (provider.authScheme === "anthropic") return { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" };
  if (provider.authScheme === "google") return { "Content-Type": "application/json" };
  if (provider.authScheme === "raw") return { "Content-Type": "application/json", "X-RahYar-AI-Key": key };
  return { "Content-Type": "application/json", Authorization: `Bearer ${key}` };
}

async function readJson(response: Response): Promise<any> {
  const raw = await response.text();
  if (!raw.trim()) return null;
  try { return JSON.parse(raw); } catch { throw new Error(`Provider invalid JSON (HTTP ${response.status}): ${raw.replace(/\s+/g, " ").slice(0, 180)}`); }
}

export async function discoverModels(provider: AIProvider): Promise<AIModel[]> {
  const fallback = (ids: string[]) => ids.map((id) => ({ id, provider: provider.id, task: "chat" as const }));
  try {
    if (provider.chatStyle === "rahyar") return [{ id: "centralized-router", provider: provider.id, task: "chat" }];
    if (provider.chatStyle === "google") {
      const response = await fetch(`${provider.baseUrl}/models`, { method: "GET", headers: { "x-goog-api-key": provider.apiKey || "" }, cache: "no-store", signal: AbortSignal.timeout(5000) });
      if (!response.ok) return fallback(provider.defaultModels || []);
      const data = await readJson(response);
      const models = (data?.models || []).filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent")).map((m: any) => ({ id: String(m.name || "").replace(/^models\//, ""), provider: provider.id, task: "chat" as const })).filter((m: AIModel) => m.id);
      return models.length ? models.slice(0, 20) : fallback(provider.defaultModels || []);
    }
    const response = await fetch(`${provider.baseUrl}${provider.modelsUrl || "/models"}`, { method: "GET", headers: authHeaders(provider), cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return fallback(provider.defaultModels || []);
    const data = await readJson(response);
    const models = (data?.data || data?.models || []).map((m: any) => (typeof m === "string" ? m : m.id || m.name)).filter(Boolean).map((id: string) => ({ id: String(id), provider: provider.id, task: "chat" as const }));
    return models.length ? models.slice(0, 30) : fallback(provider.defaultModels || []);
  } catch { return fallback(provider.defaultModels || []); }
}

export async function discoverAllModels() {
  const providers = getConfiguredProviders();
  return Promise.all(providers.map(async (provider) => ({ provider: { id: provider.id, name: provider.name, configured: Boolean(provider.apiKey) }, models: await discoverModels(provider) })));
}

async function chatOpenAI(provider: AIProvider, model: string, messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
  const headers: Record<string, string> = { ...authHeaders(provider) };
  if (provider.id === "openrouter") { headers["HTTP-Referer"] = env("NEXT_PUBLIC_SITE_URL") || "https://artistyaar.ir"; headers["X-Title"] = "ArtistYar"; }
  const response = await fetch(`${provider.baseUrl}${provider.chatPath || "/chat/completions"}`, { method: "POST", headers, body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 2048 }), signal });
  const data = await readJson(response);
  if (!response.ok) throw new Error(String((typeof data?.error === "object" && data?.error?.message) || data?.error || data?.message || `HTTP ${response.status}`).slice(0, 240));
  const reply = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || "";
  if (!reply) throw new Error("empty_reply");
  return String(reply);
}

async function chatAnthropic(provider: AIProvider, model: string, messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const converted = messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
  const response = await fetch(`${provider.baseUrl}${provider.chatPath || "/messages"}`, { method: "POST", headers: authHeaders(provider), body: JSON.stringify({ model, max_tokens: 2048, system: system || undefined, messages: converted }), signal });
  const data = await readJson(response);
  if (!response.ok) throw new Error(data?.error?.message || `HTTP ${response.status}`);
  const reply = (data?.content || []).map((p: any) => p.text || "").join("");
  if (!reply) throw new Error("empty_reply");
  return reply;
}

async function chatGoogle(provider: AIProvider, model: string, messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const contents = messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const url = `${provider.baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(provider.apiKey || "")}`;
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents, systemInstruction: system ? { parts: [{ text: system }] } : undefined, generationConfig: { temperature: 0.3, maxOutputTokens: 2048 } }), signal });
  const data = await readJson(response);
  if (!response.ok) throw new Error(data?.error?.message || `HTTP ${response.status}`);
  const reply = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
  if (!reply) throw new Error("empty_reply");
  return reply;
}

async function chatRahyar(provider: AIProvider, model: string, messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
  const response = await fetch(`${provider.baseUrl}${provider.chatPath}`, { method: "POST", headers: authHeaders(provider), body: JSON.stringify({ model, messages }), signal });
  const data = await readJson(response);
  if (!response.ok) throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
  const reply = data?.reply || data?.message || data?.content || data?.choices?.[0]?.message?.content || "";
  if (!reply) throw new Error("empty_reply");
  return String(reply);
}

export async function chatWithProvider(provider: AIProvider, model: string, messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
  if (provider.chatStyle === "anthropic") return chatAnthropic(provider, model, messages, signal);
  if (provider.chatStyle === "google") return chatGoogle(provider, model, messages, signal);
  if (provider.chatStyle === "rahyar") return chatRahyar(provider, model, messages, signal);
  return chatOpenAI(provider, model, messages, signal);
}

export async function chatExactProviderModel(messages: ChatMessage[], providerId: string, modelId: string, _clientId = "artistyar-web", signal?: AbortSignal) {
  const provider = getConfiguredProviders().find((p) => p.id === providerId);
  if (!provider) throw new Error(`provider_not_found:${providerId}`);
  if (!provider.apiKey && provider.id !== "ollama") throw new Error(`provider_missing_key:${providerId}`);
  const reply = await chatWithProvider(provider, modelId, messages, signal);
  if (!reply?.trim()) throw new Error("empty_reply");
  return { reply, provider: providerId, model: modelId };
}

export type RankedCandidate = { providerId: string; modelId: string; score: number; providerName: string };

export function scoreModel(modelId: string): number {
  const id = modelId.toLowerCase();
  if (/gpt-4o(?!-mini)|claude-sonnet|gemini-2\.5-pro|o3/.test(id)) return 90;
  if (/gpt-4o-mini|gemini-2\.5-flash|deepseek|llama-3\.3|grok-3(?!-mini)/.test(id)) return 85;
  if (/haiku|flash|mini|instant|8b/.test(id)) return 80;
  return 60;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout_${ms}ms:${label}`)), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

export async function buildRankedCandidates(limit = 24): Promise<RankedCandidate[]> {
  const providers = getConfiguredProviders().filter((p) => Boolean(p.apiKey) || p.id === "ollama");
  const discovered = await Promise.all(
    providers.map(async (provider) => {
      const models: string[] = [...(provider.defaultModels || [])];
      try {
        const live = await withTimeout(discoverModels(provider), 3500, `discover:${provider.id}`);
        for (const m of live) if (m.id && !models.includes(m.id)) models.push(m.id);
      } catch {
        // A discovery endpoint being unavailable must never disable the provider.
        // Configured default models remain usable.
      }
      return { provider, models: models.slice(0, 6) };
    }),
  );
  const out: RankedCandidate[] = [];
  const seen = new Set<string>();
  for (const { provider, models } of discovered) {
    for (const modelId of models) {
      const key = `${provider.id}::${modelId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ providerId: provider.id, modelId, score: scoreModel(modelId), providerName: provider.name });
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit);
}

function isTransientProviderError(message: string): boolean {
  return /timeout|timed out|temporar|rate.?limit|429|502|503|504|network|fetch failed|empty_reply/i.test(message);
}

export async function autoChat(messages: ChatMessage[], preferredProvider?: string, preferredModel?: string, _clientId = "artistyar-web", signal?: AbortSignal) {
  // Unified path: same multi-provider failover as public chat / assistant.
  const { runtimeAutoChat } = await import("@/lib/ai-runtime");
  return runtimeAutoChat(messages, preferredProvider, preferredModel, _clientId, signal);
}

export function listProviderStatus() {
  return getConfiguredProviders().map((p) => ({ id: p.id, name: p.name, hasKey: Boolean(p.apiKey), baseUrl: p.baseUrl, chatStyle: p.chatStyle, defaultModels: (p.defaultModels || []).slice(0, 5) }));
}
