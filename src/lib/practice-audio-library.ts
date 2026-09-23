/**
 * ArtistYar Practice — professional audio content library.
 * Catalog of sources (synthetic recipes + optional stored files).
 * Deterministic selection, variety ring, safe fallback — never silent.
 */

import type { AudioProgram } from "@/lib/practice-exercises/types";
import { pick, seeded } from "@/lib/practice-exercises/util";

export type AudioCategory =
  | "vocals" | "drums" | "kick" | "snare" | "percussion" | "bass"
  | "piano" | "guitar" | "synth" | "strings" | "fx"
  | "full_mix" | "vocal_instrumental" | "stems";

export type AudioSourceMeta = {
  id: string;
  category: AudioCategory;
  label: string;
  labelFa: string;
  genre?: string;
  tempoBpm?: number;
  musicalKey?: string;
  durationSec: number;
  loudnessLufs?: number;
  sampleRate?: number;
  channels?: 1 | 2;
  difficultyMin?: number;
  difficultyMax?: number;
  compatible: string[];
  tags?: string[];
  storagePath?: string | null;
  recipe: AudioProgram;
  enabled: boolean;
  status: "ready" | "processing" | "invalid" | "disabled";
};

export type SourceSelectOptions = {
  exerciseId?: string;
  skill?: string;
  preferredCategories?: AudioCategory[];
  difficulty?: number;
  seed: number;
  recentIds?: string[];
  requireStereo?: boolean;
};

const BUILTIN: AudioSourceMeta[] = [
  { id: "syn-voc-lead-a", category: "vocals", label: "Lead vocal", labelFa: "وکال لید", genre: "pop", durationSec: 1.5, channels: 1,
    compatible: ["eq-peak","eq-cut","eq-match","comp-match","reverb-type","delay-detect","mix-vocal-balance"], tags: ["midrange"],
    recipe: { kind: "harmonic", fundamental: 220, partials: [1, 0.45, 0.2, 0.08], duration: 1.5 }, enabled: true, status: "ready" },
  { id: "syn-voc-air", category: "vocals", label: "Airy vocal", labelFa: "وکال هوایی", durationSec: 1.4,
    compatible: ["eq-peak","eq-cut","filter-expert","reverb-type","wetdry"], tags: ["highs"],
    recipe: { kind: "harmonic", fundamental: 330, partials: [1, 0.3, 0.35, 0.2, 0.1], duration: 1.4 }, enabled: true, status: "ready" },
  { id: "syn-kit-groove", category: "drums", label: "Kit groove", labelFa: "گروو درامز", tempoBpm: 120, durationSec: 1.6,
    compatible: ["compressionist","dr-compressor","comp-thresh","comp-release","loudness-db"], tags: ["transient"],
    recipe: { kind: "loop", pattern: "kit", duration: 1.6 }, enabled: true, status: "ready" },
  { id: "syn-kick-pulse", category: "kick", label: "Kick", labelFa: "کیک", durationSec: 1.4,
    compatible: ["bass-detective","eq-cut","compressionist"], tags: ["sub"],
    recipe: { kind: "percussion", hits: 4, spacing: 0.35, toneHz: 55 }, enabled: true, status: "ready" },
  { id: "syn-snare-crack", category: "snare", label: "Snare", labelFa: "اسنر", durationSec: 1.3,
    compatible: ["compressionist","dr-compressor","eq-peak","reverb-type"], tags: ["transient"],
    recipe: { kind: "percussion", hits: 4, spacing: 0.32, toneHz: 220 }, enabled: true, status: "ready" },
  { id: "syn-perc-hits", category: "percussion", label: "Perc", labelFa: "پرکاشن", durationSec: 1.5,
    compatible: ["compressionist","delay-detect","delay-match","pan-train"], tags: ["rhythm"],
    recipe: { kind: "percussion", hits: 6, spacing: 0.26, toneHz: 400 }, enabled: true, status: "ready" },
  { id: "syn-bass-sub", category: "bass", label: "Sub bass", labelFa: "بیس ساب", durationSec: 1.4,
    compatible: ["bass-detective","eq-cut","filter-expert","loudness-db"], tags: ["sub"],
    recipe: { kind: "loop", pattern: "bass", duration: 1.4 }, enabled: true, status: "ready" },
  { id: "syn-bass-growl", category: "bass", label: "Growl bass", labelFa: "بیس گرول", durationSec: 1.4,
    compatible: ["bass-detective","dist-detect","sat-detect","eq-peak"], tags: ["harmonic"],
    recipe: { kind: "harmonic", fundamental: 70, partials: [1, 0.6, 0.3, 0.15], duration: 1.4 }, enabled: true, status: "ready" },
  { id: "syn-piano-pad", category: "piano", label: "Piano", labelFa: "پیانو", durationSec: 1.5,
    compatible: ["eq-match","reverb-type","delay-match","stereo-width","pan-train"], tags: ["keys"],
    recipe: { kind: "loop", pattern: "pad", duration: 1.5 }, enabled: true, status: "ready" },
  { id: "syn-guitar-pluck", category: "guitar", label: "Guitar", labelFa: "گیتار", durationSec: 1.4,
    compatible: ["eq-peak","eq-cut","delay-detect","reverb-match","dist-amount"], tags: ["mid"],
    recipe: { kind: "loop", pattern: "pluck", duration: 1.4 }, enabled: true, status: "ready" },
  { id: "syn-synth-lead", category: "synth", label: "Synth", labelFa: "سینث", durationSec: 1.4,
    compatible: ["eq-peak","filter-expert","stereo-width","sat-detect","harmonic-nl"], tags: ["bright"],
    recipe: { kind: "harmonic", fundamental: 440, partials: [1, 0.5, 0.4, 0.2], duration: 1.4 }, enabled: true, status: "ready" },
  { id: "syn-strings-pad", category: "strings", label: "Strings", labelFa: "زه", durationSec: 1.6,
    compatible: ["reverb-type","reverb-match","wetdry","stereo-width","eq-match"], tags: ["pad"],
    recipe: { kind: "harmonic", fundamental: 196, partials: [1, 0.55, 0.3, 0.18, 0.1], duration: 1.6 }, enabled: true, status: "ready" },
  { id: "syn-noise-pink", category: "fx", label: "Pink noise", labelFa: "نویز صورتی", durationSec: 1.5,
    compatible: ["eq-peak","eq-cut","eq-match","filter-expert","freq-detect"], tags: ["broadband"],
    recipe: { kind: "noise", seconds: 1.5, color: "pink" }, enabled: true, status: "ready" },
  { id: "syn-noise-white", category: "fx", label: "White noise", labelFa: "نویز سفید", durationSec: 1.4,
    compatible: ["filter-expert","eq-peak","freq-detect"], tags: ["broadband"],
    recipe: { kind: "noise", seconds: 1.4, color: "white" }, enabled: true, status: "ready" },
  { id: "syn-mix-full", category: "full_mix", label: "Full mix", labelFa: "میکس کامل", durationSec: 1.8,
    compatible: ["mix-masking","mix-clarity","mix-ab-compare","mix-eq-decision","loudness-db","stereo-width"], tags: ["mix"],
    recipe: { kind: "stems", duration: 1.8, stems: [
      { id: "v", role: "vocals", toneHz: 280, gainDb: -5, pan: 0, color: "harmonic" },
      { id: "d", role: "drums", toneHz: 100, gainDb: -7, pan: 0, color: "noise" },
      { id: "b", role: "bass", toneHz: 65, gainDb: -6, pan: 0, color: "tone" },
      { id: "g", role: "guitar", toneHz: 400, gainDb: -10, pan: -0.35, color: "harmonic" },
      { id: "s", role: "synth", toneHz: 600, gainDb: -12, pan: 0.4, color: "tone" },
    ]}, enabled: true, status: "ready" },
  { id: "syn-stems-balance", category: "stems", label: "Balance stems", labelFa: "استم بالانس", durationSec: 1.8,
    compatible: ["balance-memory","balance-recreate","mix-level-decision","mix-pan-decision"], tags: ["stems"],
    recipe: { kind: "stems", duration: 1.8, stems: [
      { id: "vocals", role: "vocals", toneHz: 320, gainDb: -4, pan: 0, color: "harmonic" },
      { id: "drums", role: "drums", toneHz: 120, gainDb: -6, pan: 0, color: "noise" },
      { id: "bass", role: "bass", toneHz: 70, gainDb: -5, pan: 0, color: "tone" },
      { id: "piano", role: "piano", toneHz: 260, gainDb: -9, pan: -0.2, color: "harmonic" },
      { id: "guitar", role: "guitar", toneHz: 440, gainDb: -8, pan: 0.35, color: "harmonic" },
    ]}, enabled: true, status: "ready" },
  { id: "syn-vox-inst", category: "vocal_instrumental", label: "Vox vs inst", labelFa: "وکال در برابر ساز", durationSec: 1.7,
    compatible: ["mix-vocal-balance","mix-masking","mix-freq-conflict","mix-clarity"], tags: ["vocal"],
    recipe: { kind: "stems", duration: 1.7, stems: [
      { id: "vocals", role: "vocals", toneHz: 300, gainDb: -3, pan: 0, color: "harmonic" },
      { id: "inst", role: "guitar", toneHz: 450, gainDb: -8, pan: 0, color: "harmonic" },
      { id: "bass", role: "bass", toneHz: 80, gainDb: -7, pan: 0, color: "tone" },
    ]}, enabled: true, status: "ready" },
];

const EXERCISE_CATEGORIES: Record<string, AudioCategory[]> = {
  "freq-detect": ["fx","synth","piano"], "eq-peak": ["fx","vocals","guitar","full_mix"],
  "eq-cut": ["drums","vocals","guitar"], "eq-match": ["fx","vocals","piano"],
  "filter-expert": ["fx","synth"], "bass-detective": ["bass","kick","full_mix"],
  compressionist: ["drums","snare","percussion","vocals"], "dr-compressor": ["drums","percussion"],
  "loudness-db": ["fx","full_mix"], "pan-train": ["synth","guitar","percussion"],
  "stereo-width": ["strings","synth","full_mix"], "sonar-beast": ["synth","fx"],
  "balance-memory": ["stems"], "balance-recreate": ["stems"],
  "mix-vocal-balance": ["vocal_instrumental","stems"], "mix-masking": ["full_mix","vocal_instrumental"],
};

let runtimeExtras: AudioSourceMeta[] = [];
const recentRing: string[] = [];
const RECENT_MAX = 12;

export function getBuiltinLibrary(): AudioSourceMeta[] {
  return BUILTIN.filter((s) => s.enabled && s.status === "ready");
}

export function registerRuntimeSources(sources: AudioSourceMeta[]) {
  runtimeExtras = sources.filter((s) => s.enabled && s.status === "ready");
}

export function getAllReadySources(): AudioSourceMeta[] {
  const map = new Map<string, AudioSourceMeta>();
  for (const s of BUILTIN) if (s.enabled && s.status === "ready") map.set(s.id, s);
  for (const s of runtimeExtras) if (s.enabled && s.status === "ready") map.set(s.id, s);
  return [...map.values()];
}

function scoreSource(s: AudioSourceMeta, opts: SourceSelectOptions): number {
  let score = 1;
  const cats = opts.preferredCategories || (opts.exerciseId ? EXERCISE_CATEGORIES[opts.exerciseId] : undefined);
  if (cats?.length) score += cats.includes(s.category) ? 5 : -2;
  if (opts.exerciseId && s.compatible.includes(opts.exerciseId)) score += 4;
  const recent = opts.recentIds || recentRing;
  if (recent.includes(s.id)) score -= 6;
  score += seeded(opts.seed + s.id.length * 17) * 0.5;
  return score;
}

const SAFE_FALLBACK: AudioSourceMeta = {
  id: "fallback-pink", category: "fx", label: "Safe pink", labelFa: "نویز ایمن", durationSec: 1.4,
  compatible: ["*"], recipe: { kind: "noise", seconds: 1.4, color: "pink" }, enabled: true, status: "ready",
};

export function selectAudioSource(opts: SourceSelectOptions): {
  source: AudioSourceMeta; program: AudioProgram; reason: string;
} {
  const all = getAllReadySources();
  const preferred = opts.preferredCategories || (opts.exerciseId ? EXERCISE_CATEGORIES[opts.exerciseId] : undefined);
  let pool = all;
  if (preferred?.length) {
    const matched = all.filter((s) => preferred.includes(s.category));
    if (matched.length) pool = matched;
  }
  if (opts.exerciseId) {
    const compat = pool.filter((s) => s.compatible.includes(opts.exerciseId!) || s.compatible.includes("*"));
    if (compat.length) pool = compat;
  }
  const ranked = [...pool].sort((a, b) => scoreSource(b, opts) - scoreSource(a, opts));
  const top = ranked.slice(0, Math.min(5, ranked.length));
  const chosen = top.length ? pick(top, opts.seed) : SAFE_FALLBACK;
  recentRing.push(chosen.id);
  while (recentRing.length > RECENT_MAX) recentRing.shift();
  const reason = preferred?.includes(chosen.category)
    ? `preferred:${chosen.category}`
    : chosen.id === SAFE_FALLBACK.id ? "safe_fallback" : `compatible:${chosen.category}`;
  return { source: chosen, program: chosen.recipe, reason };
}

export function listPublicCatalog() {
  return getAllReadySources().map((s) => ({
    id: s.id, category: s.category, labelFa: s.labelFa, durationSec: s.durationSec, tags: s.tags,
  }));
}

export function getSourceById(id: string): AudioSourceMeta | null {
  return getAllReadySources().find((s) => s.id === id) || (id === SAFE_FALLBACK.id ? SAFE_FALLBACK : null);
}

export function categoriesInLibrary(): AudioCategory[] {
  return [...new Set(getAllReadySources().map((s) => s.category))];
}

export { EXERCISE_CATEGORIES, SAFE_FALLBACK, BUILTIN as BUILTIN_AUDIO_LIBRARY };
