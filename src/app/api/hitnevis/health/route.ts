import { NextResponse } from "next/server";
import { hitnevisHealth } from "@/lib/hitnevis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let kb: Record<string, unknown> | null = null;
  try {
    const { getRetrievalDiagnostics } = await import("@/lib/hitnevis/kb/retrieve");
    const d = getRetrievalDiagnostics();
    kb = {
      ok: d.songCount > 0,
      version: d.version,
      source: d.source,
      songCount: d.songCount,
      genres: d.genres,
      yearRange: [d.yearMin, d.yearMax],
      retrievals: d.retrievals,
      successfulRetrievals: d.successfulRetrievals,
      failedRetrievals: d.failedRetrievals,
      lastQueryAt: d.lastQueryAt,
    };
  } catch (e) {
    console.error("[hitnevis/health-kb]", e instanceof Error ? e.message : e);
    kb = { ok: false, error: "kb_unavailable" };
  }

  try {
    const health = await hitnevisHealth();
    return NextResponse.json(
      { ...health, knowledgeBase: kb },
      { status: health.ok ? 200 : 503 },
    );
  } catch (error) {
    console.error("[hitnevis/health]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      {
        ok: false,
        requestId: "hn-health-err",
        providersConfigured: 0,
        providersHealthy: 0,
        pool: [],
        knowledgeBase: kb,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message.slice(0, 120) : "health_failed",
      },
      { status: 503 },
    );
  }
}
