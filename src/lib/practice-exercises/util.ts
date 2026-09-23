/** Deterministic helpers for exercise generation */

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

/** Map difficulty 1–500 → tier 0..3 and subtlety factor 0..1 */
export function difficultyCurve(difficulty: number) {
  const d = clamp(difficulty, 1, 500);
  const tier = d < 100 ? 0 : d < 220 ? 1 : d < 360 ? 2 : 3;
  const subtlety = (d - 1) / 499;
  return { tier, subtlety, difficulty: d };
}

export function fingerprint(parts: Array<string | number>): string {
  return parts.map(String).join("|").slice(0, 240);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Format Hz for labels */
export function fmtHz(hz: number): string {
  if (hz >= 1000) return `${(hz / 1000).toFixed(hz >= 10000 ? 0 : 1)}kHz`;
  return `${Math.round(hz)}Hz`;
}
