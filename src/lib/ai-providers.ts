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

/**
 * The website deliberately does not maintain a second provider router.
 * RahYar is the single AI gateway so Bytez/Dahl/OpenRouter/etc. discovery,
 * failover, cooldowns and knowledge context stay identical across surfaces.
 */
function gatewayUrl(): string {
  return (process.env.RAHYAR_AI_GATEWAY_URL || "").trim().replace(/\/$/, "");
}

function gatewaySecret(): string {
  return (process.env.RAHYAR_AI_BRIDGE_SECRET || "").trim();
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
  if (!url) throw new Error("RahYar AI gateway is not configured");
  if (!gatewaySecret()) throw new Error("RahYar AI gateway secret is not configured");
  return url;
}

export function getConfiguredProviders(): AIProvider[] {
  return [
    {
      id: "rahyar-gateway",
      name: "RahYar AI Gateway",
      baseUrl: gatewayUrl(),
      modelsUrl: `${gatewayUrl()}/api/v1/ai/status`,
      apiKey: gatewaySecret() || undefined,
      modelsRequireAuth: true,
      authScheme: "raw",
    },
  ];
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

  // The gateway intentionally hides provider credentials and exposes status
  // text rather than a public model catalog. Keep a synthetic route entry for
  // callers that only need to know whether the centralized AI stack is alive.
  if (!data?.agent_status) return [];
  return [{ id: "centralized-router", provider: provider.id, task: "chat" }];
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
      client_id: "artistyar-web",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(70_000),
  });

  const data = await response.json().catch(() => null) as
    | { ok?: boolean; reply?: unknown; detail?: unknown }
    | null;

  if (!response.ok) {
    const detail = typeof data?.detail === "string" ? data.detail : `HTTP ${response.status}`;
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
) {
  const provider = getConfiguredProviders()[0];
  const reply = await chatWithProvider(provider, "centralized-router", messages);
  return {
    reply,
    provider: provider.id,
    model: "centralized-router",
  };
}
