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

/** Centralized AI gateway: the website does not duplicate provider routing. */
function gatewayUrl(): string {
  const explicit = (process.env.RAHYAR_AI_GATEWAY_URL || "").trim().replace(/\/$/, "");
  if (explicit) return explicit;
  // Same RahYar service hosts /api/v1/assistant/chat — allow a single base URL env.
  return (process.env.RAHYAR_API_URL || "").trim().replace(/\/$/, "");
}

function gatewaySecret(): string {
  return (
    process.env.RAHYAR_AI_BRIDGE_SECRET
    || process.env.RAHYAR_AI_KEY
    || ""
  ).trim();
}

function gatewayHeaders(): HeadersInit {
  const secret = gatewaySecret();
  return {
    "Content-Type": "application/json",
    ...(secret ? { "X-RahYar-AI-Key": secret } : {}),
  };
}

function requireGateway(): string {
  const url = gatewayUrl();
  if (!url) {
    throw new Error(
      "RAHYAR_API_URL یا RAHYAR_AI_GATEWAY_URL روی سرویس ArtistYar تنظیم نشده",
    );
  }
  if (!gatewaySecret()) {
    throw new Error(
      "RAHYAR_AI_BRIDGE_SECRET روی ArtistYar و RahYar باید یکسان باشد",
    );
  }
  return url;
}

export function getConfiguredProviders(): AIProvider[] {
  return [{
    id: "rahyar-gateway",
    name: "RahYar AI Gateway",
    baseUrl: gatewayUrl(),
    modelsUrl: `${gatewayUrl()}/api/v1/ai/status`,
    apiKey: gatewaySecret() || undefined,
    modelsRequireAuth: true,
    authScheme: "raw",
  }];
}

export async function discoverModels(provider: AIProvider): Promise<AIModel[]> {
  const gateway = requireGateway();
  const response = await fetch(`${gateway}/api/v1/ai/status`, {
    method: "GET",
    headers: gatewayHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const data = await response.json().catch(() => null) as { agent_status?: string } | null;
  if (!response.ok) throw new Error(`RahYar gateway status HTTP ${response.status}`);
  return data?.agent_status
    ? [{ id: "centralized-router", provider: provider.id, task: "chat" }]
    : [];
}

export async function discoverAllModels() {
  const provider = getConfiguredProviders()[0];
  try {
    return [{
      provider: {
        id: provider.id,
        name: provider.name,
        configured: Boolean(gatewayUrl() && gatewaySecret()),
      },
      models: await discoverModels(provider),
    }];
  } catch {
    return [{
      provider: {
        id: provider.id,
        name: provider.name,
        configured: Boolean(gatewayUrl() && gatewaySecret()),
      },
      models: [],
    }];
  }
}

export async function chatWithProvider(
  _provider: AIProvider,
  _model: string,
  messages: ChatMessage[],
  clientId = "artistyar-web",
) {
  const gateway = requireGateway();
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user" && message.content.trim());
  if (!lastUserMessage) throw new Error("No user message was provided");

  const response = await fetch(`${gateway}/api/v1/assistant/chat`, {
    method: "POST",
    headers: gatewayHeaders(),
    body: JSON.stringify({
      message: lastUserMessage.content.slice(0, 1000),
      client_id: clientId.slice(0, 64),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(70_000),
  });

  const data = await response.json().catch(() => null) as
    | { ok?: boolean; reply?: unknown; detail?: unknown }
    | null;
  if (!response.ok) {
    const detail = typeof data?.detail === "string"
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

export async function autoChat(
  messages: ChatMessage[],
  _preferredProvider?: string,
  _preferredModel?: string,
  clientId = "artistyar-web",
) {
  const provider = getConfiguredProviders()[0];
  const reply = await chatWithProvider(provider, "centralized-router", messages, clientId);
  return {
    reply,
    provider: provider.id,
    model: "centralized-router",
  };
}
