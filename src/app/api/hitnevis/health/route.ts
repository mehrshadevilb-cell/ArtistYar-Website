import { NextResponse } from "next/server";
import { hitnevisHealth } from "@/lib/hitnevis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const snap = await hitnevisHealth();
  return NextResponse.json(snap, { status: snap.ok ? 200 : 503 });
}
