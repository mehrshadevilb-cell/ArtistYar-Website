/**
 * Round generators for the six Practice games.
 * Level 1–50 drives tolerance, option count, and listening window.
 */
import type { AudioProgram, DspChain } from "@/lib/practice-exercises/types";
import {
  bandForLevel,
  eqGainDb,
  frequencyToleranceHz,
  listenSeconds,
  pick,
  seeded,
} from "./difficulty";
import { formatHz } from "./scoring";

export type GameRoundMode = "choice" | "slider";

export type GameRound = {
  gameId: string;
  mode: GameRoundMode;
  prompt: string;
  hint: string;
  reviewText: string;
  source: AudioProgram;
  challengeDsp: DspChain;
  referenceDsp?: DspChain;
  options?: Array<{ id: string; label: string }>;
  correctOptionId?: string;
  targetHz?: number;
  sliderMin?: number;
  sliderMax?: number;
  toleranceHz?: number;
  itemKey: string;
  level: number;
};

function key(parts: Array<string | number>) {
  return parts.join("|").slice(0, 180);
}

function shuffleIds<T extends { id: string }>(items: T[], seed: number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(seeded(seed + i * 17) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateFreqMemory(level: number, seed: number): GameRound {
  const pool = [80, 110, 160, 220, 330, 440, 660, 880, 1200, 2000, 3000, 5000, 8000];
  const targetHz = pick(pool, seed);
  const tol = frequencyToleranceHz(level);
  const span = Math.max(tol * 6, targetHz * 0.55);
  const min = Math.max(40, Math.round(targetHz - span));
  const max = Math.min(12000, Math.round(targetHz + span));
  const dur = listenSeconds(level);
  return {
    gameId: "freq-memory",
    mode: "slider",
    prompt: "فرکانس را بشنو، بعد با اسلایدر همان pitch را بازسازی کن",
    hint: bandForLevel(level) === "beginner"
      ? "اول محدوده را حدس بزن، بعد دقیق‌تر تنظیم کن"
      : "گوش را روی رنگ تون قفل کن؛ اسلایدر را آرام حرکت بده",
    reviewText: `هدف ${formatHz(targetHz)} · تحمل ±${Math.round(tol)} Hz`,
    source: { kind: "harmonic", fundamental: targetHz, partials: [1, 0.18], duration: dur },
    challengeDsp: { type: "none" },
    targetHz,
    sliderMin: min,
    sliderMax: max,
    toleranceHz: tol,
    itemKey: key(["freq-memory", level, targetHz, seed]),
    level,
  };
}

export function generateEqDetective(level: number, seed: number): GameRound {
  const bands = [
    { id: "sub", label: "زیر ۱۰۰Hz", hz: 80 },
    { id: "low", label: "حدود ۲۵۰Hz", hz: 250 },
    { id: "mid", label: "حدود ۱kHz", hz: 1000 },
    { id: "high", label: "حدود ۵kHz", hz: 5000 },
    { id: "air", label: "حدود ۱۰kHz", hz: 10000 },
  ];
  const band = pick(level < 20 ? bands.slice(0, 4) : bands, seed);
  const boost = seeded(seed + 3) > 0.45;
  const gain = (boost ? 1 : -1) * eqGainDb(level);
  const opts = bands.slice(0, level < 12 ? 4 : 5).map((b) => ({ id: b.id, label: b.label }));
  if (!opts.some((o) => o.id === band.id)) opts[0] = { id: band.id, label: band.label };
  return {
    gameId: "eq-detective",
    mode: "choice",
    prompt: boost ? "کدام باند تقویت شده؟" : "کدام باند کاهش یافته؟",
    hint: "A را با B مقایسه کن؛ دنبال محل تغییر رنگ باش نه بلندی کلی",
    reviewText: `${boost ? "تقویت" : "کاهش"} ${band.label} · ${Math.abs(gain).toFixed(1)} dB`,
    source: { kind: "noise", seconds: listenSeconds(level) + 0.2, color: "pink" },
    challengeDsp: { type: "peaking", frequency: band.hz, gainDb: gain, q: 1.3 },
    referenceDsp: { type: "none" },
    options: shuffleIds(opts, seed),
    correctOptionId: band.id,
    itemKey: key(["eq-detective", level, band.id, gain, seed]),
    level,
  };
}

export function generateCompDetective(level: number, seed: number): GameRound {
  const isFast = seeded(seed) > 0.5;
  const attack = isFast ? (level > 30 ? 0.002 : 0.006) : level > 30 ? 0.09 : 0.16;
  const correct = isFast ? "fast" : "slow";
  const options = [
    { id: "fast", label: "Attack سریع" },
    { id: "slow", label: "Attack آهسته" },
    { id: "high-ratio", label: "Ratio خیلی بالا" },
    { id: "soft", label: "تقریباً بدون کمپرس" },
  ];
  return {
    gameId: "comp-detective",
    mode: "choice",
    prompt: "رفتار Attack کمپرسور را تشخیص بده",
    hint: "A بدون کمپرس، B با کمپرس — به لبهٔ transient گوش کن",
    reviewText: `Attack ${isFast ? "سریع" : "آهسته"} (~${Math.round(attack * 1000)} ms)`,
    source: { kind: "percussion", hits: 4, spacing: 0.38, toneHz: 170 },
    challengeDsp: {
      type: "compressor",
      attack: isFast ? (level > 30 ? 0.002 : 0.006) : level > 30 ? 0.08 : 0.15,
      release: 0.22,
      ratio: level > 25 ? 10 : 6,
      threshold: -26,
    },
    referenceDsp: { type: "none" },
    options: shuffleIds(options, seed),
    correctOptionId: correct,
    itemKey: key(["comp-detective", level, correct, seed]),
    level,
  };
}

export function generateStereoSpace(level: number, seed: number): GameRound {
  const modes = [
    { id: "L", label: "چپ", pan: -0.9 },
    { id: "C", label: "مرکز", pan: 0 },
    { id: "R", label: "راست", pan: 0.9 },
    { id: "slight-L", label: "کمی چپ", pan: -0.35 },
    { id: "slight-R", label: "کمی راست", pan: 0.35 },
  ];
  const pool = level < 15 ? modes.slice(0, 3) : modes;
  const pos = pick(pool, seed);
  return {
    gameId: "stereo-space",
    mode: "choice",
    prompt: "موقعیت صدا در میدان استریو کجاست؟",
    hint: "با هدفون دقیق‌تر است؛ به تصویر و وزن چپ/راست گوش بده",
    reviewText: `موقعیت: ${pos.label}`,
    source: { kind: "harmonic", fundamental: 440, partials: [1], duration: listenSeconds(level) },
    challengeDsp: { type: "pan", value: pos.pan },
    options: shuffleIds(pool.map((p) => ({ id: p.id, label: p.label })), seed),
    correctOptionId: pos.id,
    itemKey: key(["stereo-space", level, pos.id, seed]),
    level,
  };
}

export function generatePitchLab(level: number, seed: number): GameRound {
  const intervals =
    level < 12
      ? ([["m2", "دوم کوچک", 1], ["M2", "دوم بزرگ", 2], ["P5", "پنجم درست", 7], ["P8", "اکتاو", 12]] as const)
      : level < 28
        ? ([["m3", "سوم کوچک", 3], ["M3", "سوم بزرگ", 4], ["P4", "چهارم درست", 5], ["P5", "پنجم درست", 7], ["TT", "تریتون", 6]] as const)
        : ([["m2", "دوم کوچک", 1], ["M2", "دوم بزرگ", 2], ["m3", "سوم کوچک", 3], ["M3", "سوم بزرگ", 4], ["P4", "چهارم درست", 5], ["TT", "تریتون", 6], ["P5", "پنجم درست", 7], ["m6", "ششم کوچک", 8], ["M6", "ششم بزرگ", 9], ["m7", "هفتم کوچک", 10], ["M7", "هفتم بزرگ", 11], ["P8", "اکتاو", 12]] as const);
  const picked = pick([...intervals], seed);
  const [id, label, semi] = picked;
  const root = 48 + Math.floor(seeded(seed + 9) * 12);
  const fund = 440 * Math.pow(2, (root - 69) / 12);
  const opts = shuffleIds(
    [...intervals].slice(0, Math.min(6, intervals.length)).map(([i, l]) => ({ id: i, label: l })),
    seed,
  );
  if (!opts.some((o) => o.id === id)) opts[0] = { id, label };
  return {
    gameId: "pitch-lab",
    mode: "choice",
    prompt: "فاصلهٔ بین دو نت را تشخیص بده",
    hint: "نت پایه را قفل کن، بعد فاصله را بسنج",
    reviewText: `${label} (${semi} نیم‌پرده)`,
    source: {
      kind: "harmonic",
      fundamental: fund,
      partials: [1],
      duration: 0.5,
      intervalHz: fund * Math.pow(2, semi / 12),
    },
    challengeDsp: { type: "none" },
    options: opts,
    correctOptionId: id,
    itemKey: key(["pitch-lab", level, id, seed]),
    level,
  };
}

export function generateRhythmLab(level: number, seed: number): GameRound {
  const hits = pick(level < 15 ? [2, 3, 4] : [3, 4, 5, 6], seed);
  const spacing = 0.42 - (level / 50) * 0.18;
  const options = shuffleIds(
    [hits, hits + 1, Math.max(1, hits - 1), hits + 2].map((n) => ({
      id: String(n),
      label: `${n} ضربه`,
    })),
    seed + 4,
  );
  return {
    gameId: "rhythm-lab",
    mode: "choice",
    prompt: "تعداد ضربه‌ها را بشمار",
    hint: "با انگشت هم‌زمان بشمار تا از دست ندهی",
    reviewText: `${hits} ضربه`,
    source: { kind: "percussion", hits, spacing, toneHz: 150 },
    challengeDsp: { type: "none" },
    options,
    correctOptionId: String(hits),
    itemKey: key(["rhythm-lab", level, hits, seed]),
    level,
  };
}

export function generateRoundForGame(gameId: string, level: number, seed: number): GameRound {
  switch (gameId) {
    case "freq-memory":
      return generateFreqMemory(level, seed);
    case "eq-detective":
      return generateEqDetective(level, seed);
    case "comp-detective":
      return generateCompDetective(level, seed);
    case "stereo-space":
      return generateStereoSpace(level, seed);
    case "pitch-lab":
      return generatePitchLab(level, seed);
    case "rhythm-lab":
      return generateRhythmLab(level, seed);
    default:
      return generateFreqMemory(level, seed);
  }
}
