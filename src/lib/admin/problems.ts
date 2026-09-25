/**
 * Problems Center foundation — actionable system issues.
 */
export type ProblemSeverity = "critical" | "high" | "medium" | "low" | "info";
export type ProblemStatus = "open" | "acknowledged" | "resolved";
export type ProblemCategory =
  | "integration"
  | "ai"
  | "payment"
  | "data"
  | "media"
  | "config"
  | "seo"
  | "security"
  | "admin"
  | "performance";

export type AdminProblem = {
  id: string;
  severity: ProblemSeverity;
  category: ProblemCategory;
  title: string;
  description: string;
  entity_type?: string | null;
  entity_id?: string | null;
  detected_at: string;
  status: ProblemStatus;
  recommended_action: string;
  href?: string | null;
};

const MEMORY_PROBLEMS = new Map<string, AdminProblem>();

export function upsertProblem(problem: AdminProblem): void {
  MEMORY_PROBLEMS.set(problem.id, problem);
}

export function listProblems(opts?: {
  status?: ProblemStatus;
  severity?: ProblemSeverity;
}): AdminProblem[] {
  let items = Array.from(MEMORY_PROBLEMS.values());
  if (opts?.status) items = items.filter((p) => p.status === opts.status);
  if (opts?.severity) items = items.filter((p) => p.severity === opts.severity);
  const rank: Record<ProblemSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  };
  return items.sort(
    (a, b) => rank[a.severity] - rank[b.severity] || b.detected_at.localeCompare(a.detected_at),
  );
}

export function setProblemStatus(id: string, status: ProblemStatus): AdminProblem | null {
  const p = MEMORY_PROBLEMS.get(id);
  if (!p) return null;
  const next = { ...p, status };
  MEMORY_PROBLEMS.set(id, next);
  return next;
}

export function problemsFromChecks(
  checks: Array<{ id: string; label: string; ok: boolean; detail: string }>,
): AdminProblem[] {
  const now = new Date().toISOString();
  const out: AdminProblem[] = [];
  for (const c of checks) {
    if (c.ok) {
      const existing = MEMORY_PROBLEMS.get(`diag:${c.id}`);
      if (existing && existing.status === "open") {
        MEMORY_PROBLEMS.set(`diag:${c.id}`, { ...existing, status: "resolved" });
      }
      continue;
    }
    const severity: ProblemSeverity =
      c.id === "admin_env" || c.id === "web_admin_key"
        ? "critical"
        : c.id === "supabase" ||
            c.id === "supabase_storage" ||
            c.id === "backend" ||
            c.id === "ai"
          ? "high"
          : "medium";
    const category: ProblemCategory =
      c.id.startsWith("ai") || c.id === "ai"
        ? "ai"
        : c.id.includes("supabase") || c.id.includes("storage")
          ? "media"
          : c.id.includes("admin") || c.id.includes("session")
            ? "security"
            : c.id.includes("backend") || c.id.includes("web_admin")
              ? "integration"
              : "config";
    const problem: AdminProblem = {
      id: `diag:${c.id}`,
      severity,
      category,
      title: c.label,
      description: c.detail.slice(0, 500),
      detected_at: now,
      status: "open",
      recommended_action: recommendedFor(c.id),
      href: "/admin/system",
    };
    upsertProblem(problem);
    out.push(problem);
  }
  return out;
}

function recommendedFor(id: string): string {
  switch (id) {
    case "admin_env":
      return "مقادیر ARTISTYAR_ADMIN_USERNAME و ARTISTYAR_ADMIN_PASSWORD را در Render تنظیم کنید.";
    case "web_admin_key":
      return "WEB_ADMIN_API_KEY را با کلید backend راه‌یار هماهنگ کنید.";
    case "supabase":
    case "supabase_storage":
      return "SUPABASE_URL و SUPABASE_SECRET_KEY را بررسی کنید و bucket رسانه را تایید کنید.";
    case "ai":
      return "حداقل یک کلید AI provider را در env تنظیم کنید.";
    case "backend":
      return "RAHYAR_API_URL و سلامت backend را بررسی کنید.";
    default:
      return "صفحه وضعیت سیستم را باز کنید و جزئیات را بررسی کنید.";
  }
}
