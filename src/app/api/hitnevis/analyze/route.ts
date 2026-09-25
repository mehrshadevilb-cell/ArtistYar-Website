import { NextResponse } from "next/server";
import {
  analyzeHitDna,
  runHumanTests,
  detectCliches,
  formatHitDnaReport,
  formatHumanTestsReport,
} from "@/lib/hitnevis/hit-dna";
import { analyzeProsody, formatProsodyReport } from "@/lib/hitnevis/prosody";
import { extractLyricFeatures } from "@/lib/hitnevis/kb/lyric-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Local analytical endpoint — no AI keys required.
 * Body: { text: string, kind?: "dna" | "human" | "cliche" | "all", artistNotes?: string }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      text?: unknown;
      kind?: unknown;
      artistNotes?: unknown;
    };
    const text = typeof body.text === "string" ? body.text.trim().slice(0, 8000) : "";
    if (!text) {
      return NextResponse.json({ ok: false, error: "متن خالی است." }, { status: 400 });
    }
    const kind =
      body.kind === "dna" || body.kind === "human" || body.kind === "cliche" || body.kind === "all"
        ? body.kind
        : "all";
    const artistNotes =
      typeof body.artistNotes === "string" ? body.artistNotes.slice(0, 500) : undefined;

    const dna = analyzeHitDna(text);
    const human = runHumanTests(text, artistNotes);
    const cliches = detectCliches(text);
    const prosody = analyzeProsody(text);
    const corpusFeatures = extractLyricFeatures(text);

    if (kind === "dna") {
      return NextResponse.json({ ok: true, dna, report: formatHitDnaReport(dna) });
    }
    if (kind === "human") {
      return NextResponse.json({ ok: true, human, report: formatHumanTestsReport(human) });
    }
    if (kind === "cliche") {
      return NextResponse.json({ ok: true, cliches });
    }
    return NextResponse.json({
      ok: true,
      dna,
      human,
      cliches,
      prosody,
      dnaReport: formatHitDnaReport(dna),
      humanReport: formatHumanTestsReport(human),
      prosodyReport: formatProsodyReport(prosody),
      suggestions: dna.actionableSuggestions || [],
      corpusFeatures,
    });
  } catch (error) {
    console.error("[hitnevis/analyze]", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "خطای تحلیل محلی." }, { status: 500 });
  }
}
