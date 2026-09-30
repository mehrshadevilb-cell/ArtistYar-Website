import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public health summary (safe for Render + external probes).
 * Does not expose backend URLs, secrets, or stack traces.
 * HTTP 200 = process can serve; body.status may be "ok" | "degraded".
 * For strict process liveness use /api/health/live.
 * For readiness-oriented checks use /api/health/ready.
 */
export async function GET() {
  try {
    const rahyarConfigured = Boolean((process.env.RAHYAR_API_URL || "").trim());
    let rahyarReachable: boolean | null = null;

    if (rahyarConfigured) {
      const backend = (process.env.RAHYAR_API_URL || "").replace(/\/$/, "");
      try {
        const res = await fetch(`${backend}/api/v1/health`, {
          cache: "no-store",
          signal: AbortSignal.timeout(3_000),
        });
        rahyarReachable = res.ok;
      } catch {
        rahyarReachable = false;
      }
    }

    const degraded = rahyarConfigured && rahyarReachable === false;
    return NextResponse.json(
      {
        status: degraded ? "degraded" : "ok",
        service: "artistyar-website",
        checks: {
          process: "ok",
          // Coarse only — no hostnames or credentials
          rahyar: rahyarConfigured ? (rahyarReachable ? "ok" : "unreachable") : "not_configured",
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ status: "error", service: "artistyar-website" }, { status: 503 });
  }
}
