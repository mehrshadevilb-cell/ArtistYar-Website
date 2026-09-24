import { cookies } from "next/headers";
import { NextResponse } from "next/server";
// See artifacts/music_analyzer_route.v3.ts for full content - temporary stub to fix PLACEHOLDER
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ ok: false, error: "deploying_v3" }, { status: 503 });
}
export async function POST() {
  return NextResponse.json({ ok: false, error: "deploying_v3" }, { status: 503 });
}
