export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIModel = {
  id: string;
  provider: string;
  task?: string;
  /** Higher = preferred when auto-selecting */
  rank?: number;
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
  /** OpenAI-compatible chat completions vs provider-specific */
  chatStyle: "openai" | "anthropic" | "google" | "rahyar";
};

// ---------------------------------------------------------------------------
// Ranking: prefer strong instruction-following + Persian-capable models
// ---------------------------------------------------------------------------
const MODEL_RANK: Record<string, number> = {
  // OpenAI
  "gpt-4o": 100,
  "gpt-4o-mini": 88,
  "gpt-4.1": 102,
  "gpt-4.1-mini": 90,
  "gpt-4.1-nano": 75,
  "o4-mini": 92,
  "o3-mini": 91,
  // Anthropic
  "claude-sonnet-4-20250514": 101,
  "claude-3-5-sonnet-20241022": 99,
  "claude-3-5-sonnet-latest": 99,
  "claude-3-5-haiku-20241022": 85,
  "claude-3-5-haiku-latest": 85,
  "claude-3-haiku-20240307": 70,
  // Google
  "gemini-2.0-flash": 94,
  "gemini-2.0-flash-001": 94,
  "gemini-1.5-pro": 96,
  "gemini-1.5-pro-latest": 96,
  "gemini-1.5-flash": 86,
  "gemini-1.5-flash-latest": 86,
  "gemini-2.5-flash": 95,
  "gemini-2.5-pro": 98,
  // Groq (fast)
  "llama-3.3-70b-versatile": 87,
  "llama-3.1-70b-versatile": 82,
  "llama-3.1-8b-instant": 65,
  "gemma2-9b-it": 68,
  "mixtral-8x7b-32768": 72,
  // OpenRouter aliases / common
  "openai/gpt-4o": 100,
  "openai/gpt-4o-mini": 88,
  "anthropic/claude-3.5-sonnet": 99,
  "google/gemini-2.0-flash-001": 94,
  "meta-llama/llama-3.3-70b-instruct": 87,
};

function rankForModel(id: string): number {
  if (MODEL_RANK[id] != null) return MODEL_RANK[id];
  const lower = id.toLowerCase();
  for (const [key, rank] of Object.entries(MODEL_RANK)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return rank - 2;
    }
  }
  // Prefer larger / newer-sounding names slightly
  if (/gpt-4|claude-3|gemini-2|llama-3\.3|70b|sonnet|pro/i.test(id)) return 80;
  if (/mini|flash|haiku|8b|instant/i.test(id)) return 60;
  return 40;
}

// ---------------------------------------------------------------------------
// Env helpers
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Provider registry — keys live on the website env
// ---------------------------------------------------------------------------
export function getConfiguredProviders(): AIProvider[] {
  const providers: AIProvider[] = [];

  const openaiKey = env("OPENAI_API_KEY");
  if (openaiKey) {
    providers.push({
      id: "openai",
      name: "OpenAI",
      baseUrl: env("OPENAI_BASE_URL") || "https://api.openai.com/v1",
      modelsUrl: "/models",
      chatPath: "/chat/completions",
      apiKey: openaiKey,
      modelsRequireAuth: true,
      authScheme: "bearer",
      chatStyle: "openai",
    });
  }

  const openrouterKey = env("OPENROUTER_API_KEY");
  if (openrouterKey) {
    providers.push({
      id: "openrouter",
      name: "OpenRouter",
      baseUrl: "https://openrouter.ai/api/v1",
      modelsUrl: "/models",
      chatPath: "/chat/completions",
      apiKey: openrouterKey,
      modelsRequireAuth: true,
      authScheme: "bearer",
      chatStyle: "openai",
    });
  }

  const groqKey = env("GROQ_API_KEY");
  if (groqKey) {
    providers.push({
      id: "groq",
      name: "Groq",
      baseUrl: "https://api.groq.com/openai/v1",
      modelsUrl: "/models",
      chatPath: "/chat/completions",
      apiKey: groqKey,
      modelsRequireAuth: true,
      authScheme: "bearer",
      chatStyle: "openai",
    });
  }

  const anthropicKey = env("ANTHROPIC_API_KEY");
  if (anthropicKey) {
    providers.push({
      id: "anthropic",
      name: "Anthropic",
      baseUrl: "https://api.anthropic.com/v1",
      chatPath: "/messages",
      apiKey: anthropicKey,
      modelsRequireAuth: true,
      authScheme: "anthropic",
      chatStyle: "anthropic",
    });
  }

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
    });
  }

  // Optional centralized RahYar gateway (backend bot)
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
    });
  }

  return providers;
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

// ---------------------------------------------------------------------------
// Model discovery
// ---------------------------------------------------------------------------
const ANTHROPIC_FALLBACK_MODELS = [
  "claude-sonnet-4-20250514",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
];

const GEMINI_FALLBACK_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
];

export async function discoverModels(provider: AIProvider): Promise<AIModel[]> {
  try {
    if (provider.chatStyle === "rahyar") {
      const response = await fetch(`${provider.baseUrl}/api/v1/ai/status`, {
        method: "GET",
        headers: authHeaders(provider),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      const data = (await response.json().catch(() => null)) as {
        agent_status?: string;
      } | null;
      if (!response.ok) return [];
      return data?.agent_status
        ? [{ id: "centralized-router", provider: provider.id, task: "chat", rank: 70 }]
        : [];
    }

    if (provider.chatStyle === "anthropic") {
      // Anthropic has no public models list endpoint for all accounts
      return ANTHROPIC_FALLBACK_MODELS.map((id) => ({
        id,
        provider: provider.id,
        task: "chat",
        rank: rankForModel(id),
      }));
    }

    if (provider.chatStyle === "google") {
      const url = `${provider.baseUrl}/models?key=${encodeURIComponent(provider.apiKey || "")}`;
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) {
        return GEMINI_FALLBACK_MODELS.map((id) => ({
          id,
          provider: provider.id,
          task: "chat",
          rank: rankForModel(id),
        }));
      }
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
              task: "chat",
              rank: rankForModel(raw),
            };
          })
          .filter((m) => m.id && !/embedding|aqa|gecko/i.test(m.id)) || [];
      return models.length
        ? models
        : GEMINI_FALLBACK_MODELS.map((id) => ({
            id,
            provider: provider.id,
            task: "chat",
            rank: rankForModel(id),
          }));
    }

    // OpenAI-compatible (OpenAI, Groq, OpenRouter, …)
    const modelsPath = provider.modelsUrl || "/models";
    const response = await fetch(`${provider.baseUrl}${modelsPath}`, {
      method: "GET",
      headers: authHeaders(provider),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return [];

    const data = (await response.json().catch(() => null)) as {
      data?: Array<{ id?: string }>;
    } | null;

    const list = (data?.data || [])
      .map((item) => (typeof item?.id === "string" ? item.id : ""))
      .filter(Boolean)
      .filter((id) => {
        // Keep chat-capable models; drop embeddings / whisper / tts / image
        if (/embed|whisper|tts|dall-e|moderation|realtime|audio|image|vision-preview/i.test(id)) {
          return false;
        }
        return true;
      })
      .map((id) => ({
        id,
        provider: provider.id,
        task: "chat",
        rank: rankForModel(id),
      }));

    // Prefer higher-ranked models first, keep a reasonable set
    return list.sort((a, b) => (b.rank || 0) - (a.rank || 0)).slice(0, 40);
  } catch {
    return [];
  }
}

export async function discoverAllModels() {
  const providers = getConfiguredProviders();
  if (!providers.length) {
    return [
      {
        provider: {
          id: "none",
          name: "No provider configured",
          configured: false,
        },
        models: [] as AIModel[],
      },
    ];
  }

  const results = await Promise.all(
    providers.map(async (provider) => {
      const models = await discoverModels(provider);
      return {
        provider: {
          id: provider.id,
          name: provider.name,
          configured: Boolean(provider.apiKey),
        },
        models,
      };
    }),
  );

  return results;
}

// ---------------------------------------------------------------------------
// Chat implementations
// ---------------------------------------------------------------------------
async function chatOpenAICompatible(
  provider: AIProvider,
  model: string,
  messages: ChatMessage[],
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    temperature: 0.6,
    max_tokens: 2048,
  };

  // OpenRouter extras
  const headers: Record<string, string> = {
    ...(authHeaders(provider) as Record<string, string>),
  };
  if (provider.id === "openrouter") {
    headers["HTTP-Referer"] = env("NEXT_PUBLIC_SITE_URL") || "https://artistyaar.ir";
    headers["X-Title"] = "ArtistYar RahYar AI";
  }

  const response = await fetch(`${provider.baseUrl}${provider.chatPath}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(70_000),
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
      max_tokens: 2048,
      temperature: 0.6,
      system: system || undefined,
      messages: rest,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(70_000),
  });

  const data = (await response.json().catch(() => null)) as {
    content?: Array<{ type?: string; text?: string }>;
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(
      data?.error?.message || `Anthropic HTTP ${response.status}`,
    );
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: system
        ? { parts: [{ text: system }] }
        : undefined,
      contents,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 2048,
      },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(70_000),
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
    signal: AbortSignal.timeout(70_000),
  });

  const data = (await response.json().catch(() => null)) as {
    ok?: boolean;
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
    if (detail === "ai_bridge_not_configured") {
      throw new Error(
        "روی RahYar مقدار RAHYAR_AI_BRIDGE_SECRET ست نشده (باید با ArtistYar یکی باشد)",
      );
    }
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
      return chatOpenAICompatible(provider, model, messages);
    case "anthropic":
      return chatAnthropic(provider, model, messages);
    case "google":
      return chatGoogle(provider, model, messages);
    case "rahyar":
      return chatRahYarGateway(provider, messages, clientId);
    default:
      throw new Error(`Unsupported chat style: ${provider.chatStyle}`);
  }
}

// ---------------------------------------------------------------------------
// Auto-select best model across all configured providers
// ---------------------------------------------------------------------------
export async function autoChat(
  messages: ChatMessage[],
  preferredProvider?: string,
  preferredModel?: string,
  clientId = "artistyar-web",
) {
  const providers = getConfiguredProviders();
  if (!providers.length) {
    throw new Error(
      "هیچ کلید API در env سایت تنظیم نشده. OPENAI_API_KEY / GROQ_API_KEY / ANTHROPIC_API_KEY / OPENROUTER_API_KEY / GEMINI_API_KEY یا Gateway راه‌یار را ست کن.",
    );
  }

  // Build candidate list: preferred first, then ranked discovery
  type Candidate = { provider: AIProvider; model: string; rank: number };
  const candidates: Candidate[] = [];

  const discovered = await discoverAllModels();

  for (const entry of discovered) {
    const provider = providers.find((p) => p.id === entry.provider.id);
    if (!provider) continue;

    for (const m of entry.models) {
      candidates.push({
        provider,
        model: m.id,
        rank: m.rank ?? rankForModel(m.id),
      });
    }

    // If discovery returned nothing but provider is configured, try a safe default
    if (entry.models.length === 0 && provider.chatStyle !== "rahyar") {
      const defaults: Record<string, string[]> = {
        openai: ["gpt-4o-mini", "gpt-4o"],
        groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
        openrouter: ["openai/gpt-4o-mini", "meta-llama/llama-3.3-70b-instruct"],
        anthropic: ANTHROPIC_FALLBACK_MODELS,
        google: GEMINI_FALLBACK_MODELS,
      };
      for (const id of defaults[provider.id] || []) {
        candidates.push({
          provider,
          model: id,
          rank: rankForModel(id),
        });
      }
    }
  }

  // Preferred explicit selection
  if (preferredProvider || preferredModel) {
    const preferred = candidates.filter((c) => {
      if (preferredProvider && c.provider.id !== preferredProvider) return false;
      if (preferredModel && c.model !== preferredModel) return false;
      return true;
    });
    if (preferred.length) {
      preferred.sort((a, b) => b.rank - a.rank);
      candidates.unshift(...preferred);
    }
  }

  // Dedupe by provider+model, keep highest rank order
  const seen = new Set<string>();
  const ordered = candidates
    .sort((a, b) => b.rank - a.rank)
    .filter((c) => {
      const key = `${c.provider.id}::${c.model}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (!ordered.length) {
    throw new Error(
      "هیچ مدلی از providerهای تنظیم‌شده پیدا نشد. کلیدها و دسترسی مدل را بررسی کن.",
    );
  }

  const errors: string[] = [];

  // Try top candidates (limit attempts to avoid long timeouts)
  const maxAttempts = Math.min(ordered.length, 5);
  for (let i = 0; i < maxAttempts; i++) {
    const { provider, model } = ordered[i];
    try {
      const reply = await chatWithProvider(
        provider,
        model,
        messages,
        clientId,
      );
      return {
        reply,
        provider: provider.id,
        model,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${provider.id}/${model}: ${msg}`);
    }
  }

  throw new Error(
    `اتصال به مدل‌های هوش مصنوعی برقرار نشد. ${errors.slice(0, 3).join(" | ")}`,
  );
}
