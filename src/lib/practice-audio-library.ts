import type { AudioProgram } from "@/lib/practice-exercises/types";
import { pick } from "@/lib/practice-exercises/util";

export type AudioCategory = "fx" | "vocals" | "drums" | "bass" | "full_mix" | "stems";
export type AudioSourceMeta = {
  id: string;
  category: AudioCategory;
  label: string;
  labelFa: string;
  durationSec: number;
  compatible: string[];
  tags?: string[];
  storagePath?: string | null;
  recipe: AudioProgram;
  enabled: boolean;
  status: "ready" | "processing" | "invalid" | "disabled";
};

const BUILTIN: AudioSourceMeta[] = [
  {
    id: "syn-noise-pink",
    category: "fx",
    label: "Pink noise",
    labelFa: "نویز صورتی",
    durationSec: 1.5,
    compatible: ["*"],
    recipe: { kind: "noise", seconds: 1.5, color: "pink" },
    enabled: true,
    status: "ready",
  },
];

export const BUILTIN_AUDIO_LIBRARY = BUILTIN;

export function selectAudioSource(opts: {
  exerciseId?: string;
  seed: number;
  difficulty?: number;
}): { source: AudioSourceMeta; program: AudioProgram; reason: string } {
  const s = pick(BUILTIN, opts.seed);
  return { source: s, program: s.recipe, reason: "builtin" };
}

export function listPublicCatalog() {
  return BUILTIN.map((s) => ({
    id: s.id,
    category: s.category,
    labelFa: s.labelFa,
    durationSec: s.durationSec,
  }));
}

export function categoriesInLibrary(): AudioCategory[] {
  return [...new Set(BUILTIN.map((s) => s.category))];
}

export function registerRuntimeSources(_sources: AudioSourceMeta[]) {}
export function getSourceById(id: string) {
  return BUILTIN.find((s) => s.id === id) || null;
}
