/**
 * Progressive difficulty: level 1–50, mapped to internal 1–500 for XP APIs.
 * Never random — driven by accuracy, speed, and consecutive mistakes.
 */

export const GAME_LEVEL_MIN = 1;
export const GAME_LEVEL_MAX = 50;

export function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/** Coerce unknown values to a finite number; otherwise fallback. */
export function safeNumber(n: unknown, fallback = 0): number {
  const v = typeof n === "number" ? n : typeof n === "string" ? Number(n) : NaN;
  return Number.isFinite(v) ? v : fallback;
}

/** Positive finite Hz only — never NaN/Inf/negative. */
export function safeHz(n: unknown, fallback = 440): number {
  const v = safeNumber(n, fallback);
  return v > 0 && v < 24000 ? v : fallback;
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * clamp(t, 0, 1);
}

export function levelProgress(level: number) {
  return (clamp(level, 1, 50) - 1) / 49;
}

/** Map game level 1–50 onto the existing 1–500 XP difficulty scale. */
export function toApiDifficulty(level: number) {
  return Math.round(lerp(20, 480, levelProgress(level)));
}

export function levelFromXp(xp: number) {
  return clamp(1 + Math.floor(Math.max(0, xp) / 90), 1, 50);
}

export type Band = "beginner" | "intermediate" | "advanced" | "expert";

export function bandForLevel(level: number): Band {
  if (level < 12) return "beginner";
  if (level < 28) return "intermediate";
  if (level < 42) return "advanced";
  return "expert";
}

export const BAND_LABEL: Record<Band, string> = {
  beginner: "مبتدی · تفاوت‌های واضح",
  intermediate: "میانی · جزئیات واقعی",
  advanced: "پیشرفته · گوش حرفه‌ای",
  expert: "خبره · دقت استودیویی",
};

/** Frequency Memory: L1 ≈ 100 Hz, L50 ≈ 8 Hz. */
export function frequencyToleranceHz(level: number) {
  return lerp(100, 8, Math.pow(levelProgress(level), 0.85));
}

/** EQ gain magnitude: L1 ≈ 12 dB, L50 ≈ 1.6 dB. */
export function eqGainDb(level: number) {
  return lerp(12, 1.6, Math.pow(levelProgress(level), 0.9));
}

/** Listening window in seconds — shorter as you climb. */
export function listenSeconds(level: number) {
  return lerp(1.6, 0.7, levelProgress(level));
}

export type RoundOutcome = {
  correct: boolean;
  accuracy: number;
  responseTimeMs: number;
};

/**
 * Adaptive step: 3+ strong hits climb, 2 misses drop, slow answers stall.
 */
export function nextLevel(current: number, recent: RoundOutcome[]): number {
  const base = clamp(safeNumber(current, 1), GAME_LEVEL_MIN, GAME_LEVEL_MAX);
  const window = (recent || [])
    .slice(-6)
    .map((r) => ({
      correct: Boolean(r?.correct),
      accuracy: clamp(safeNumber(r?.accuracy, 0), 0, 100),
      responseTimeMs: clamp(safeNumber(r?.responseTimeMs, 3000), 1, 120000),
    }));
  if (!window.length) return base;
  const acc = window.reduce((s, r) => s + r.accuracy, 0) / window.length;
  const misses = window.filter((r) => !r.correct).length;
  const avgRt = window.reduce((s, r) => s + r.responseTimeMs, 0) / window.length;
  let delta = 0;
  if (acc >= 88 && misses === 0) delta = avgRt < 4500 ? 2 : 1;
  else if (acc >= 74) delta = 1;
  else if (acc < 45 || misses >= 3) delta = -2;
  else if (acc < 62) delta = -1;
  // Cap single-step change to avoid unexplained jumps
  delta = clamp(delta, -2, 2);
  return clamp(base + delta, GAME_LEVEL_MIN, GAME_LEVEL_MAX);
}

export function seeded(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function pick<T>(items: readonly T[], seed: number): T {
  return items[Math.floor(seeded(seed) * items.length) % items.length];
}
