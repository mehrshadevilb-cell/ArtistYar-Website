/** Dynamic OpenAI-compatible providers from Render/CF env (any *_BASE_URL / *_URL / *_API_KEY). */

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

/** Prefixes already handled in getConfiguredProviders static list — skip re-discovery. */
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
  "VERCEL", "RENDER", "PORT", "HOSTNAME", "LANG", "TERM", "SHLVL", "SHELL",
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

/** Generic models when a custom OpenAI-compat gateway has no *_MODEL set. */
export const GENERIC_OPENAI_MODELS = [
  "gpt-4o-mini",
  "gpt-4o",
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "gemini-2.0-flash",
  "deepseek-chat",
];

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
    env(`${prefix}_ACCESS_TOKEN`) ||
    ""
  );
}

function resolveBase(prefix: string): string {
  const raw =
    env(`${prefix}_BASE_URL`) ||
    env(`${prefix}_URL`) ||
    env(`${prefix}_ENDPOINT`) ||
    env(`${prefix}_API_BASE`) ||
    env(`${prefix}_HOST`) ||
    DEFAULT_BASES[prefix.toUpperCase()] ||
    "";
  return raw
    .replace(/\/+$/, "")
    .replace(/\/chat\/completions$/i, "")
    .replace(/\/messages$/i, "");
}

function resolveModels(prefix: string): string[] | undefined {
  const multi = env(`${prefix}_MODELS`) || env(`${prefix}_MODEL_LIST`) || "";
  if (multi) {
    const list = multi.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    if (list.length) return list.slice(0, 8);
  }
  const single = env(`${prefix}_MODEL`) || env(`${prefix}_DEFAULT_MODEL`);
  return single ? [single] : undefined;
}

/**
 * Scan process.env for any provider-like prefix that has both a key and a base URL.
 * Covers: FOO_API_KEY + FOO_BASE_URL, FOO_URL, FOO_ENDPOINT, etc.
 */
export function listEnvDiscoveredProviders(existingIds: Set<string> = new Set()): DynProvider[] {
  const list: DynProvider[] = [];
  const envKeys = Object.keys(process.env || {});
  const prefixes = new Set<string>();

  const suffixPatterns: RegExp[] = [
    /_BASE_URL$/i,
    /_API_KEY$/i,
    /_APIKEY$/i,
    /_URL$/i,
    /_ENDPOINT$/i,
    /_API_BASE$/i,
    /_KEY$/i,
    /_TOKEN$/i,
  ];

  for (const k of envKeys) {
    if (!((process.env[k] || "").trim())) continue;
    let prefix = "";
    for (const re of suffixPatterns) {
      if (re.test(k)) {
        prefix = k.replace(re, "");
        break;
      }
    }
    if (!prefix) continue;
    const up = prefix.toUpperCase();
    if (STATIC.has(up) || STATIC.has(prefix)) continue;
    if (/^(npm_|corepack|yarn|pnpm|__|NEXT_|VERCEL_|RENDER_)/i.test(prefix)) continue;
    if (/^(COLOR|FORCE|EDITOR|LC_|SSL_|HTTP_|HTTPS_)/i.test(prefix)) continue;
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
    const models = resolveModels(prefix);
    list.push({
      id,
      name: env(`${prefix}_NAME`) || prefix.replace(/_/g, " "),
      baseUrl: base,
      apiKey: key,
      defaultModels: models?.length ? models : GENERIC_OPENAI_MODELS.slice(0, 3),
    });
  }
  return list;
}
