import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness: process is up and can answer HTTP.
 * Does not probe external dependencies.
 * Suitable for Render healthCheckPath.
 */
export async function GET() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
