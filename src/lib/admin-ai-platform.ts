/** Admin AI Platform — shared types, config, skills, activity (Supabase-backed) */

import { createClient } from "@supabase/supabase-js";

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

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

const installedSkillsMem: SkillDefinition[] = [];
const activityLogMem: ActivityEvent[] = [];
const MAX_ACTIVITY = 80;

export type ActivityEvent = {
  id: string;
  at: string;
  kind: "info" | "tool" | "model" | "error" | "done";
  message: string;
  detail?: string;
};

async function loadDbSkills(): Promise<SkillDefinition[]> {
  if (!supabase) return [];
  try {
    const result = await supabase
      .from("admin_ai_skills")
      .select("id,name,description,version,tools,system_prompt_extra,enabled,source,source_url")
      .order("updated_at", { ascending: false });
    if (result.error) return [];
    return (result.data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description || "",
      version: r.version || "1.0.0",
      tools: Array.isArray(r.tools) ? r.tools : [],
      system_prompt_extra: r.system_prompt_extra || undefined,
      enabled: r.enabled !== false,
      source: (r.source as "github" | "builtin") || "github",
      sourceUrl: r.source_url || undefined,
    }));
  } catch {
    return [];
  }
}

export async function listAllSkills(): Promise<SkillDefinition[]> {
  const map = new Map<string, SkillDefinition>();
  for (const s of BUILTIN_SKILLS) map.set(s.id, s);
  const dbSkills = await loadDbSkills();
  for (const s of dbSkills) map.set(s.id, s);
  for (const s of installedSkillsMem) map.set(s.id, s);
  return Array.from(map.values());
}

export async function getSkill(id: string): Promise<SkillDefinition | undefined> {
  const all = await listAllSkills();
  return all.find((s) => s.id === id && s.enabled);
}

export async function installSkillFromGithubUrl(url: string, installedBy?: string): Promise<SkillDefinition> {
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

  if (supabase) {
    try {
      await supabase.from("admin_ai_skills").upsert(
        {
          id: skill.id,
          name: skill.name,
          description: skill.description,
          version: skill.version,
          tools: skill.tools,
          system_prompt_extra: skill.system_prompt_extra || null,
          enabled: skill.enabled,
          source: skill.source || "github",
          source_url: skill.sourceUrl || null,
          installed_by: installedBy || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
    } catch {
      const idx = installedSkillsMem.findIndex((s) => s.id === skill!.id);
      if (idx >= 0) installedSkillsMem[idx] = skill;
      else installedSkillsMem.push(skill);
    }
  } else {
    const idx = installedSkillsMem.findIndex((s) => s.id === skill!.id);
    if (idx >= 0) installedSkillsMem[idx] = skill;
    else installedSkillsMem.push(skill);
  }

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

export function pushActivity(kind: ActivityEvent["kind"], message: string, detail?: string) {
  const ev: ActivityEvent = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    kind,
    message: message.slice(0, 400),
    detail: detail?.slice(0, 2000),
  };
  activityLogMem.unshift(ev);
  if (activityLogMem.length > MAX_ACTIVITY) activityLogMem.length = MAX_ACTIVITY;
  if (supabase) {
    void (async () => {
      try {
        await supabase
          .from("admin_ai_activity")
          .insert({ kind: ev.kind, message: ev.message, detail: ev.detail || null });
      } catch {
        /* activity logging must never affect the request */
      }
    })();
  }
}

export async function listActivity(limit = 40): Promise<ActivityEvent[]> {
  if (supabase) {
    try {
      const result = await supabase
        .from("admin_ai_activity")
        .select("id,kind,message,detail,created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!result.error && result.data?.length) {
        return result.data.map((r: any) => ({
          id: String(r.id),
          at: r.created_at,
          kind: r.kind,
          message: r.message,
          detail: r.detail || undefined,
        }));
      }
    } catch {
      /* mem */
    }
  }
  return activityLogMem.slice(0, limit);
}

export async function clearActivity() {
  activityLogMem.length = 0;
  if (supabase) {
    try {
      await supabase.from("admin_ai_activity").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    } catch {
      /* ignore */
    }
  }
}
