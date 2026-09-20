/** Admin AI Platform — shared types, config, and env helpers */

export type PlatformTab = "chat" | "dev" | "skills" | "models" | "memory" | "connectors" | "cost";

export type ConnectorId = "github" | "supabase" | "cloudflare" | "openai" | "anthropic" | "google";

export type SkillDefinition = {
  id: string;
  name: string;
  description: string;
  version: string;
  tools: string[];
  system_prompt_extra?: string;
  enabled: boolean;
};

export const BUILTIN_SKILLS: SkillDefinition[] = [
  {
    id: "code-review",
    name: "Code Review",
    description: "بررسی کد، باگ، و پیشنهاد refactor امن",
    version: "1.0.0",
    tools: ["github_search", "github_read", "github_pr"],
    system_prompt_extra: "در review دقیق، کوتاه و امن باش. هرگز secret را در خروجی ننویس.",
    enabled: true,
  },
  {
    id: "bugfix",
    name: "Bug Fix",
    description: "تشخیص و پیشنهاد/اعمال fix روی branch جدا",
    version: "1.0.0",
    tools: ["github_search", "github_read", "github_pr"],
    system_prompt_extra: "ریشه باگ را پیدا کن، minimal patch بده، روی main مستقیم ننویس.",
    enabled: true,
  },
  {
    id: "feature",
    name: "Feature Dev",
    description: "طراحی و پیاده‌سازی feature با Draft PR",
    version: "1.0.0",
    tools: ["github_search", "github_read", "github_pr"],
    system_prompt_extra: "convention پروژه را حفظ کن. تغییرات را محدود و قابل review نگه دار.",
    enabled: true,
  },
  {
    id: "docs",
    name: "Docs",
    description: "نوشتن/به‌روزرسانی مستندات",
    version: "1.0.0",
    tools: ["github_search", "github_read", "github_pr"],
    enabled: true,
  },
];

export function env(name: string): string {
  return (process.env[name] || "").trim();
}

export function githubConfig() {
  const token = env("GITHUB_TOKEN") || env("GH_TOKEN") || env("GITHUB_ADMIN_TOKEN");
  const owner = env("GITHUB_REPO_OWNER") || "mehrshadevilb-cell";
  const repo = env("GITHUB_REPO_NAME") || "ArtistYar-Website";
  const baseBranch = env("GITHUB_BASE_BRANCH") || "main";
  return { token, owner, repo, baseBranch, configured: Boolean(token) };
}

export function estimateCostUsd(inputTokens: number, outputTokens: number, modelId: string): number {
  const id = modelId.toLowerCase();
  let inRate = 0.5;
  let outRate = 1.5;
  if (/gpt-4o(?!-mini)|claude-sonnet|gemini-2\.5-pro|o3|gpt-4\.1(?!-)/.test(id)) {
    inRate = 3;
    outRate = 15;
  } else if (/mini|flash|haiku|nano/.test(id)) {
    inRate = 0.15;
    outRate = 0.6;
  }
  return (inputTokens / 1_000_000) * inRate + (outputTokens / 1_000_000) * outRate;
}
