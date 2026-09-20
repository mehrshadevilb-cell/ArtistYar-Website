/**
 * Music Intent Parser
 * Converts Persian / English natural language into GenerationSpec.
 * Rule-based first (deterministic, free); optional LLM enrichment later.
 */

import {
  type AssetType,
  type GenerationSpec,
  type Instrument,
  type GenerationRole,
  type PerformanceStyle,
  DEFAULT_SPEC,
} from "./types";

const ASSET_PATTERNS: Array<{ re: RegExp; type: AssetType }> = [
  { re: /ریف|riff/i, type: "riff" },
  { re: /ملودی|melody|topline/i, type: "melody" },
  { re: /بیس\s*لاین|bassline|bass\s*line|خط\s*بیس/i, type: "bassline" },
  { re: /کورد|آکورد|chord\s*progression|progression|پیشروی/i, type: "chord_progression" },
  { re: /آرپژ|arpeggio/i, type: "arpeggio" },
  { re: /پد|pad/i, type: "pad" },
  { re: /فیل|fill|درام\s*فیل/i, type: "fill" },
  { re: /لوپ\s*درام|drum\s*loop|بیت/i, type: "drum_loop" },
  { re: /پرکاشن|percussion/i, type: "percussion_loop" },
  { re: /ترا[نnz]زیشن|transition|عبور/i, type: "transition" },
  { re: /اینترو|intro/i, type: "intro" },
  { re: /اوترو|outro/i, type: "outro" },
  { re: /رایزر|riser/i, type: "riser" },
  { re: /ایمپکت|impact/i, type: "impact" },
  { re: /تکسچر|texture/i, type: "texture" },
  { re: /افکت|sound\s*effect|sfx/i, type: "sound_effect" },
  { re: /گیتار\s*پارت|guitar\s*part/i, type: "guitar_part" },
  { re: /پیانو\s*پارت|piano\s*part/i, type: "piano_part" },
  { re: /سینت|synth\s*part/i, type: "synth_part" },
];

const INSTRUMENT_PATTERNS: Array<{ re: RegExp; inst: Instrument }> = [
  { re: /گیتار\s*الکتریک|electric\s*guitar/i, inst: "electric_guitar" },
  { re: /گیتار\s*آکوستیک|acoustic\s*guitar/i, inst: "acoustic_guitar" },
  { re: /گیتار|guitar/i, inst: "guitar" },
  { re: /بیس\s*الکتریک|electric\s*bass/i, inst: "electric_bass" },
  { re: /بیس|bass(?!\s*line)/i, inst: "bass" },
  { re: /پیانو|piano/i, inst: "piano" },
  { re: /کیبورد|keys|keyboard/i, inst: "keys" },
  { re: /سینت|synth/i, inst: "synth" },
  { re: /پد|pad/i, inst: "pad" },
  { re: /درام|drums?/i, inst: "drums" },
  { re: /پرکاشن|percussion/i, inst: "percussion" },
  { re: /زه|strings/i, inst: "strings" },
  { re: /برنج|brass/i, inst: "brass" },
  { re: /ووکال|vocal/i, inst: "vocals" },
];

const ROLE_PATTERNS: Array<{ re: RegExp; role: GenerationRole }> = [
  { re: /اینترو|intro/i, role: "intro" },
  { re: /ورس|verse/i, role: "verse" },
  { re: /پری\s*کروس|pre[-\s]?chorus/i, role: "pre_chorus" },
  { re: /کروس|chorus|هوک/i, role: "chorus" },
  { re: /بریج|bridge/i, role: "bridge" },
  { re: /اوترو|outro/i, role: "outro" },
  { re: /فیل|fill/i, role: "fill" },
  { re: /لید|lead/i, role: "lead" },
  { re: /بکینگ|backing/i, role: "backing" },
];

const STYLE_PATTERNS: Array<{ re: RegExp; style: PerformanceStyle }> = [
  { re: /طبیعی|natural|انسانی|human/i, style: "natural" },
  { re: /تایت|tight/i, style: "tight" },
  { re: /گریووی|groovy/i, style: "groovy" },
  { re: /شل|loose/i, style: "loose" },
  { re: /تهاجمی|aggressive/i, style: "aggressive" },
  { re: /نرم|soft/i, style: "soft" },
];

function extractBpm(text: string): number | undefined {
  const m =
    text.match(/(\d{2,3})\s*(?:bpm|بی\s*پی\s*ام|BPM)/i) ||
    text.match(/(?:bpm|بی\s*پی\s*ام)\s*[:=]?\s*(\d{2,3})/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (n >= 40 && n <= 240) return n;
  return undefined;
}

function extractBars(text: string): number | undefined {
  const m =
    text.match(/(\d{1,2})\s*(?:میزان|bars?|bar)/i) ||
    text.match(/(?:میزان|bars?)\s*[:=]?\s*(\d{1,2})/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (n >= 1 && n <= 64) return n;
  return undefined;
}

function extractKey(text: string): string | undefined {
  // Am, A minor, لا مینور, E major, etc.
  const western =
    text.match(/\b([A-G](?:#|b)?)\s*(major|minor|maj|min|m)?\b/i) ||
    text.match(/\b([A-G](?:#|b)?)\s*(ماژور|مینور)\b/i);
  if (western) {
    const note = western[1].toUpperCase();
    const qual = (western[2] || "").toLowerCase();
    if (qual.startsWith("min") || qual === "m" || qual.includes("مینور")) return `${note}m`;
    if (qual.startsWith("maj") || qual.includes("ماژور")) return note;
    return note;
  }
  const persian = text.match(/(لا|سی|دو|ر[ه]?|می|فا|سل)\s*(مینور|ماژور)?/i);
  if (persian) {
    const map: Record<string, string> = {
      لا: "A",
      سی: "B",
      دو: "C",
      ر: "D",
      ره: "D",
      می: "E",
      فا: "F",
      سل: "G",
    };
    const note = map[persian[1].toLowerCase()] || persian[1];
    const isMinor = (persian[2] || "").includes("مینور");
    return isMinor ? `${note}m` : note;
  }
  return undefined;
}

function extractMeter(text: string): string | undefined {
  const m = text.match(/(\d)\s*[\/٫]\s*(\d)/);
  if (m) return `${m[1]}/${m[2]}`;
  if (/شش\s*هشت|6\s*\/?\s*8/i.test(text)) return "6/8";
  if (/چهار\s*چهار|4\s*\/?\s*4/i.test(text)) return "4/4";
  return undefined;
}

function extractGenreRegional(text: string): { genre?: string; regionalStyle?: string } {
  let genre: string | undefined;
  let regionalStyle: string | undefined;
  if (/پاپ\s*ایرانی|ایرانی\s*پاپ|iranian\s*pop/i.test(text)) {
    genre = "pop";
    regionalStyle = "Iranian pop";
  } else if (/پاپ|pop/i.test(text)) genre = "pop";
  if (/راک|rock/i.test(text)) genre = "rock";
  if (/فانک|funk/i.test(text)) genre = "funk";
  if (/الکترونیک|electronic|edm/i.test(text)) genre = "electronic";
  if (/هیپ\s*هاپ|hip\s*hop|رپ/i.test(text)) genre = "hip-hop";
  if (/جاز|jazz/i.test(text)) genre = "jazz";
  if (/بلوز|blues/i.test(text)) genre = "blues";
  if (/رگ[یي]|reggae/i.test(text)) genre = "reggae";
  if (/ایرانی|persian|iranian/i.test(text) && !regionalStyle) regionalStyle = "Iranian";
  return { genre, regionalStyle };
}

function firstMatch<T>(patterns: Array<{ re: RegExp; type?: T; inst?: T; role?: T; style?: T }>, text: string, key: "type" | "inst" | "role" | "style"): T | undefined {
  for (const p of patterns) {
    if (p.re.test(text)) return (p as Record<string, T>)[key];
  }
  return undefined;
}

/**
 * Parse natural language prompt into a GenerationSpec.
 * Does not invent hard constraints the user did not request.
 */
export function parseMusicIntent(prompt: string): GenerationSpec {
  const text = (prompt || "").trim();
  if (!text) {
    return {
      ...DEFAULT_SPEC,
      prompt: "",
      assetType: "other",
      instrument: "unspecified",
    } as GenerationSpec;
  }

  const assetType =
    firstMatch(ASSET_PATTERNS, text, "type") ||
    (firstMatch(INSTRUMENT_PATTERNS, text, "inst") === "drums" ? "drum_loop" : undefined) ||
    "other";

  let instrument =
    firstMatch(INSTRUMENT_PATTERNS, text, "inst") || "unspecified";

  // Infer instrument from asset when missing
  if (instrument === "unspecified") {
    if (assetType === "bassline") instrument = "bass";
    else if (assetType === "drum_loop" || assetType === "fill" || assetType === "percussion_loop")
      instrument = "drums";
    else if (assetType === "chord_progression" || assetType === "piano_part") instrument = "piano";
    else if (assetType === "arpeggio" || assetType === "synth_part") instrument = "synth";
    else if (assetType === "riff" || assetType === "guitar_part") instrument = "guitar";
  }

  const role = firstMatch(ROLE_PATTERNS, text, "role");
  const performanceStyle = firstMatch(STYLE_PATTERNS, text, "style") || "natural";
  const bpm = extractBpm(text);
  const bars = extractBars(text);
  const key = extractKey(text);
  const meter = extractMeter(text);
  const { genre, regionalStyle } = extractGenreRegional(text);

  let humanization: GenerationSpec["humanization"] = "high";
  if (/ربات|robotic|مکانیکی/i.test(text)) humanization = "low";
  else if (/تایت|tight/i.test(text)) humanization = "medium";

  const negativeConstraints: string[] = [];
  if (/بدون\s*کراش|بدون\s*crash|no\s*crash/i.test(text)) negativeConstraints.push("no excessive crash cymbals");
  if (/بدون\s*ووکال|instrumental|بدون\s*آواز/i.test(text)) negativeConstraints.push("instrumental only");

  const density = /خلوت|sparse|minimal/i.test(text)
    ? "sparse"
    : /شلوغ|dense|full/i.test(text)
      ? "dense"
      : undefined;

  // Approximate duration from bars + bpm + meter when possible
  let durationMs: number | undefined;
  if (bars && bpm) {
    const beatsPerBar = meter?.startsWith("6") ? 6 : 4;
    const totalBeats = bars * beatsPerBar;
    durationMs = Math.round((totalBeats / bpm) * 60_000);
  }

  const spec: GenerationSpec = {
    prompt: text,
    assetType,
    instrument,
    genre,
    regionalStyle,
    bpm,
    key,
    scale: key?.endsWith("m") ? "minor" : key ? "major" : undefined,
    meter: meter || "4/4",
    bars,
    durationMs,
    role,
    performanceStyle,
    humanization,
    density,
    negativeConstraints: negativeConstraints.length ? negativeConstraints : undefined,
    quality: "high",
    outputFormat: "mp3",
    providerPolicy: "prefer_quality",
    variations: 1,
  };

  return spec;
}

/** Validate and clamp a partially-filled spec (from UI controls). */
export function normalizeSpec(partial: Partial<GenerationSpec> & { prompt: string }): GenerationSpec {
  const fromPrompt = parseMusicIntent(partial.prompt);
  const merged: GenerationSpec = {
    ...fromPrompt,
    ...Object.fromEntries(
      Object.entries(partial).filter(([, v]) => v !== undefined && v !== null && v !== ""),
    ),
    prompt: partial.prompt,
  } as GenerationSpec;

  if (merged.bpm != null) merged.bpm = Math.max(40, Math.min(240, Math.round(merged.bpm)));
  if (merged.bars != null) merged.bars = Math.max(1, Math.min(64, Math.round(merged.bars)));
  if (merged.durationMs != null)
    merged.durationMs = Math.max(1000, Math.min(180_000, Math.round(merged.durationMs)));

  return merged;
}
