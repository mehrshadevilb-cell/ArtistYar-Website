import { NextResponse } from "next/server";
import { hitnevisHealth, getRetrievalDiagnostics } from "@/lib/hitnevis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = await hitnevisHealth();
    const kb = getRetrievalDiagnostics();
    return NextResponse.json(
      {
        ...health,
        knowledgeBase: {
          ok: kb.songCount > 0,
          version: kb.version,
          source: kb.source,
          songCount: kb.songCount,
          genres: kb.genres,
          yearRange: [kb.yearMin, kb.yearMax],
          retrievals: kb.retrievals,
          successfulRetrievals: kb.successfulRetrievals,
          failedRetrievals: kb.failedRetrievals,
          lastQueryAt: kb.lastQueryAt,
        },
      },
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
        knowledgeBase: null,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
