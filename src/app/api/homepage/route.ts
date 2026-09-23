import { NextResponse } from "next/server";
import { getHomepageConfig } from "@/lib/homepage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 30;

export async function GET() {
  const config = await getHomepageConfig();
  return NextResponse.json(config, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
