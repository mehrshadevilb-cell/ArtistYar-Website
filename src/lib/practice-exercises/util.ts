/**
 * SoundGym-level calibration helpers.
 * Difficulty 1–500 → perceptual deltas that stay audible (even at expert).
 */

export function seeded(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function seededInt(seed: number, min: number, max: number): number {
  return Math.floor(seeded(seed) * (max - min + 1)) + min;
}

export function pick<T>(items: readonly T[], seed: number): T {
  return items[Math.floor(seeded(seed) * items.length) % items.length];
}

export function shuffle<T>(items: readonly T[], seed: number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(seeded(seed + i * 19) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function difficultyCurve(difficulty: number) {
  const d = clamp(difficulty, 1, 500);
  const tier = d < 100 ? 0 : d < 220 ? 1 : d < 360 ? 2 : 3;
  const subtlety = Math.pow((d - 1) / 499, 0.85);
  return { tier, subtlety, difficulty: d };
}

export function fingerprint(parts: Array<string | number>): string {
  return parts.map(String).join("|").slice(0, 240);
}

export function fmtHz(hz: number): string {
  if (hz >= 1000) return `${(hz / 1000).toFixed(hz >= 10000 ? 0 : 1)}kHz`;
  return `${Math.round(hz)}Hz`;
}

export function eqGainDb(subtlety: number, cut = false): number {
  const mag =
    subtlety < 0.25
      ? lerp(12, 9, subtlety / 0.25)
      : subtlety < 0.55
        ? lerp(9, 5, (subtlety - 0.25) / 0.3)
        : subtlety < 0.8
          ? lerp(5, 3, (subtlety - 0.55) / 0.25)
          : lerp(3, 2, (subtlety - 0.8) / 0.2);
  return cut ? -mag : mag;
}

export function eqQ(subtlety: number): number {
  return clamp(lerp(1.2, 3.5, subtlety), 0.7, 4.5);
}

export function filterOctaveGap(subtlety: number): number {
  return lerp(2.0, 0.35, subtlety);
}

export function compAttackPair(subtlety: number): { fast: number; slow: number } {
  return { fast: lerp(0.002, 0.012, subtlety), slow: lerp(0.12, 0.035, subtlety) };
}

export function compRatioPool(subtlety: number): number[] {
  if (subtlety < 0.3) return [2, 4, 8, 20];
  if (subtlety < 0.6) return [2, 3, 6, 10];
  return [2.5, 4, 6, 8];
}

export function compThreshPool(subtlety: number): number[] {
  if (subtlety < 0.35) return [-40, -28, -18, -8];
  if (subtlety < 0.65) return [-32, -24, -16, -10];
  return [-26, -22, -18, -14];
}

export function compReleasePair(subtlety: number): { fast: number; slow: number } {
  return { fast: lerp(0.05, 0.1, subtlety), slow: lerp(0.5, 0.22, subtlety) };
}

export function loudnessDeltaDb(subtlety: number): number {
  return subtlety < 0.3
    ? lerp(9, 6, subtlety / 0.3)
    : subtlety < 0.65
      ? lerp(6, 3, (subtlety - 0.3) / 0.35)
      : lerp(3, 1.5, (subtlety - 0.65) / 0.35);
}

export function panPool(subtlety: number): number[] {
  if (subtlety < 0.3) return [-1, -0.5, 0, 0.5, 1];
  if (subtlety < 0.6) return [-0.85, -0.4, 0, 0.4, 0.85];
  return [-0.7, -0.35, -0.15, 0, 0.15, 0.35, 0.7];
}

export function widthPool(subtlety: number): number[] {
  if (subtlety < 0.35) return [0, 0.35, 0.7, 1];
  if (subtlety < 0.65) return [0.1, 0.35, 0.55, 0.8];
  return [0.15, 0.3, 0.45, 0.6, 0.75];
}

export function delayTimePool(subtlety: number): number[] {
  if (subtlety < 0.35) return [0.08, 0.15, 0.3, 0.5];
  if (subtlety < 0.65) return [0.1, 0.18, 0.27, 0.4];
  return [0.12, 0.16, 0.21, 0.28];
}

export function reverbMixPool(subtlety: number): number[] {
  if (subtlety < 0.35) return [0.1, 0.35, 0.6, 0.85];
  if (subtlety < 0.65) return [0.2, 0.4, 0.55, 0.7];
  return [0.25, 0.35, 0.45, 0.55];
}

export function drivePool(subtlety: number): number[] {
  if (subtlety < 0.35) return [0.15, 0.4, 0.65, 0.9];
  if (subtlety < 0.65) return [0.2, 0.4, 0.55, 0.7];
  return [0.25, 0.35, 0.45, 0.55];
}

export const FREQ_BANK = [
  60, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000,
] as const;

export function scoreFromAccuracy(correct: boolean, difficulty: number, errorMag = 0): number {
  if (!correct) {
    if (difficulty < 120) return -12;
    if (difficulty < 250) return -8;
    return -5;
  }
  const base = 12 + Math.round(difficulty / 40);
  const precision = errorMag <= 0 ? 6 : errorMag < 0.25 ? 3 : 0;
  return clamp(base + precision, 8, 30);
}
