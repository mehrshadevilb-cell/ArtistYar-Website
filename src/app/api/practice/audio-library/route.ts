import { NextResponse } from "next/server";
import { categoriesInLibrary, listPublicCatalog, selectAudioSource } from "@/lib/practice-audio-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const exerciseId = url.searchParams.get("exerciseId") || undefined;
  const seed = Number(url.searchParams.get("seed") || Date.now() % 1e9);
  const difficulty = Number(url.searchParams.get("difficulty") || 200);

  if (exerciseId) {
    const sel = selectAudioSource({ exerciseId, seed, difficulty });
    return NextResponse.json({
      ok: true,
      selection: {
        id: sel.source.id,
        category: sel.source.category,
        labelFa: sel.source.labelFa,
        reason: sel.reason,
        durationSec: sel.source.durationSec,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    categories: categoriesInLibrary(),
    sources: listPublicCatalog(),
    count: listPublicCatalog().length,
  });
}
