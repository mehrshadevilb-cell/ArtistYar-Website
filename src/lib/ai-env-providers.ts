/** Dynamic OpenAI-compatible providers from any *_BASE_URL in process.env (Render-friendly). */

export type DynProvider = {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  defaultModels?: string[];
};

function env(name: string): string {
  return (process.env[name] || "").trim();
}

const KNOWN = new Set([
  "OPENAI", "OPENROUTER", "XKIRO", "KIRA", "XTROUTER", "OPENCODE", "OPENCODE_ZEN",
  "AGENTROUTER", "AGENT_ROUTER", "ANTHROPIC", "GROQ", "BYTEZ", "OLLAMA", "OLLAMA_HOST",
  "DEEPSEEK", "MISTRAL", "TOGETHER", "FIREWORKS", "XAI", "GROK", "FLARE", "ORCA",
  "CUSTOM_AI_1", "CUSTOM_AI_2", "CUSTOM_AI_3", "CUSTOM_AI_4", "CUSTOM_AI_5", "CUSTOM_AI_6", "CUSTOM_AI_7", "CUSTOM_AI_8",
  "AI_PROVIDER_1", "AI_PROVIDER_2", "AI_PROVIDER_3", "AI_PROVIDER_4", "AI_PROVIDER_5", "AI_PROVIDER_6", "AI_PROVIDER_7", "AI_PROVIDER_8",
  "RAHYAR_AI_GATEWAY", "RAHYAR_API", "GOOGLE_GENERATIVE_AI",
]);

export function listEnvDiscoveredProviders(existingIds: Set<string> = new Set()): DynProvider[] {
  const list: DynProvider[] = [];
  const envKeys = Object.keys(process.env || {});
  const baseUrlKeys = envKeys.filter((k) => /_BASE_URL$/i.test(k) && (process.env[k] || "").trim());

  for (const baseKey of baseUrlKeys) {
    const prefix = baseKey.replace(/_BASE_URL$/i, "");
    if (KNOWN.has(prefix.toUpperCase()) || KNOWN.has(prefix)) continue;
    const base = (process.env[baseKey] || "").trim();
    if (!base || !/^https?:\/\//i.test(base)) continue;
    const slug = prefix.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "dyn";
    let id = slug;
    if (existingIds.has(id)) id = `dyn-${slug}`;
    if (existingIds.has(id)) continue;
    const key =
      env(`${prefix}_API_KEY`) ||
      env(`${prefix}_KEY`) ||
      env(`${prefix}_TOKEN`) ||
      env(`${prefix}_SECRET`) ||
      "";
    if (!key) continue;
    const name = env(`${prefix}_NAME`) || prefix.replace(/_/g, " ");
    const model = env(`${prefix}_MODEL`);
    existingIds.add(id);
    list.push({
      id,
      name,
      baseUrl: base.replace(/\/+$/, "").replace(/\/chat\/completions$/i, "").replace(/\/messages$/i, ""),
      apiKey: key,
      defaultModels: model ? [model] : undefined,
    });
  }
  return list;
}
