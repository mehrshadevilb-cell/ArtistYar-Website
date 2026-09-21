/** Dynamic OpenAI-compatible providers from Render/CF env (any *_BASE_URL or *_API_KEY). */

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

/** Prefixes already handled in getConfiguredProviders static list */
const STATIC = new Set([
  "OPENAI", "OPENROUTER", "XKIRO", "KIRA", "XTROUTER", "OPENCODE", "OPENCODE_ZEN",
  "AGENTROUTER", "AGENT_ROUTER", "ANTHROPIC", "CLAUDE", "CLAUD", "GROQ", "BYTEZ",
  "OLLAMA", "OLLAMA_HOST", "DEEPSEEK", "MISTRAL", "TOGETHER", "FIREWORKS", "XAI", "GROK",
  "FLARE", "ORCA", "CLOUDFLARE",
  "CUSTOM_AI_1", "CUSTOM_AI_2", "CUSTOM_AI_3", "CUSTOM_AI_4", "CUSTOM_AI_5", "CUSTOM_AI_6", "CUSTOM_AI_7", "CUSTOM_AI_8",
  "AI_PROVIDER_1", "AI_PROVIDER_2", "AI_PROVIDER_3", "AI_PROVIDER_4", "AI_PROVIDER_5", "AI_PROVIDER_6", "AI_PROVIDER_7", "AI_PROVIDER_8",
  "RAHYAR_AI_GATEWAY", "RAHYAR_API", "GOOGLE_GENERATIVE_AI", "GOOGLE", "GEMINI",
  "SUPABASE", "GITHUB", "NEXT_PUBLIC", "NODE", "NPM", "PATH", "HOME", "USER", "PWD",
  "ARTISTYAR", "WEB_ADMIN", "UVR", "MUSIC", "ELEVEN", "CF_API", "DATABASE", "POSTGRES",
]);

const DEFAULT_BASES: Record<string, string> = {
  OPENAI: "https://api.openai.com/v1",
  OPENROUTER: "https://openrouter.ai/api/v1",
  GROQ: "https://api.groq.com/openai/v1",
  DEEPSEEK: "https://api.deepseek.com/v1",
  MISTRAL: "https://api.mistral.ai/v1",
  TOGETHER: "https://api.together.xyz/v1",
  FIREWORKS: "https://api.fireworks.ai/inference/v1",
  XAI: "https://api.x.ai/v1",
  GROK: "https://api.x.ai/v1",
  ANTHROPIC: "https://api.anthropic.com/v1",
};

function slugify(prefix: string): string {
  return prefix.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "dyn";
}

function resolveKey(prefix: string): string {
  return (
    env(`${prefix}_API_KEY`) ||
    env(`${prefix}_KEY`) ||
    env(`${prefix}_TOKEN`) ||
    env(`${prefix}_SECRET`) ||
    env(`${prefix}_APIKEY`) ||
    ""
  );
}

function resolveBase(prefix: string): string {
  const raw =
    env(`${prefix}_BASE_URL`) ||
    env(`${prefix}_URL`) ||
    env(`${prefix}_ENDPOINT`) ||
    DEFAULT_BASES[prefix.toUpperCase()] ||
    "";
  return raw
    .replace(/\/+$/, "")
    .replace(/\/chat\/completions$/i, "")
    .replace(/\/messages$/i, "");
}

export function listEnvDiscoveredProviders(existingIds: Set<string> = new Set()): DynProvider[] {
  const list: DynProvider[] = [];
  const envKeys = Object.keys(process.env || {});
  const prefixes = new Set<string>();

  for (const k of envKeys) {
    if (!((process.env[k] || "").trim())) continue;
    let prefix = "";
    if (/_BASE_URL$/i.test(k)) prefix = k.replace(/_BASE_URL$/i, "");
    else if (/_API_KEY$/i.test(k)) prefix = k.replace(/_API_KEY$/i, "");
    else if (/_APIKEY$/i.test(k)) prefix = k.replace(/_APIKEY$/i, "");
    else continue;
    if (!prefix) continue;
    const up = prefix.toUpperCase();
    if (STATIC.has(up) || STATIC.has(prefix)) continue;
    if (/^(npm_|corepack|yarn|pnpm)/i.test(prefix)) continue;
    prefixes.add(prefix);
  }

  for (const prefix of prefixes) {
    const key = resolveKey(prefix);
    const base = resolveBase(prefix);
    if (!key || !base || !/^https?:\/\//i.test(base)) continue;
    const slug = slugify(prefix);
    let id = slug;
    if (existingIds.has(id)) id = `dyn-${slug}`;
    if (existingIds.has(id)) continue;
    existingIds.add(id);
    const model = env(`${prefix}_MODEL`) || env(`${prefix}_DEFAULT_MODEL`);
    list.push({
      id,
      name: env(`${prefix}_NAME`) || prefix.replace(/_/g, " "),
      baseUrl: base,
      apiKey: key,
      defaultModels: model ? [model] : undefined,
    });
  }
  return list;
}
