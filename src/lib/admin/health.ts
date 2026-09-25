/**
 * Modular system health-check architecture. Never exposes secrets.
 */
export type HealthStatus = "healthy" | "degraded" | "failed" | "unknown";

export type HealthCheckResult = {
  name: string;
  status: HealthStatus;
  severity: "critical" | "high" | "medium" | "low";
  latency_ms: number | null;
  message: string;
  last_checked: string;
  details?: Record<string, unknown>;
};

export type HealthReport = {
  overall: HealthStatus;
  checked_at: string;
  checks: HealthCheckResult[];
};

function statusFromOk(ok: boolean, degraded = false): HealthStatus {
  if (ok) return degraded ? "degraded" : "healthy";
  return "failed";
}

export async function runHealthChecks(): Promise<HealthReport> {
  const checks: HealthCheckResult[] = [];
  const now = new Date().toISOString();

  checks.push({
    name: "application",
    status: "healthy",
    severity: "critical",
    latency_ms: 0,
    message: "فرآیند Next.js پاسخگو است",
    last_checked: now,
  });

  const hasSessionSecret = Boolean(
    (process.env.ARTISTYAR_SESSION_SECRET || process.env.ARTISTYAR_ADMIN_PASSWORD || "").trim(),
  );
  checks.push({
    name: "authentication",
    status: statusFromOk(
      Boolean((process.env.ARTISTYAR_ADMIN_USERNAME || "").trim()) &&
        Boolean((process.env.ARTISTYAR_ADMIN_PASSWORD || "").trim()) &&
        hasSessionSecret,
    ),
    severity: "critical",
    latency_ms: null,
    message: hasSessionSecret
      ? "پیکربندی ورود ادمین کامل است"
      : "پیکربندی ورود ادمین ناقص است",
    last_checked: now,
  });

  const { hasAdminSupabase, getServiceSupabase } = await import("@/lib/admin/supabase-admin");
  if (!hasAdminSupabase()) {
    checks.push({
      name: "database",
      status: "failed",
      severity: "high",
      latency_ms: null,
      message: "Supabase پیکربندی نشده",
      last_checked: now,
    });
  } else {
    const t0 = Date.now();
    try {
      const sb = getServiceSupabase()!;
      const { error } = await sb.from("media_assets").select("id").limit(1);
      const latency = Date.now() - t0;
      if (error && !/relation|does not exist|42P01/i.test(error.message)) {
        checks.push({
          name: "database",
          status: "degraded",
          severity: "high",
          latency_ms: latency,
          message: "اتصال برقرار است اما کوئری نمونه مشکل دارد",
          last_checked: now,
        });
      } else {
        checks.push({
          name: "database",
          status: "healthy",
          severity: "high",
          latency_ms: latency,
          message: "اتصال Supabase سالم است",
          last_checked: now,
        });
      }
    } catch {
      checks.push({
        name: "database",
        status: "failed",
        severity: "high",
        latency_ms: Date.now() - t0,
        message: "خطا در اتصال به Supabase",
        last_checked: now,
      });
    }
  }

  const { backendBase } = await import("@/lib/admin-proxy");
  const base = backendBase();
  {
    const t0 = Date.now();
    try {
      const res = await fetch(`${base}/api/v1/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      checks.push({
        name: "backend",
        status: res.ok ? "healthy" : "degraded",
        severity: "critical",
        latency_ms: Date.now() - t0,
        message: res.ok
          ? "backend راه‌یار در دسترس است"
          : `backend پاسخ ${res.status} داد`,
        last_checked: now,
      });
    } catch {
      checks.push({
        name: "backend",
        status: "failed",
        severity: "critical",
        latency_ms: Date.now() - t0,
        message: "backend راه‌یار در دسترس نیست",
        last_checked: now,
      });
    }
  }

  try {
    const { getConfiguredProviders } = await import("@/lib/ai-providers");
    const providers = getConfiguredProviders();
    checks.push({
      name: "ai_providers",
      status: providers.length > 0 ? "healthy" : "degraded",
      severity: "medium",
      latency_ms: null,
      message:
        providers.length > 0
          ? `${providers.length} provider پیکربندی شده`
          : "هیچ AI provider پیکربندی نشده",
      last_checked: now,
      details: { count: providers.length, ids: providers.map((p) => p.id) },
    });
  } catch {
    checks.push({
      name: "ai_providers",
      status: "unknown",
      severity: "medium",
      latency_ms: null,
      message: "نتوانست وضعیت AI را بررسی کند",
      last_checked: now,
    });
  }

  try {
    const { hasSupabase, probeMediaConnection } = await import("@/lib/supabase-media");
    if (!hasSupabase()) {
      checks.push({
        name: "storage",
        status: "failed",
        severity: "high",
        latency_ms: null,
        message: "Storage پیکربندی نشده",
        last_checked: now,
      });
    } else {
      const t0 = Date.now();
      const media = await probeMediaConnection();
      checks.push({
        name: "storage",
        status: "healthy",
        severity: "high",
        latency_ms: Date.now() - t0,
        message: `bucket ${media.bucket} آماده است`,
        last_checked: now,
      });
    }
  } catch {
    checks.push({
      name: "storage",
      status: "failed",
      severity: "high",
      latency_ms: null,
      message: "بررسی storage ناموفق بود",
      last_checked: now,
    });
  }

  const overall = deriveOverall(checks);
  return { overall, checked_at: now, checks };
}

function deriveOverall(checks: HealthCheckResult[]): HealthStatus {
  if (checks.some((c) => c.status === "failed" && c.severity === "critical")) return "failed";
  if (checks.some((c) => c.status === "failed")) return "degraded";
  if (checks.some((c) => c.status === "degraded")) return "degraded";
  if (checks.every((c) => c.status === "healthy")) return "healthy";
  return "unknown";
}
