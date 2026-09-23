/**
 * Phase 5 — fine-grained skill keys for adaptive training.
 */

export type MicroSkillKey =
  | "frequency" | "eq" | "eq_matching" | "filters" | "bass"
  | "compression" | "dynamics" | "loudness" | "pan" | "stereo"
  | "delay" | "reverb" | "distortion" | "feedback" | "balance"
  | "masking" | "mix_decisions" | "memory";

export const MICRO_SKILL_META: Record<
  MicroSkillKey,
  { label: string; titleFa: string; coarse: "ear_training" | "harmony" | "mixing" | "dynamics" | "stereo" | "critical_listening" }
> = {
  frequency: { label: "Frequency", titleFa: "فرکانس", coarse: "ear_training" },
  eq: { label: "EQ", titleFa: "اکولایزر", coarse: "mixing" },
  eq_matching: { label: "EQ Matching", titleFa: "تطبیق EQ", coarse: "mixing" },
  filters: { label: "Filters", titleFa: "فیلتر", coarse: "mixing" },
  bass: { label: "Bass", titleFa: "بیس", coarse: "ear_training" },
  compression: { label: "Compression", titleFa: "کمپرسور", coarse: "dynamics" },
  dynamics: { label: "Dynamics", titleFa: "دینامیک", coarse: "dynamics" },
  loudness: { label: "Loudness", titleFa: "بلندی", coarse: "critical_listening" },
  pan: { label: "Pan", titleFa: "پن", coarse: "stereo" },
  stereo: { label: "Stereo", titleFa: "استریو", coarse: "stereo" },
  delay: { label: "Delay", titleFa: "دیلی", coarse: "mixing" },
  reverb: { label: "Reverb", titleFa: "ریورب", coarse: "mixing" },
  distortion: { label: "Distortion", titleFa: "دیستورشن", coarse: "critical_listening" },
  feedback: { label: "Feedback", titleFa: "فیدبک", coarse: "ear_training" },
  balance: { label: "Balance", titleFa: "بالانس", coarse: "mixing" },
  masking: { label: "Masking", titleFa: "ماسکینگ", coarse: "critical_listening" },
  mix_decisions: { label: "Mix Decisions", titleFa: "تصمیم میکس", coarse: "mixing" },
  memory: { label: "Memory", titleFa: "حافظه", coarse: "critical_listening" },
};

export const ALL_MICRO_SKILLS = Object.keys(MICRO_SKILL_META) as MicroSkillKey[];

const GAME_TO_MICRO: Record<string, MicroSkillKey> = {
  "sg-freq-detect": "frequency", tone: "frequency",
  "sg-eq-peak": "eq", "sg-eq-cut": "eq", eq: "eq",
  "sg-eq-match": "eq_matching", "sg-filter": "filters", "sg-bass": "bass",
  "sg-comp-attack": "compression", "sg-comp-ratio": "compression", "sg-comp-match": "compression",
  "sg-comp-thresh": "compression", "sg-comp-release": "compression", "sg-comp-compare": "compression",
  compressor: "compression", "sg-makeup": "dynamics", "pro-transient": "dynamics", transient: "dynamics",
  "sg-loudness": "loudness", "sg-pan": "pan", "sg-width": "stereo", "sg-spatial": "stereo",
  "sg-mix-stereo": "stereo", "sg-mix-pan": "pan", phase: "stereo",
  "sg-delay-detect": "delay", "sg-delay-match": "delay",
  "sg-reverb-type": "reverb", "sg-reverb-match": "reverb", "sg-predelay": "reverb", "sg-decay": "reverb", "sg-wetdry": "reverb",
  reverb: "reverb", "pro-reverb": "reverb",
  "sg-dist-detect": "distortion", "sg-sat-detect": "distortion", "sg-dist-amount": "distortion", "sg-harmonic-nl": "distortion",
  saturation: "distortion", "pro-saturation": "distortion", "sg-feedback-freq": "feedback",
  "sg-balance-memory": "balance", "sg-balance-recreate": "balance",
  "sg-mix-masking": "masking", masking: "masking", "pro-masking": "masking",
  "sg-mix-vocal": "mix_decisions", "sg-mix-freq-conflict": "mix_decisions", "sg-mix-eq": "mix_decisions",
  "sg-mix-level": "mix_decisions", "sg-mix-clarity": "mix_decisions", "sg-mix-ab": "mix_decisions",
  "sg-sonar": "frequency",
  "sg-user-eq": "eq", "sg-user-freq": "frequency", "sg-user-comp": "compression", "sg-user-dynamics": "dynamics",
  "sg-user-masking": "masking", "sg-user-stereo": "stereo", "sg-user-level": "loudness",
};

const EXERCISE_TO_MICRO: Record<string, MicroSkillKey> = {
  "freq-detect": "frequency", "eq-peak": "eq", "eq-cut": "eq", "eq-match": "eq_matching",
  "filter-expert": "filters", "bass-detective": "bass",
  compressionist: "compression", "dr-compressor": "compression", "comp-match": "compression",
  "comp-thresh": "compression", "comp-release": "compression", "comp-compare": "compression",
  "makeup-gain": "dynamics", "loudness-db": "loudness", "pan-train": "pan",
  "stereo-width": "stereo", "spatial-compare": "stereo",
  "delay-detect": "delay", "delay-match": "delay",
  "reverb-type": "reverb", "reverb-match": "reverb", predelay: "reverb", decay: "reverb", wetdry: "reverb",
  "dist-detect": "distortion", "sat-detect": "distortion", "dist-amount": "distortion", "harmonic-nl": "distortion",
  "feedback-freq": "feedback", "balance-memory": "memory", "balance-recreate": "balance",
  "mix-vocal-balance": "mix_decisions", "mix-masking": "masking", "mix-freq-conflict": "mix_decisions",
  "mix-eq-decision": "mix_decisions", "mix-level-decision": "mix_decisions", "mix-pan-decision": "pan",
  "mix-stereo-place": "stereo", "mix-clarity": "mix_decisions", "mix-ab-compare": "mix_decisions",
  "sonar-beast": "frequency",
};

export function microSkillForGame(gameId: string): MicroSkillKey {
  return GAME_TO_MICRO[gameId] || "mix_decisions";
}

export function microSkillForExercise(exerciseId: string): MicroSkillKey {
  return EXERCISE_TO_MICRO[exerciseId] || microSkillForGame(exerciseId);
}

export const MICRO_SKILL_EXERCISES: Record<MicroSkillKey, string[]> = {
  frequency: ["freq-detect", "sonar-beast"],
  eq: ["eq-peak", "eq-cut"],
  eq_matching: ["eq-match"],
  filters: ["filter-expert"],
  bass: ["bass-detective"],
  compression: ["compressionist", "dr-compressor", "comp-match", "comp-thresh", "comp-release", "comp-compare"],
  dynamics: ["makeup-gain"],
  loudness: ["loudness-db"],
  pan: ["pan-train", "mix-pan-decision"],
  stereo: ["stereo-width", "spatial-compare", "mix-stereo-place"],
  delay: ["delay-detect", "delay-match"],
  reverb: ["reverb-type", "reverb-match", "predelay", "decay", "wetdry"],
  distortion: ["dist-detect", "sat-detect", "dist-amount", "harmonic-nl"],
  feedback: ["feedback-freq"],
  balance: ["balance-recreate"],
  masking: ["mix-masking"],
  mix_decisions: ["mix-vocal-balance", "mix-freq-conflict", "mix-eq-decision", "mix-level-decision", "mix-clarity", "mix-ab-compare"],
  memory: ["balance-memory"],
};

export type MicroSkillStats = {
  key: MicroSkillKey;
  label: string;
  titleFa: string;
  attempts: number;
  correct: number;
  accuracy: number;
  recentAccuracy: number;
  consistency: number;
  reactionMs: number | null;
  difficulty: number;
  rating: number;
  recommendedDifficulty: number;
  trend: number;
  isWeak: boolean;
  isStrong: boolean;
  overdueDays: number;
  lastPracticedAt: string | null;
};
