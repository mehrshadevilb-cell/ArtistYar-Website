export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIModel = {
  id: string;
  provider: string;
  task?: string;
};

export type AIProvider = {
  id: string;
  name: string;
  baseUrl: string;
  modelsUrl: string;
  apiKey?: string;
  modelsRequireAuth: boolean;
  authScheme: "raw" | "bearer";
};

const providerDefinitions: Omit<AIProvider, "apiKey">[] = [
  {
    id: "bytez",
    name: "Bytez",
    baseUrl: "https://api.bytez.com/models/v2/openai/v1",
    modelsUrl: "https://api.bytez.com/models/v2/list/models?task=chat",
    modelsRequireAuth: true,
    authScheme: "raw",
  },
  {
    id: "dahl",
    name: "Dahl",
    baseUrl: "https://inference.dahl.global/v1",
    modelsUrl: "https://inference.dahl.global/v1/models",
    modelsRequireAuth: false,
    authScheme: "bearer",
  },
];

const modelCache = new Map<string, { expiresAt: number; models: AIModel[] }>();
const MODEL_CACHE_TTL_MS = 60_000;

function apiKeyFor(providerId: string) {
  if (providerId === "bytez") return process.env.BYTEZ_API_KEY?.trim();
  if (providerId === "dahl") return process.env.DAHL_API_KEY?.trim();
  return undefined;
}

export function getConfiguredProviders(): AIProvider[] {
  const order = (process.env.AI_PROVIDER_ORDER || "bytez,dahl")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const ordered = order.length
    ? order
    : providerDefinitions.map((provider) => provider.id);

  return ordered
    .map((id) => providerDefinitions.find((provider) => provider.id === id))
    .filter((provider): provider is Omit<AIProvider, "apiKey"> => Boolean(provider))
    .map((provider) => ({ ...provider, apiKey: apiKeyFor(provider.id) }));
}

async function fetchJson(url: string, headers: HeadersInit = {}) {
  const response = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Provider returned HTTP ${response.status}`);
  }
  return data;
}

export async function discoverModels(provider: AIProvider): Promise<AIModel[]> {
  const cached = modelCache.get(provider.id);
  if (cached && cached.expiresAt > Date.now()) return cached.models;

  if (provider.modelsRequireAuth && !provider.apiKey) return [];

  const headers: HeadersInit = provider.modelsRequireAuth
    ? { Authorization: provider.apiKey as string }
    : {};

  const data = await fetchJson(provider.modelsUrl, headers);
  const rawModels = provider.id === "bytez"
    ? (data as { output?: unknown[] } | null)?.output
    : (data as { data?: unknown[] } | null)?.data;

  const models = (Array.isArray(rawModels) ? rawModels : [])
    .map((model): AIModel | null => {
      if (typeof model === "string") {
        return { id: model, provider: provider.id };
      }

      if (!model || typeof model !== "object") return null;
      const value = model as Record<string, unknown>;
      const id = typeof value.id === "string"
        ? value.id
        : typeof value.modelId === "string"
          ? value.modelId
          : null;
      if (!id) return null;

      return {
        id,
        provider: provider.id,
        task: typeof value.task === "string" ? value.task : undefined,
      };
    })
    .filter((model): model is AIModel => Boolean(model));

  modelCache.set(provider.id, {
    expiresAt: Date.now() + MODEL_CACHE_TTL_MS,
    models,
  });

  return models;
}

export async function discoverAllModels() {
  const providers = getConfiguredProviders();
  const results = await Promise.all(
    providers.map(async (provider) => {
      try {
        return {
          provider: {
            id: provider.id,
            name: provider.name,
            configured: Boolean(provider.apiKey) || !provider.modelsRequireAuth,
          },
          models: await discoverModels(provider),
        };
      } catch {
        return {
          provider: {
            id: provider.id,
            name: provider.name,
            configured: Boolean(provider.apiKey) || !provider.modelsRequireAuth,
          },
          models: [],
        };
      }
    }),
  );

  return results;
}

export async function chatWithProvider(
  provider: AIProvider,
  model: string,
  messages: ChatMessage[],
) {
  if (!provider.apiKey) {
    throw new Error(`${provider.id} API key is not configured`);
  }

  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: provider.authScheme === "bearer"
        ? `Bearer ${provider.apiKey}`
        : provider.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_completion_tokens: 1200,
      stream: false,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });

  const data = await response.json().catch(() => null) as
    | { choices?: Array<{ message?: { content?: unknown } }>; error?: unknown }
    | null;

  if (!response.ok) {
    const detail = typeof data?.error === "string" ? data.error : `HTTP ${response.status}`;
    throw new Error(`${provider.name}: ${detail}`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error(`${provider.name}: empty model response`);
  }

  return content.trim();
}

export async function autoChat(messages: ChatMessage[], preferredProvider?: string, preferredModel?: string) {
  const providers = getConfiguredProviders();
  const ordered = preferredProvider
    ? [
        ...providers.filter((provider) => provider.id === preferredProvider),
        ...providers.filter((provider) => provider.id !== preferredProvider),
      ]
    : providers;

  const errors: string[] = [];

  for (const provider of ordered) {
    if (!provider.apiKey) continue;

    try {
      const models = await discoverModels(provider);
      if (!models.length) {
        errors.push(`${provider.id}: no live chat models`);
        continue;
      }

      const selectedModel = preferredProvider === provider.id && preferredModel
        ? models.some((model) => model.id === preferredModel)
          ? preferredModel
          : models[0].id
        : models[0].id;

      const reply = await chatWithProvider(provider, selectedModel, messages);
      return { reply, provider: provider.id, model: selectedModel };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${provider.id}: request failed`);
    }
  }

  throw new Error(errors.length ? errors.join(" | ") : "No AI provider is configured");
}
