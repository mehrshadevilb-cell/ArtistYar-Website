/** Authoritative XP helpers — server clamps score. */
export function clampPracticeScore(raw: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-8, Math.min(20, Math.round(n)));
}

export function xpFromScore(score: number, difficulty = 50): number {
  const s = clampPracticeScore(score);
  const d = Math.max(1, Math.min(100, difficulty));
  if (s <= 0) return Math.max(-8, s);
  return Math.round(s * (0.7 + d / 200));
}
