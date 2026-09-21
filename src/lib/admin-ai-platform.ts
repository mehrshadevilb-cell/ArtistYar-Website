/** Admin AI Platform — shared types, config, skills, activity */

export type PlatformTab = "workspace" | "skills" | "models" | "memory" | "connectors" | "cost" | "control";

export type ConnectorId = "github" | "supabase" | "cloudflare" | "openai" | "anthropic" | "google";

export type SkillDefinition = {
  id: string;
  name: string;
  description: string;
  version: string;
  tools: string[];
  system_prompt_extra?: string;
  enabled: boolean;
  source?: "builtin" | "github";
  sourceUrl?: string;
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
    source: "builtin",
  },
  {
    id: "bugfix",
    name: "Bug Fix",
    description: "تشخیص و پیشنهاد/اعمال fix روی branch جدا",
    version: "1.0.0",
    tools: ["github_search", "github_read", "github_pr"],
    system_prompt_extra: "ریشه باگ را پیدا کن، minimal patch بده، روی main مستقیم ننویس.",
    enabled: true,
    source: "builtin",
  },
  {
    id: "feature",
    name: "Feature Dev",
    description: "طراحی و پیاده‌سازی feature با Draft PR",
    version: "1.0.0",
    tools: ["github_search", "github_read", "github_pr"],
    system_prompt_extra: "convention پروژه را حفظ کن. تغییرات را محدود و قابل review نگه دار.",
    enabled: true,
    source: "builtin",
  },
  {
    id: "docs",
    name: "Docs",
    description: "نوشتن/به‌روزرسانی مستندات",
    version: "1.0.0",
    tools: ["github_search", "github_read", "github_pr"],
    enabled: true,
    source: "builtin",
  },
  {
    id: "refactor",
    name: "Refactor",
    description: "بازنویسی امن بدون تغییر رفتار",
    version: "1.0.0",
    tools: ["github_search", "github_read", "github_pr"],
    system_prompt_extra: "رفتار را حفظ کن؛ فقط ساختار و خوانایی را بهتر کن. تست ذهنی بده.",
    enabled: true,
    source: "builtin",
  },
];

/** In-memory installed skills (process lifetime; optional persist later via Supabase). */
const installedSkills: SkillDefinition[] = [];

export function listAllSkills(): SkillDefinition[] {
  const map = new Map<string, SkillDefinition>();
  for (const s of BUILTIN_SKILLS) map.set(s.id, s);
  for (const s of installedSkills) map.set(s.id, s);
  return Array.from(map.values());
}

export function getSkill(id: string): SkillDefinition | undefined {
  return listAllSkills().find((s) => s.id === id && s.enabled);
}

/** Install / register a skill from a GitHub raw or repo URL pointing to SKILL.md or skill.json */
export async function installSkillFromGithubUrl(url: string): Promise<SkillDefinition> {
  const raw = url.trim();
  if (!raw) throw new Error("skill_url_empty");
  let fetchUrl = raw;
  const blob = raw.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i);
  if (blob) {
    fetchUrl = `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}/${blob[3]}/${blob[4]}`;
  }
  const res = await fetch(fetchUrl, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`skill_fetch_failed:${res.status}`);
  const text = await res.text();
  if (!text.trim()) throw new Error("skill_empty");

  let skill: SkillDefinition | null = null;
  if (text.trim().startsWith("{")) {
    try {
      const j = JSON.parse(text) as Partial<SkillDefinition>;
      if (j.id && j.name) {
        skill = {
          id: String(j.id).slice(0, 64),
          name: String(j.name).slice(0, 120),
          description: String(j.description || "").slice(0, 500),
          version: String(j.version || "1.0.0"),
          tools: Array.isArray(j.tools) ? j.tools.map(String).slice(0, 20) : ["github_search", "github_read"],
          system_prompt_extra: typeof j.system_prompt_extra === "string" ? j.system_prompt_extra.slice(0, 4000) : undefined,
          enabled: j.enabled !== false,
          source: "github",
          sourceUrl: raw,
        };
      }
    } catch {
      /* fall through */
    }
  }

  if (!skill) {
    const titleMatch = text.match(/^#\s+(.+)$/m);
    const name = (titleMatch?.[1] || "Imported Skill").trim().slice(0, 120);
    const id =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48) || `skill-${Date.now().toString(36)}`;
    const body = text.replace(/^#\s+.+$/m, "").trim();
    skill = {
      id,
      name,
      description: body.slice(0, 280).replace(/\n+/g, " "),
      version: "1.0.0",
      tools: ["github_search", "github_read", "github_pr"],
      system_prompt_extra: body.slice(0, 4000),
      enabled: true,
      source: "github",
      sourceUrl: raw,
    };
  }

  const idx = installedSkills.findIndex((s) => s.id === skill!.id);
  if (idx >= 0) installedSkills[idx] = skill;
  else installedSkills.push(skill);
  return skill;
}

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

export type ActivityEvent = {
  id: string;
  at: string;
  kind: "info" | "tool" | "model" | "error" | "done";
  message: string;
  detail?: string;
};

const activityLog: ActivityEvent[] = [];
const MAX_ACTIVITY = 80;

export function pushActivity(kind: ActivityEvent["kind"], message: string, detail?: string) {
  activityLog.unshift({
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    kind,
    message: message.slice(0, 400),
    detail: detail?.slice(0, 2000),
  });
  if (activityLog.length > MAX_ACTIVITY) activityLog.length = MAX_ACTIVITY;
}

export function listActivity(limit = 40): ActivityEvent[] {
  return activityLog.slice(0, limit);
}

export function clearActivity() {
  activityLog.length = 0;
}
