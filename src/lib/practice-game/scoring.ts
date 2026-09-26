/**
 * Psychoacoustic + game scoring. Client preview; server still recomputes XP.
 */

import { clamp, safeHz, safeNumber } from "./difficulty";

/** Equal-tempered cents between two frequencies. */
export function centsError(targetHz: number, guessHz: number) {
  const t = safeHz(targetHz, 0);
  const g = safeHz(guessHz, 0);
  if (!(t > 0) || !(g > 0)) return 1200;
  return 1200 * Math.log2(g / t);
}

/**
 * Frequency memory: combine Hz tolerance (beginner-friendly) with cents
 * (what engineers actually hear). Returns 0–100.
 */
export function frequencyAccuracy(targetHz: number, guessHz: number, toleranceHz: number) {
  const t = safeHz(targetHz, 440);
  const g = safeHz(guessHz, t);
  const tol = clamp(safeNumber(toleranceHz, 40), 4, 400);
  const hzErr = Math.abs(g - t);
  const cents = Math.abs(centsError(t, g));
  const hzScore = clamp(100 * (1 - hzErr / Math.max(8, tol * 1.35)), 0, 100);
  const centsScore = clamp(100 - cents / 1.8, 0, 100);
  const accuracy = Math.round(hzScore * 0.45 + centsScore * 0.55);
  return { accuracy, hzErr, cents, perfect: hzErr <= tol * 0.35 || cents < 12 };
}

export function sliderPass(accuracy: number) {
  return accuracy >= 70;
}

export function choiceAccuracy(correct: boolean) {
  return correct ? 100 : 0;
}

export function comboMultiplier(streak: number) {
  if (streak >= 8) return 1.25;
  if (streak >= 5) return 1.15;
  if (streak >= 3) return 1.08;
  return 1;
}

export function roundPreviewXp(opts: {
  correct: boolean;
  accuracy: number;
  level: number;
  responseTimeMs: number;
  streak: number;
}) {
  const level = clamp(safeNumber(opts.level, 1), 1, 50);
  const accuracy = clamp(safeNumber(opts.accuracy, 0), 0, 100);
  const rt = clamp(safeNumber(opts.responseTimeMs, 5000), 1, 120000);
  const streak = clamp(safeNumber(opts.streak, 0), 0, 100);
  if (!opts.correct) return level < 12 ? -8 : -5;
  let xp = 10 + Math.round(level / 4);
  if (accuracy >= 98) xp += 8;
  else if (accuracy >= 88) xp += 4;
  if (rt < 2800) xp += 3;
  xp = Math.round(xp * comboMultiplier(streak));
  return clamp(xp, 1, 45);
}

export function formatHz(hz: number) {
  if (hz >= 1000) return `${(hz / 1000).toFixed(hz >= 10000 ? 0 : 1)} kHz`;
  return `${Math.round(hz)} Hz`;
}

export function formatCents(cents: number) {
  const n = Math.round(cents);
  if (n === 0) return "۰ سنت";
  return `${n > 0 ? "+" : ""}${n} سنت`;
}
