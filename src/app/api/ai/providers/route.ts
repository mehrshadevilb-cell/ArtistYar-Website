import { NextResponse } from "next/server";
import { discoverAllModels } from "@/lib/ai-providers";

export const runtime = "nodejs";

type ProviderResult = Awaited<ReturnType<typeof discoverAllModels>>[number];

export async function GET() {
  const providers = await discoverAllModels();
  return NextResponse.json({
    ok: true,
    providers: providers as ProviderResult[],
    fetchedAt: new Date().toISOString(),
  });
}
