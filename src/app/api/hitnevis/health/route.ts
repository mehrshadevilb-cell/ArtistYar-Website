import { NextResponse } from "next/server";
import { hitnevisHealth } from "@/lib/hitnevis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snap = await hitnevisHealth();
    return NextResponse.json(snap, { status: snap.ok ? 200 : 503 });
  } catch (error) {
    console.error("[hitnevis/health]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      {
        ok: false,
        requestId: "hn-health-err",
        providersConfigured: 0,
        providersHealthy: 0,
        pool: [],
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
