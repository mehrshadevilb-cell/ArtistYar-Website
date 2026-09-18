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

const MODEL_RANK: Record<string, number> = {
  "gpt-4o": 100,
  "gpt-4o-mini": 88,
  "gpt-4.1": 102,
  "gpt-4.1-mini": 90,
  "gpt-4.1-nano": 75,
  "o4-mini": 92,
  "o3-mini": 91,
  "claude-sonnet-4-20250514": 101,
  "claude-3-5-sonnet-20241022": 99,
  "claude-3-5-sonnet-latest": 99,
  "claude-3-5-haiku-20241022": 85,
  "claude-3-5-haiku-latest": 85,
  "claude-3-haiku-20240307": 70,
  "gemini-2.0-flash": 94,
  "gemini-2.5-flash": 95,
  "gemini-2.5-pro": 98,
  "llama-3.3-70b-versatile": 87,
  "deepseek-chat": 86,
  "deepseek-reasoner": 89,
  "openai/gpt-4o": 100,
  "openai/gpt-4o-mini": 88,
  "anthropic/claude-3.5-sonnet": 99,
  "google/gemini-2.5-flash": 95,
  "google/gemini-2.5-pro": 98,
  "meta-llama/llama-3.3-70b-instruct": 87,
  "openai/gpt-5.6-sol": 96,
  "anthropic/claude-sonnet-4-5": 100,
  "gpt-5.6-sol": 96,
  "claude-sonnet-4-5": 100,
  "kimi-k2": 82,
  "qwen3-coder": 80,
};

function rankForModel(id: string): number {
  if (MODEL_RANK[id] != null) return MODEL_RANK[id];
  const lower = id.toLowerCase();
  for (const [key, rank] of Object.entries(MODEL_RANK)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return rank - 2;
    }
  }
  if (/gpt-4|gpt-5|claude|gemini-2|llama-3\.3|70b|sonnet|pro|deepseek|qwen/i.test(id)) return 80;
  if (/mini|flash|haiku|8b|instant|lite|small|nano/i.test(id)) return 60;
  return 40;
}

function isChatCapableModelStrict(id: string): boolean {
  return !/embed|whisper|tts|dall-e|moderation|realtime|audio|image|vision-preview|transcribe|sora|batch|search-preview|diarize|codex|computer-use|image-generation/i.test(
    id,
  );
}

function env(name: string): string {
  return (process.env[name] || "").trim();
}

function gatewayUrl(): string {
  const explicit = env("RAHYAR_AI_GATEWAY_URL").replace(/\/$/, "");
  if (explicit) return explicit;
  return env("RAHYAR_API_URL").replace(/\/$/, "");
}

function gatewaySecret(): string {
  return env("RAHYAR_AI_BRIDGE_SECRET") || env("RAHYAR_AI_KEY");
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
  // Normalize accidental full-endpoint values so chatPath is never duplicated.
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

  // OpenAI — https://api.openai.com/v1
  pushOpenAICompat(
    providers,
    "openai",
    "OpenAI",
    env("OPENAI_API_KEY"),
    env("OPENAI_BASE_URL") || "https://api.openai.com/v1",
    ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
  );

  // OpenRouter
  pushOpenAICompat(
    providers,
    "openrouter",
    "OpenRouter",
    env("OPENROUTER_API_KEY"),
    env("OPENROUTER_BASE_URL") || "https://openrouter.ai/api/v1",
    [
      "google/gemini-2.5-flash",
      "openai/gpt-4o-mini",
      "meta-llama/llama-3.3-70b-instruct",
    ],
  );

  // xKiro — https://api.xkiro.com/v1 (also accepts KIRA_* as alias)
  pushOpenAICompat(
    providers,
    "xkiro",
    "xKiro",
    env("XKIRO_API_KEY") || env("KIRA_API_KEY") || env("XTROUTER_API_KEY"),
    env("XKIRO_BASE_URL") ||
      env("KIRA_BASE_URL") ||
      "https://api.xkiro.com/v1",
    env("XKIRO_MODEL") ? [env("XKIRO_MODEL")] : [],
  );

  // OpenCode Zen — https://opencode.ai/zen/v1
  pushOpenAICompat(
    providers,
    "opencode",
    "OpenCode Zen",
    env("OPENCODE_API_KEY") || env("OPENCODE_ZEN_API_KEY"),
    env("OPENCODE_BASE_URL") ||
      env("OPENCODE_ZEN_BASE_URL") ||
      "https://opencode.ai/zen/v1",
    [
      env("OPENCODE_MODEL") || "kimi-k2",
      "qwen3-coder",
      "glm-5.1",
      "deepseek-v4-flash",
    ],
  );

  // AgentRouter — https://agentrouter.org/v1 or co.agentrouter.org/v1
  pushOpenAICompat(
    providers,
    "agentrouter",
    "AgentRouter",
    env("AGENTROUTER_API_KEY") || env("AGENT_ROUTER_API_KEY"),
    env("AGENTROUTER_BASE_URL") ||
      env("AGENT_ROUTER_BASE_URL") ||
      "https://co.agentrouter.org/v1",
    [
      env("AGENTROUTER_MODEL") || "gpt-5.5",
      "kimi-k2.6",
      "glm-5.2",
      "step3p5-code-alpha",
    ],
  );

  // Anthropic — https://api.anthropic.com/v1
  const anthropicKey =
    env("ANTHROPIC_API_KEY") ||
    env("CLAUDE_API_KEY") ||
    env("CLAUD_API_KEY");
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
      defaultModels: [
        "claude-sonnet-4-20250514",
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022",
      ],
    });
  }

  // Google Gemini
  const geminiKey =
    env("GOOGLE_GENERATIVE_AI_API_KEY") ||
    env("GEMINI_API_KEY") ||
    env("GOOGLE_API_KEY");
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
      defaultModels: [
        "gemini-3.1-pro-preview",
        "gemini-3.1-flash-lite",
        "gemini-3-flash-preview",
        "gemini-2.5-flash",
      ],
    });
  }

  pushOpenAICompat(
    providers,
    "groq",
    "Groq",
    env("GROQ_API_KEY"),
    "https://api.groq.com/openai/v1",
    ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
  );

  // Bytez
  pushOpenAICompat(
    providers,
    "bytez",
    "Bytez",
    env("BYTEZ_API_KEY") || env("BYTEZ_KEY"),
    env("BYTEZ_BASE_URL") || "https://api.bytez.com/models/v2/openai/v1",
    [
      env("BYTEZ_MODEL") || "Qwen/Qwen2.5-72B-Instruct",
      "Qwen/Qwen3-4B",
      "openai/gpt-4o-mini",
    ],
  );

  // Ollama
  const ollamaBase =
    env("OLLAMA_BASE_URL") ||
    env("OLLAMA_HOST") ||
    (env("OLLAMA_API_KEY") || env("OLLAMA_ENABLED") === "1"
      ? "http://127.0.0.1:11434/v1"
      : "");
  pushOpenAICompat(
    providers,
    "ollama",
    "Ollama",
    env("OLLAMA_API_KEY") || "ollama",
    ollamaBase,
    env("OLLAMA_MODEL")
      ? [env("OLLAMA_MODEL")]
      : ["llama3.2", "llama3.1", "mistral", "gemma2"],
  );

  pushOpenAICompat(
    providers,
    "deepseek",
    "DeepSeek",
    env("DEEPSEEK_API_KEY"),
    env("DEEPSEEK_BASE_URL") || "https://api.deepseek.com",
    ["deepseek-chat", "deepseek-reasoner"],
  );

  pushOpenAICompat(
    providers,
    "mistral",
    "Mistral",
    env("MISTRAL_API_KEY"),
    env("MISTRAL_BASE_URL") || "https://api.mistral.ai/v1",
    ["mistral-large-latest", "mistral-small-latest"],
  );

  pushOpenAICompat(
    providers,
    "together",
    "Together",
    env("TOGETHER_API_KEY"),
    "https://api.together.xyz/v1",
  );

  pushOpenAICompat(
    providers,
    "fireworks",
    "Fireworks",
    env("FIREWORKS_API_KEY"),
    "https://api.fireworks.ai/inference/v1",
  );

  pushOpenAICompat(
    providers,
    "xai",
    "xAI Grok",
    env("XAI_API_KEY") || env("GROK_API_KEY"),
    env("XAI_BASE_URL") || "https://api.x.ai/v1",
    ["grok-3", "grok-3-mini", "grok-2-latest"],
  );

  const flareKey = env("FLARE_API_KEY") || env("CLOUDFLARE_API_TOKEN");
  const flareBase =
    env("FLARE_BASE_URL") ||
    (env("CLOUDFLARE_ACCOUNT_ID")
      ? `https://api.cloudflare.com/client/v4/accounts/${env("CLOUDFLARE_ACCOUNT_ID")}/ai/v1`
      : "");
  pushOpenAICompat(providers, "flare", "Cloudflare / Flare", flareKey, flareBase);

  pushOpenAICompat(
    providers,
    "orca",
    "Orca",
    env("ORCA_API_KEY"),
    env("ORCA_BASE_URL"),
    env("ORCA_MODEL") ? [env("ORCA_MODEL")] : undefined,
  );

  // Generic slots — any OpenAI-compatible API you put in env
  for (let i = 1; i <= 8; i++) {
    const key = env(`CUSTOM_AI_${i}_API_KEY`) || env(`AI_PROVIDER_${i}_API_KEY`);
    const base =
      env(`CUSTOM_AI_${i}_BASE_URL`) || env(`AI_PROVIDER_${i}_BASE_URL`);
    const name =
      env(`CUSTOM_AI_${i}_NAME`) ||
      env(`AI_PROVIDER_${i}_NAME`) ||
      `Custom AI ${i}`;
    const model =
      env(`CUSTOM_AI_${i}_MODEL`) || env(`AI_PROVIDER_${i}_MODEL`);
    pushOpenAICompat(
      providers,
      `custom-${i}`,
      name,
      key,
      base,
      model ? [model] : undefined,
    );
  }

  const gw = gatewayUrl();
  const secret = gatewaySecret();
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

  return providers;
}

async function readJsonResponse<T>(response: Response): Promise<T | null> {
  const raw = await response.text();
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    const contentType = response.headers.get("content-type") || "";
    const preview = raw.replace(/\\s+/g, " ").slice(0, 220);
    throw new Error(
      contentType.includes("text/html")
        ? `Provider returned HTML instead of JSON (HTTP ${response.status}): ${preview}`
        : `Provider returned invalid JSON (HTTP ${response.status}): ${preview}`,
    );
  }
}

function authHeaders(provider: AIProvider): HeadersInit {
  const key = provider.apiKey || "";
  if (!key) return { "Content-Type": "application/json" };
  switch (provider.authScheme) {
    case "bearer":
      return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      };
    case "anthropic":
      return {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      };
    case "google":
      return { "Content-Type": "application/json" };
    case "raw":
      return {
        "Content-Type": "application/json",
        "X-RahYar-AI-Key": key,
      };
    default:
      return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      };
  }
}

const ANTHROPIC_FALLBACK = [
  "claude-sonnet-4-20250514",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
];
const GEMINI_FALLBACK = [
  "gemini-3.1-pro-preview",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
];

export async function discoverModels(provider: AIProvider): Promise<AIModel[]> {
  const fallback = (ids: string[]) =>
    ids.map((id) => ({
      id,
      provider: provider.id,
      task: "chat" as const,
      rank: rankForModel(id),
    }));

  try {
    if (provider.chatStyle === "rahyar") {
      const response = await fetch(`${provider.baseUrl}/api/v1/ai/status`, {
        method: "GET",
        headers: authHeaders(provider),
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      const data = await readJsonResponse<{
        agent_status?: string;
      } | null;
      if (!response.ok) return [];
      return data?.agent_status
        ? [{ id: "centralized-router", provider: provider.id, task: "chat", rank: 70 }]
        : [];
    }

    if (provider.chatStyle === "anthropic") {
      return fallback(provider.defaultModels || ANTHROPIC_FALLBACK);
    }

    if (provider.chatStyle === "google") {
      const url = `${provider.baseUrl}/models`;
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(3_500),
      });
      if (!response.ok) return fallback(provider.defaultModels || GEMINI_FALLBACK);
      const data = (await response.json().catch(() => null)) as {
        models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
      } | null;
      const models =
        data?.models
          ?.filter((m) =>
            (m.supportedGenerationMethods || []).includes("generateContent"),
          )
          .map((m) => {
            const raw = (m.name || "").replace(/^models\//, "");
            return {
              id: raw,
              provider: provider.id,
              task: "chat" as const,
              rank: rankForModel(raw),
            };
          })
          .filter((m) => m.id && isChatCapableModelStrict(m.id)) || [];
      return models.length
        ? models.sort((a, b) => (b.rank || 0) - (a.rank || 0)).slice(0, 25)
        : fallback(provider.defaultModels || GEMINI_FALLBACK);
    }

    const response = await fetch(
      `${provider.baseUrl}${provider.modelsUrl || "/models"}`,
      {
        method: "GET",
        headers: authHeaders(provider),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) {
      return provider.defaultModels ? fallback(provider.defaultModels) : [];
    }

    const data = (await response.json().catch(() => null)) as {
      data?: Array<{ id?: string; access_tier?: string }>;
      result?: Array<{ id?: string; name?: string; access_tier?: string }>;
      models?: Array<{ name?: string; model?: string; access_tier?: string }>;
    } | null;

    const rawEntries = [
      ...(data?.data || []).map((i) => ({ id: i.id || "", tier: i.access_tier })),
      ...(data?.result || []).map((i) => ({ id: i.id || i.name || "", tier: i.access_tier })),
      ...(data?.models || []).map((i) => ({ id: i.name || i.model || "", tier: i.access_tier })),
    ].filter((i) => i.id);

    const rawIds = rawEntries
      .filter((entry) =>
        provider.id !== "xkiro" ||
        env("XKIRO_FREE_ONLY") === "0" ||
        entry.tier === "free",
      )
      .map((entry) => entry.id);

    const list = rawEntries
      .filter((entry) => rawIds.includes(entry.id))
      .filter((entry) => isChatCapableModelStrict(entry.id))
      .map((entry) => ({
        id: entry.id,
        provider: provider.id,
        task: "chat" as const,
        accessTier: entry.tier,
        rank: rankForModel(entry.id) + (entry.tier === "free" ? 35 : entry.tier === "paid" ? 10 : 0),
      }));

    if (list.length) {
      return list.sort((a, b) => (b.rank || 0) - (a.rank || 0)).slice(0, 40);
    }
    return provider.defaultModels ? fallback(provider.defaultModels) : [];
  } catch {
    return provider.defaultModels ? fallback(provider.defaultModels) : [];
  }
}

export async function discoverAllModels() {
  const providers = getConfiguredProviders();
  if (!providers.length) {
    return [
      {
        provider: { id: "none", name: "No provider configured", configured: false },
        models: [] as AIModel[],
      },
    ];
  }
  return Promise.all(
    providers.map(async (provider) => ({
      provider: {
        id: provider.id,
        name: provider.name,
        configured: Boolean(provider.apiKey),
      },
      models: await discoverModels(provider),
    })),
  );
}

async function chatOpenAICompatible(
  provider: AIProvider,
  model: string,
  messages: ChatMessage[],
  clientId = "artistyar-web",
): Promise<string> {
  const headers: Record<string, string> = {
    ...(authHeaders(provider) as Record<string, string>),
  };
  if (provider.id === "openrouter") {
    headers["HTTP-Referer"] =
      env("NEXT_PUBLIC_SITE_URL") || "https://artistyaar.ir";
    headers["X-Title"] = "ArtistYar RahYar AI";
  }

  const response = await fetch(`${provider.baseUrl}${provider.chatPath}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: 0.6,
      max_tokens: clientId.includes("coding") ? 12000 : 2048,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  const data = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(
      data?.error?.message || `${provider.name} HTTP ${response.status}`,
    );
  }
  const content = data?.choices?.[0]?.message?.content?.trim() || "";
  if (!content) throw new Error(`${provider.name}: empty response`);
  return content;
}

async function chatAnthropic(
  provider: AIProvider,
  model: string,
  messages: ChatMessage[],
  clientId = "artistyar-web",
): Promise<string> {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const rest = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

  const response = await fetch(`${provider.baseUrl}${provider.chatPath}`, {
    method: "POST",
    headers: authHeaders(provider),
    body: JSON.stringify({
      model,
      max_tokens: clientId.includes("coding") ? 12000 : 2048,
      temperature: 0.6,
      system: system || undefined,
      messages: rest,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  });

  const data = (await response.json().catch(() => null)) as {
    content?: Array<{ type?: string; text?: string }>;
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(data?.error?.message || `Anthropic HTTP ${response.status}`);
  }
  const text =
    data?.content
      ?.filter((c) => c.type === "text")
      .map((c) => c.text || "")
      .join("")
      .trim() || "";
  if (!text) throw new Error("Anthropic: empty response");
  return text;
}

async function chatGoogle(
  provider: AIProvider,
  model: string,
  messages: ChatMessage[],
  clientId = "artistyar-web",
): Promise<string> {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const url = `${provider.baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(provider.apiKey || "")}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": provider.apiKey || "",
    },
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents,
      generationConfig: { temperature: 0.6, maxOutputTokens: clientId.includes("coding") ? 12000 : 2048 },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  });

  const data = (await response.json().catch(() => null)) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(data?.error?.message || `Gemini HTTP ${response.status}`);
  }
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || "")
      .join("")
      .trim() || "";
  if (!text) throw new Error("Gemini: empty response");
  return text;
}

async function chatRahYarGateway(
  provider: AIProvider,
  messages: ChatMessage[],
  clientId: string,
): Promise<string> {
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user" && m.content.trim());
  if (!lastUserMessage) throw new Error("No user message was provided");

  const response = await fetch(`${provider.baseUrl}${provider.chatPath}`, {
    method: "POST",
    headers: authHeaders(provider),
    body: JSON.stringify({
      message: lastUserMessage.content.slice(0, 1000),
      client_id: clientId.slice(0, 64),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  });

  const data = (await response.json().catch(() => null)) as {
    reply?: unknown;
    detail?: unknown;
  } | null;

  if (!response.ok) {
    const detail =
      typeof data?.detail === "string"
        ? data.detail
        : typeof data?.reply === "string"
          ? data.reply
          : `HTTP ${response.status}`;
    throw new Error(`RahYar gateway: ${detail}`);
  }
  const content = typeof data?.reply === "string" ? data.reply.trim() : "";
  if (!content) throw new Error("RahYar gateway: empty assistant response");
  return content;
}

export async function chatWithProvider(
  provider: AIProvider,
  model: string,
  messages: ChatMessage[],
  clientId = "artistyar-web",
): Promise<string> {
  switch (provider.chatStyle) {
    case "openai":
      return chatOpenAICompatible(provider, model, messages, clientId);
    case "anthropic":
      return chatAnthropic(provider, model, messages, clientId);
    case "google":
      return chatGoogle(provider, model, messages, clientId);
    case "rahyar":
      return chatRahYarGateway(provider, messages, clientId);
    default:
      throw new Error(`Unsupported chat style: ${provider.chatStyle}`);
  }
}

function isModelAccessError(message: string): boolean {
  return /premium model|requires an active paid plan|requires .*balance|plan .*allows|model .*not available|model .*unavailable|model .*not found|unknown model|unsupported model|permission.?denied.*model|model.*permission/i.test(message);
}

function isProviderFatalError(message: string): boolean {
  if (isModelAccessError(message)) return false;
  return /no credits|insufficient.?quota|billing|credit|payment|invalid.?api.?key|incorrect.?api.?key|authentication|unauthorized|401|403|permission.?denied|api key not valid|account.?deactivated|exceeded.?your.?current.?quota|cannot post .*chat\/completions|http 405|http 404/i.test(
    message,
  );
}

export async function autoChat(
  messages: ChatMessage[],
  preferredProvider?: string,
  preferredModel?: string,
  clientId = "artistyar-web",
) {
  const providers = getConfiguredProviders();
  if (!providers.length) {
    throw new Error(
      "هیچ کلید API در env نیست. XKIRO / OPENCODE / AGENTROUTER / OPENAI / ANTHROPIC / OPENROUTER / GOOGLE و … را ست کن.",
    );
  }

  type Candidate = { provider: AIProvider; model: string; rank: number };
  const candidates: Candidate[] = [];
  const now = Date.now();\n  let discovered: Awaited<ReturnType<typeof discoverAllModels>>;\n  if (modelDiscoveryCache && modelDiscoveryCache.expiresAt > now) {\n    discovered = modelDiscoveryCache.value;\n  } else {\n    discovered = await discoverAllModels();\n    modelDiscoveryCache = { expiresAt: now + MODEL_DISCOVERY_CACHE_MS, value: discovered };\n  }

  for (const entry of discovered) {
    const provider = providers.find((p) => p.id === entry.provider.id);
    if (!provider) continue;
    for (const m of entry.models) {
      if (!isChatCapableModelStrict(m.id)) continue;
      candidates.push({
        provider,
        model: m.id,
        rank: m.rank ?? rankForModel(m.id),
      });
    }
    if (!entry.models.length && provider.defaultModels?.length) {
      for (const id of provider.defaultModels) {
        candidates.push({ provider, model: id, rank: rankForModel(id) });
      }
    }
  }

  if (preferredProvider || preferredModel) {
    const preferred = candidates
      .filter((c) => {
        if (preferredProvider && c.provider.id !== preferredProvider) return false;
        if (preferredModel && c.model !== preferredModel) return false;
        return true;
      })
      .sort((a, b) => b.rank - a.rank);
    candidates.unshift(...preferred);
  }

  const seen = new Set<string>();
  const byProvider = new Map<string, Candidate[]>();
  for (const c of candidates.sort((a, b) => b.rank - a.rank)) {
    const key = `${c.provider.id}::${c.model}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const list = byProvider.get(c.provider.id) || [];
    list.push(c);
    byProvider.set(c.provider.id, list);
  }

  const ordered: Candidate[] = [];
  let depth = 0;
  let added = true;
  while (added && ordered.length < 30) {
    added = false;
    for (const list of byProvider.values()) {
      if (depth < list.length) {
        ordered.push(list[depth]);
        added = true;
      }
    }
    depth += 1;
  }

  if (!ordered.length) {
    throw new Error("هیچ مدلی پیدا نشد. کلیدها و BASE_URL را در env بررسی کن.");
  }

  const errors: string[] = [];
  const skippedProviders = new Set<string>();
  const maxAttempts = Math.min(ordered.length, 30);

  for (let i = 0; i < maxAttempts; i++) {
    const { provider, model } = ordered[i];
    if (skippedProviders.has(provider.id)) continue;
    try {
      const reply = await chatWithProvider(provider, model, messages, clientId);
      return { reply, provider: provider.id, model };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${provider.id}/${model}: ${msg}`);
      if (isProviderFatalError(msg)) skippedProviders.add(provider.id);
    }
  }

  throw new Error(
    `هیچ مدل زنده‌ای پاسخ نداد. ${errors.slice(0, 5).join(" | ")}`,
  );
}
