import { listEnvDiscoveredProviders } from "@/lib/ai-env-providers";

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

export function getConfiguredProviders(): AIProvider[] {
  const providers: AIProvider[] = [];

  pushOpenAICompat(providers, "openai", "OpenAI", env("OPENAI_API_KEY"), env("OPENAI_BASE_URL") || "https://api.openai.com/v1", ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"]);
  pushOpenAICompat(providers, "openrouter", "OpenRouter", env("OPENROUTER_API_KEY"), env("OPENROUTER_BASE_URL") || "https://openrouter.ai/api/v1", ["google/gemini-2.5-flash", "openai/gpt-4o-mini"]);
  pushOpenAICompat(providers, "xkiro", "xKiro", env("XKIRO_API_KEY") || env("KIRA_API_KEY") || env("XTROUTER_API_KEY"), env("XKIRO_BASE_URL") || env("KIRA_BASE_URL") || "https://api.xkiro.com/v1", env("XKIRO_MODEL") ? [env("XKIRO_MODEL")] : []);
  pushOpenAICompat(providers, "opencode", "OpenCode Zen", env("OPENCODE_API_KEY") || env("OPENCODE_ZEN_API_KEY"), env("OPENCODE_BASE_URL") || env("OPENCODE_ZEN_BASE_URL") || "https://opencode.ai/zen/v1", [env("OPENCODE_MODEL") || "kimi-k2", "qwen3-coder"]);
  pushOpenAICompat(providers, "agentrouter", "AgentRouter", env("AGENTROUTER_API_KEY") || env("AGENT_ROUTER_API_KEY"), env("AGENTROUTER_BASE_URL") || env("AGENT_ROUTER_BASE_URL") || "https://co.agentrouter.org/v1", [env("AGENTROUTER_MODEL") || "gpt-5.5"]);

  const anthropicKey = env("ANTHROPIC_API_KEY") || env("CLAUDE_API_KEY") || env("CLAUD_API_KEY");
  if (anthropicKey) {
    providers.push({
      id: "anthropic",
      name: "Anthropic Claude",
      baseUrl: env("ANTHROPIC_BASE_URL") || "https://api.anthropic.com/v1",
      chatPath: "/messages",
      apiKey: anthropicKey,
      modelsRequireAuth: true,
      authScheme: "anthropic",
      chatStyle: "anthropic",
      defaultModels: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
    });
  }

  const geminiKey = env("GOOGLE_GENERATIVE_AI_API_KEY") || env("GEMINI_API_KEY") || env("GOOGLE_API_KEY");
  if (geminiKey) {
    providers.push({
      id: "google",
      name: "Google Gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      modelsUrl: "/models",
      chatPath: "/models",
      apiKey: geminiKey,
      modelsRequireAuth: true,
      authScheme: "google",
      chatStyle: "google",
      defaultModels: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
    });
  }

  pushOpenAICompat(providers, "groq", "Groq", env("GROQ_API_KEY"), "https://api.groq.com/openai/v1", ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]);
  pushOpenAICompat(providers, "bytez", "Bytez", env("BYTEZ_API_KEY") || env("BYTEZ_KEY"), env("BYTEZ_BASE_URL") || "https://api.bytez.com/models/v2/openai/v1", [env("BYTEZ_MODEL") || "Qwen/Qwen2.5-72B-Instruct"]);
  const ollamaBase = env("OLLAMA_BASE_URL") || env("OLLAMA_HOST") || (env("OLLAMA_API_KEY") || env("OLLAMA_ENABLED") === "1" ? "http://127.0.0.1:11434/v1" : "");
  pushOpenAICompat(providers, "ollama", "Ollama", env("OLLAMA_API_KEY") || "ollama", ollamaBase, env("OLLAMA_MODEL") ? [env("OLLAMA_MODEL")] : ["llama3.2"]);
  pushOpenAICompat(providers, "deepseek", "DeepSeek", env("DEEPSEEK_API_KEY"), env("DEEPSEEK_BASE_URL") || "https://api.deepseek.com/v1", ["deepseek-chat", "deepseek-reasoner"]);
  pushOpenAICompat(providers, "mistral", "Mistral", env("MISTRAL_API_KEY"), env("MISTRAL_BASE_URL") || "https://api.mistral.ai/v1", ["mistral-large-latest"]);
  pushOpenAICompat(providers, "together", "Together", env("TOGETHER_API_KEY"), "https://api.together.xyz/v1");
  pushOpenAICompat(providers, "fireworks", "Fireworks", env("FIREWORKS_API_KEY"), "https://api.fireworks.ai/inference/v1");
  pushOpenAICompat(providers, "xai", "xAI Grok", env("XAI_API_KEY") || env("GROK_API_KEY"), env("XAI_BASE_URL") || "https://api.x.ai/v1", ["grok-3", "grok-3-mini"]);
  const flareKey = env("FLARE_API_KEY") || env("CLOUDFLARE_API_TOKEN");
  const flareBase = env("FLARE_BASE_URL") || (env("CLOUDFLARE_ACCOUNT_ID") ? `https://api.cloudflare.com/client/v4/accounts/${env("CLOUDFLARE_ACCOUNT_ID")}/ai/v1` : "");
  pushOpenAICompat(providers, "flare", "Cloudflare / Flare", flareKey, flareBase);
  pushOpenAICompat(providers, "orca", "Orca", env("ORCA_API_KEY"), env("ORCA_BASE_URL"), env("ORCA_MODEL") ? [env("ORCA_MODEL")] : undefined);

  for (let i = 1; i <= 8; i++) {
    pushOpenAICompat(
      providers,
      `custom-${i}`,
      env(`CUSTOM_AI_${i}_NAME`) || env(`AI_PROVIDER_${i}_NAME`) || `Custom AI ${i}`,
      env(`CUSTOM_AI_${i}_API_KEY`) || env(`AI_PROVIDER_${i}_API_KEY`),
      env(`CUSTOM_AI_${i}_BASE_URL`) || env(`AI_PROVIDER_${i}_BASE_URL`),
      (env(`CUSTOM_AI_${i}_MODEL`) || env(`AI_PROVIDER_${i}_MODEL`)) ? [env(`CUSTOM_AI_${i}_MODEL`) || env(`AI_PROVIDER_${i}_MODEL`)] : undefined,
    );
  }

  const gw = (env("RAHYAR_AI_GATEWAY_URL") || env("RAHYAR_API_URL")).replace(/\/$/, "");
  const secret = env("RAHYAR_AI_BRIDGE_SECRET") || env("RAHYAR_AI_KEY");
  if (gw && secret) {
    providers.push({
      id: "rahyar-gateway",
      name: "RahYar AI Gateway",
      baseUrl: gw,
      modelsUrl: "/api/v1/ai/status",
      chatPath: "/api/v1/assistant/chat",
      apiKey: secret,
      modelsRequireAuth: true,
      authScheme: "raw",
      chatStyle: "rahyar",
      defaultModels: ["centralized-router"],
    });
  }

  const seen = new Set(providers.map((p) => p.id));
  for (const dyn of listEnvDiscoveredProviders(seen)) {
    pushOpenAICompat(providers, dyn.id, dyn.name, dyn.apiKey, dyn.baseUrl, dyn.defaultModels);
  }

  return providers;
}

function authHeaders(provider: AIProvider): Record<string, string> {
  const key = provider.apiKey || "";
  if (!key) return { "Content-Type": "application/json" };
  switch (provider.authScheme) {
    case "anthropic":
      return { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" };
    case "google":
      return { "Content-Type": "application/json" };
    case "raw":
      return { "Content-Type": "application/json", "X-RahYar-AI-Key": key };
    default:
      return { "Content-Type": "application/json", Authorization: `Bearer ${key}` };
  }
}

async function readJson(response: Response): Promise<any> {
  const raw = await response.text();
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Provider invalid JSON (HTTP ${response.status}): ${raw.replace(/\s+/g, " ").slice(0, 180)}`);
  }
}

function rankForModel(id: string): number {
  const lower = id.toLowerCase();
  if (/gpt-4o(?!-mini)|gpt-4\.1(?!-)|claude-sonnet|gemini-2\.5-pro|o3|o4/.test(lower)) return 100;
  if (/gpt-4o-mini|gpt-4\.1-mini|claude-3-5|gemini-2\.5-flash|gemini-2\.0|deepseek|llama-3\.3|70b/.test(lower)) return 90;
  if (/mini|flash|haiku|nano/.test(lower)) return 70;
  if (/gpt|claude|gemini|llama|qwen|kimi|deepseek|grok/.test(lower)) return 85;
  return 50;
}

export async function discoverModels(provider: AIProvider, options: { allowFallback?: boolean } = {}): Promise<AIModel[]> {
  const allowFallback = options.allowFallback !== false;
  const fallback = (ids: string[]) => ids.map((id) => ({ id, provider: provider.id, task: "chat" as const, rank: rankForModel(id) }));
  try {
    if (provider.chatStyle === "rahyar") {
      return [{ id: "centralized-router", provider: provider.id, task: "chat", rank: 70 }];
    }
    if (provider.chatStyle === "google") {
      const response = await fetch(`${provider.baseUrl}/models`, {
        method: "GET",
        headers: { "x-goog-api-key": provider.apiKey || "" },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return allowFallback ? fallback(provider.defaultModels || []) : [];
      const data = await readJson(response);
      const models = (data?.models || [])
        .filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map((m: any) => {
          const id = String(m.name || "").replace(/^models\//, "");
          return { id, provider: provider.id, task: "chat" as const, rank: rankForModel(id) };
        })
        .filter((m: AIModel) => m.id);
      return models.length ? models.slice(0, 25) : fallback(provider.defaultModels || []);
    }
    if (provider.chatStyle === "anthropic") {
      const response = await fetch(`${provider.baseUrl}/models`, {
        method: "GET",
        headers: authHeaders(provider),
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return allowFallback ? fallback(provider.defaultModels || []) : [];
      const data = await readJson(response);
      const models = (data?.data || [])
        .map((m: any) => m.id)
        .filter(Boolean)
        .map((id: string) => ({ id, provider: provider.id, task: "chat" as const, rank: rankForModel(id) }));
      return models.length ? models : fallback(provider.defaultModels || []);
    }
    const response = await fetch(`${provider.baseUrl}${provider.modelsUrl || "/models"}`, {
      method: "GET",
      headers: authHeaders(provider),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return allowFallback ? fallback(provider.defaultModels || []) : [];
    const data = await readJson(response);
    const models = (data?.data || data?.models || [])
      .map((m: any) => (typeof m === "string" ? m : m.id || m.name))
      .filter(Boolean)
      .map((id: string) => ({ id: String(id), provider: provider.id, task: "chat" as const, rank: rankForModel(String(id)) }));
    return models.length ? models.slice(0, 40) : fallback(provider.defaultModels || []);
  } catch {
    return allowFallback ? fallback(provider.defaultModels || []) : [];
  }
}

export async function discoverAllModels(options: { allowFallback?: boolean } = {}) {
  const providers = getConfiguredProviders();
  return Promise.all(
    providers.map(async (provider) => ({
      provider: { id: provider.id, name: provider.name, configured: Boolean(provider.apiKey) },
      models: await discoverModels(provider, options),
    })),
  );
}

async function chatOpenAI(provider: AIProvider, model: string, messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
  const response = await fetch(`${provider.baseUrl}${provider.chatPath || "/chat/completions"}`, {
    method: "POST",
    headers: authHeaders(provider),
    body: JSON.stringify({ model, messages, temperature: 0.3 }),
    signal,
  });
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || `HTTP ${response.status}`);
  }
  const reply = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || "";
  if (!reply) throw new Error("empty_reply");
  return String(reply);
}

async function chatAnthropic(provider: AIProvider, model: string, messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const converted = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
  const response = await fetch(`${provider.baseUrl}${provider.chatPath || "/messages"}`, {
    method: "POST",
    headers: authHeaders(provider),
    body: JSON.stringify({ model, max_tokens: 4096, system: system || undefined, messages: converted }),
    signal,
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error(data?.error?.message || `HTTP ${response.status}`);
  const parts = data?.content || [];
  const reply = parts.map((p: any) => p.text || "").join("");
  if (!reply) throw new Error("empty_reply");
  return reply;
}

async function chatGoogle(provider: AIProvider, model: string, messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const url = `${provider.baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(provider.apiKey || "")}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      generationConfig: { temperature: 0.3 },
    }),
    signal,
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error(data?.error?.message || `HTTP ${response.status}`);
  const reply = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
  if (!reply) throw new Error("empty_reply");
  return reply;
}

async function chatRahyar(provider: AIProvider, model: string, messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
  const response = await fetch(`${provider.baseUrl}${provider.chatPath}`, {
    method: "POST",
    headers: authHeaders(provider),
    body: JSON.stringify({ model, messages }),
    signal,
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
  const reply = data?.reply || data?.message || data?.content || data?.choices?.[0]?.message?.content || "";
  if (!reply) throw new Error("empty_reply");
  return String(reply);
}

export async function chatWithProvider(provider: AIProvider, model: string, messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
  switch (provider.chatStyle) {
    case "anthropic":
      return chatAnthropic(provider, model, messages, signal);
    case "google":
      return chatGoogle(provider, model, messages, signal);
    case "rahyar":
      return chatRahyar(provider, model, messages, signal);
    default:
      return chatOpenAI(provider, model, messages, signal);
  }
}

export async function chatExactProviderModel(
  messages: ChatMessage[],
  providerId: string,
  modelId: string,
  _clientId = "artistyar-web",
  signal?: AbortSignal,
): Promise<{ reply: string; provider: string; model: string }> {
  const providers = getConfiguredProviders();
  const provider = providers.find((p) => p.id === providerId);
  if (!provider) {
    const available = providers.map((p) => p.id).join(",") || "none";
    throw new Error(`provider_not_found:${providerId};available:${available}`);
  }
  if (!provider.apiKey && provider.id !== "ollama") {
    throw new Error(`provider_missing_key:${providerId}`);
  }
  const reply = await chatWithProvider(provider, modelId, messages, signal);
  if (!reply?.trim()) throw new Error("empty_reply");
  return { reply, provider: providerId, model: modelId };
}

export type RankedCandidate = {
  providerId: string;
  modelId: string;
  score: number;
  providerName: string;
};

/** Score: quality (0-100) + speed bias for admin responsiveness */
export function scoreModel(modelId: string): number {
  const id = modelId.toLowerCase();
  let quality = 50;
  let speed = 50;
  if (/gpt-4o(?!-mini)|claude-sonnet-4|claude-opus|gemini-2\.5-pro|o3|o4|gpt-4\.1(?!-mini)/.test(id)) {
    quality = 98;
    speed = 55;
  } else if (/gpt-4o-mini|gpt-4\.1-mini|claude-3-5-sonnet|gemini-2\.5-flash|gemini-2\.0-flash|deepseek-chat|llama-3\.3-70b|grok-3(?!-mini)/.test(id)) {
    quality = 88;
    speed = 75;
  } else if (/haiku|flash|mini|nano|instant|8b|small|lite/.test(id)) {
    quality = 72;
    speed = 95;
  } else if (/gpt|claude|gemini|llama|qwen|kimi|deepseek|grok|mistral|command/.test(id)) {
    quality = 80;
    speed = 65;
  }
  return Math.round(quality * 0.55 + speed * 0.45);
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout_${ms}ms:${label}`)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** Scan every env-configured provider, discover models, return ranked candidates */
export async function buildRankedCandidates(limit = 24): Promise<RankedCandidate[]> {
  const providers = getConfiguredProviders().filter((p) => Boolean(p.apiKey) || p.id === "ollama");
  const out: RankedCandidate[] = [];
  const seen = new Set<string>();

  for (const provider of providers) {
    const models: string[] = [];
    const tried = new Set<string>();
    for (const m of provider.defaultModels || []) {
      if (m && !tried.has(m)) {
        tried.add(m);
        models.push(m);
      }
    }
    try {
      const discovered = await withTimeout(
        discoverModels(provider, { allowFallback: true }),
        8000,
        `discover:${provider.id}`,
      );
      for (const m of discovered) {
        if (m.id && !tried.has(m.id)) {
          tried.add(m.id);
          models.push(m.id);
        }
      }
    } catch {
      /* defaults only */
    }
    if (!models.length && provider.defaultModels?.length) {
      models.push(...provider.defaultModels);
    }
    for (const modelId of models.slice(0, 8)) {
      const key = `${provider.id}::${modelId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        providerId: provider.id,
        modelId,
        score: scoreModel(modelId),
        providerName: provider.name,
      });
    }
  }

  out.sort((a, b) => b.score - a.score || a.providerId.localeCompare(b.providerId));
  return out.slice(0, limit);
}

export async function autoChat(
  messages: ChatMessage[],
  preferredProvider?: string,
  preferredModel?: string,
  _clientId = "artistyar-web",
  signal?: AbortSignal,
): Promise<{ reply: string; provider: string; model: string }> {
  const errors: string[] = [];

  // Preferred pair first, then full ranked failover
  const ranked = await buildRankedCandidates(30);
  const ordered: RankedCandidate[] = [];
  if (preferredProvider && preferredModel) {
    ordered.push({
      providerId: preferredProvider,
      modelId: preferredModel,
      score: 999,
      providerName: preferredProvider,
    });
  }
  for (const c of ranked) {
    if (preferredProvider && preferredModel && c.providerId === preferredProvider && c.modelId === preferredModel) continue;
    ordered.push(c);
  }

  if (!ordered.length) {
    const providers = getConfiguredProviders().filter((p) => Boolean(p.apiKey));
    if (!providers.length) throw new Error("no_provider_configured");
    for (const p of providers) {
      const m = p.defaultModels?.[0] || "gpt-4o-mini";
      ordered.push({ providerId: p.id, modelId: m, score: 1, providerName: p.name });
    }
  }

  if (!ordered.length) throw new Error("no_provider_configured");

  for (const c of ordered.slice(0, 12)) {
    if (signal?.aborted) throw new Error("aborted");
    try {
      const result = await withTimeout(
        chatExactProviderModel(messages, c.providerId, c.modelId, _clientId, signal),
        28_000,
        `${c.providerId}/${c.modelId}`,
      );
      if (result.reply?.trim()) return result;
      errors.push(`${c.providerId}/${c.modelId}: empty_reply`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${c.providerId}/${c.modelId}: ${msg}`);
      if (signal?.aborted) throw e;
    }
  }

  const detail = errors.slice(0, 8).join(" | ") || "unknown";
  throw new Error(`all_providers_failed:${detail.slice(0, 600)}`);
}

/** Safe status for admin UI — never returns secrets */
export function listProviderStatus(): Array<{
  id: string;
  name: string;
  hasKey: boolean;
  baseUrl: string;
  chatStyle: string;
  defaultModels: string[];
}> {
  return getConfiguredProviders().map((p) => ({
    id: p.id,
    name: p.name,
    hasKey: Boolean(p.apiKey),
    baseUrl: p.baseUrl,
    chatStyle: p.chatStyle,
    defaultModels: (p.defaultModels || []).slice(0, 5),
  }));
}
