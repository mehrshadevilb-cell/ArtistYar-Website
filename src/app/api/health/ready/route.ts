import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Readiness: should this instance receive normal traffic?
 * ArtistYar can serve marketing + most routes without RahYar.
 * RahYar unavailability is reported as degraded but does not fail readiness
 * (site remains usable). Hard failure (handler throw) → 503.
 */
export async function GET() {
  try {
    const rahyarConfigured = Boolean((process.env.RAHYAR_API_URL || "").trim());
    let rahyarOk = true;
    if (rahyarConfigured) {
      const backend = (process.env.RAHYAR_API_URL || "").replace(/\/$/, "");
      try {
        const res = await fetch(`${backend}/api/v1/health`, {
          cache: "no-store",
          signal: AbortSignal.timeout(3_000),
        });
        rahyarOk = res.ok;
      } catch {
        rahyarOk = false;
      }
    }

    const status = rahyarConfigured && !rahyarOk ? "degraded" : "ok";
    return NextResponse.json(
      {
        status,
        service: "artistyar-website",
        ready: true,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ status: "error", ready: false }, { status: 503 });
  }
}
