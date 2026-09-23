import type { ExerciseDefinition, GeneratedRound } from "./types";
import { difficultyCurve, fingerprint, fmtHz, pick } from "./util";

function seedPick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function genFreq(difficulty: number, seed: number): GeneratedRound {
  const { subtlety } = difficultyCurve(difficulty);
  const freqs = subtlety > 0.6 ? [400, 500, 630, 800] : [250, 500, 1000, 2000, 4000];
  const freq = seedPick(freqs, seed);
  const opts = Array.from(new Set([freq, ...freqs])).slice(0, 4);
  return {
    exerciseId: "freq-detect",
    fingerprint: fingerprint(["freq", freq, difficulty, seed]),
    prompt: "فرکانس غالب را انتخاب کن",
    hint: subtlety > 0.5 ? "تفاوت ظریف‌تر است" : "محدوده را پیدا کن",
    difficulty,
    answerMode: "choice",
    correctOptionId: String(freq),
    options: opts.map((hz) => ({ id: String(hz), label: fmtHz(hz) })),
    source: { kind: "harmonic", fundamental: freq, partials: [1, 0.35, 0.12], duration: 1.15 },
    challengeDsp: { type: "none" },
    reviewText: `فرکانس: ${fmtHz(freq)}`,
    truth: { frequency: freq },
  };
}

function genEqPeak(difficulty: number, seed: number): GeneratedRound {
  const { subtlety } = difficultyCurve(difficulty);
  const freq = seedPick([250, 500, 1000, 2000, 4000], seed);
  const gain = subtlety > 0.55 ? seedPick([2, 3, 4], seed + 1) : seedPick([4, 6, 9], seed + 1);
  const opts = [
    { id: `p-${freq}`, label: `Peak ${fmtHz(freq)}` },
    { id: "p-alt1", label: `Peak ${fmtHz(freq === 1000 ? 500 : 1000)}` },
    { id: "p-alt2", label: `Peak ${fmtHz(freq === 2000 ? 250 : 2000)}` },
    { id: "flat", label: "بدون تغییر" },
  ];
  return {
    exerciseId: "eq-peak",
    fingerprint: fingerprint(["eq-peak", freq, gain, difficulty, seed]),
    prompt: "کدام EQ Peak اعمال شده؟",
    hint: "به محدودهٔ فرکانسی توجه کن",
    difficulty,
    answerMode: "choice",
    correctOptionId: `p-${freq}`,
    options: opts,
    source: { kind: "noise", seconds: 1.2, color: "pink" },
    challengeDsp: { type: "peaking", frequency: freq, gainDb: gain, q: 1.4 },
    reviewText: `Peak ${fmtHz(freq)} · +${gain} dB`,
    truth: { frequency: freq, gainDb: gain },
  };
}

function genPan(difficulty: number, seed: number): GeneratedRound {
  const { subtlety } = difficultyCurve(difficulty);
  const pan = subtlety > 0.5 ? seedPick([-0.35, 0.35, -0.6, 0.6], seed) : seedPick([-0.85, 0.85, -0.5, 0.5], seed);
  const id = pan < 0 ? "L" : "R";
  return {
    exerciseId: "pan-train",
    fingerprint: fingerprint(["pan", pan, difficulty, seed]),
    prompt: "صدا بیشتر به کدام سمت است؟",
    hint: "با هدفون دقیق‌تر است",
    difficulty,
    answerMode: "choice",
    correctOptionId: id,
    options: [
      { id: "L", label: "چپ" },
      { id: "R", label: "راست" },
      { id: "C", label: "مرکز" },
    ],
    source: { kind: "tone", frequency: 880, duration: 1.0 },
    challengeDsp: { type: "pan", value: pan },
    reviewText: pan < 0 ? "چپ" : "راست",
    truth: { pan },
  };
}

function genLoud(difficulty: number, seed: number): GeneratedRound {
  const { subtlety } = difficultyCurve(difficulty);
  const db = subtlety > 0.55 ? seedPick([-2, -3, -4], seed) : seedPick([-6, -9, -12], seed);
  return {
    exerciseId: "loudness-db",
    fingerprint: fingerprint(["loud", db, difficulty, seed]),
    prompt: "میزان افت بلندی را انتخاب کن",
    hint: "نسبت به سطح مرجع",
    difficulty,
    answerMode: "choice",
    correctOptionId: String(db),
    options: [-2, -3, -4, -6, -9, -12].slice(0, 4).map((v) => ({ id: String(v), label: `${v} dB` })),
    source: { kind: "noise", seconds: 1.0, color: "white" },
    challengeDsp: { type: "gain", gainDb: db },
    reviewText: `${db} dB`,
    truth: { gainDb: db },
  };
}

function genFilter(difficulty: number, seed: number): GeneratedRound {
  const { subtlety } = difficultyCurve(difficulty);
  const kind = seedPick(["lowpass", "highpass"] as const, seed);
  const freq = subtlety > 0.5 ? seedPick([800, 1200, 2000], seed + 2) : seedPick([400, 1000, 3000], seed + 2);
  return {
    exerciseId: "filter-expert",
    fingerprint: fingerprint(["filt", kind, freq, difficulty, seed]),
    prompt: "نوع فیلتر را تشخیص بده",
    hint: "به بم یا زیر بودن باقی‌مانده گوش بده",
    difficulty,
    answerMode: "choice",
    correctOptionId: kind,
    options: [
      { id: "lowpass", label: "Low-pass" },
      { id: "highpass", label: "High-pass" },
      { id: "bandpass", label: "Band-pass" },
      { id: "none", label: "بدون فیلتر" },
    ],
    source: { kind: "noise", seconds: 1.2, color: "white" },
    challengeDsp: { type: kind, frequency: freq, q: 0.7 },
    reviewText: `${kind} @ ${fmtHz(freq)}`,
    truth: { filter: kind, frequency: freq },
  };
}

function genComp(difficulty: number, seed: number): GeneratedRound {
  const ratio = seedPick([2, 4, 8], seed);
  return {
    exerciseId: "compressionist",
    fingerprint: fingerprint(["comp", ratio, difficulty, seed]),
    prompt: "نسبت کمپرسور را حدس بزن",
    hint: "به transient حمله گوش بده",
    difficulty,
    answerMode: "choice",
    correctOptionId: String(ratio),
    options: [2, 4, 8, 12].map((r) => ({ id: String(r), label: `${r}:1` })),
    source: { kind: "percussion", hits: 4, spacing: 0.28, toneHz: 180 },
    challengeDsp: { type: "compressor", threshold: -18, ratio, attack: 0.005, release: 0.15 },
    reviewText: `Ratio ${ratio}:1`,
    truth: { ratio },
  };
}

export const EXERCISE_REGISTRY: ExerciseDefinition[] = [
  { id: "freq-detect", title: "Frequency Detection", titleFa: "تشخیص فرکانس", skill: "frequency", description: "Identify frequency", gameId: "sg-freq-detect", answerMode: "choice", supportsAb: false, generate: genFreq },
  { id: "eq-peak", title: "EQ Peak", titleFa: "اکولایزر Peak", skill: "eq", description: "Detect EQ boost", gameId: "sg-eq-peak", answerMode: "choice", supportsAb: true, generate: genEqPeak },
  { id: "filter-expert", title: "Filter Expert", titleFa: "فیلتر", skill: "eq", description: "Filter type", gameId: "sg-filter", answerMode: "choice", supportsAb: false, generate: genFilter },
  { id: "compressionist", title: "Compressionist", titleFa: "کمپرسور", skill: "dynamics", description: "Compressor ratio", gameId: "sg-comp", answerMode: "choice", supportsAb: false, generate: genComp },
  { id: "loudness-db", title: "Loudness", titleFa: "بلندی", skill: "tone", description: "Level difference", gameId: "sg-loud", answerMode: "choice", supportsAb: true, generate: genLoud },
  { id: "pan-train", title: "Pan Training", titleFa: "پن", skill: "spatial", description: "Pan direction", gameId: "sg-pan", answerMode: "choice", supportsAb: false, generate: genPan },
];

export function generateRound(exerciseId: string, difficulty: number, seed: number): GeneratedRound {
  const ex = EXERCISE_REGISTRY.find((e) => e.id === exerciseId) || EXERCISE_REGISTRY[0];
  return ex.generate(difficulty, seed);
}

export function getExercise(id: string): ExerciseDefinition | undefined {
  return EXERCISE_REGISTRY.find((e) => e.id === id);
}
