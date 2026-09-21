import { chatWithProvider, type ChatMessage, type AIProvider } from "@/lib/ai-providers";
import { getRuntimeProviderPool } from "@/lib/ai-runtime-providers";

const cooldown = new Map<string, number>();

function exhausted(message: string) {
  return /429|402|403|rate.?limit|quota|credit|credits|insufficient|billing|balance|funds|payment required|capacity|limit/i.test(message);
}
function cooldownMs(message: string) {
  if (/429|rate.?limit/i.test(message)) return 60_000;
  if (/402|403|credit|credits|quota|billing|balance|funds|payment required/i.test(message)) return 3_600_000;
  return 15_000;
}
function models(p: AIProvider) {
  return [...new Set((p.defaultModels || []).filter(Boolean))].slice(0, 8);
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

  const candidates: Array<{ provider: AIProvider; model: string; priority: number }> = [];
  for (let i = 0; i < providers.length; i += 1) {
    const p = providers[i];
    for (const model of models(p)) candidates.push({ provider: p, model, priority: i });
  }
  if (preferredProvider && preferredModel) {
    candidates.sort((a, b) =>
      Number(a.provider.id === preferredProvider && a.model === preferredModel) -
      Number(b.provider.id === preferredProvider && b.model === preferredModel)
    );
  }
  const errors: string[] = [];
  for (const candidate of candidates) {
    if (signal?.aborted) throw new Error("aborted");
    const key = candidate.provider.id + "::" + candidate.model;
    const until = cooldown.get(key) || 0;
    if (until > Date.now()) continue;
    try {
      const reply = await chatWithProvider(candidate.provider, candidate.model, messages, signal);
      cooldown.delete(key);
      return { reply, provider: candidate.provider.id, model: candidate.model };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(key + "=" + message.slice(0, 160));
      cooldown.set(key, Date.now() + cooldownMs(message));
      if (!exhausted(message)) cooldown.set(key, Date.now() + 15_000);
    }
  }
  throw new Error("all_providers_failed:" + errors.slice(0, 8).join(" | "));
}
