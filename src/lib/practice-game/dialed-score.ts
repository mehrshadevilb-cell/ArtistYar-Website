/**
 * Dialed-style score for the Frequency Memory game.
 * Hypothesis from the reference recording: score = 10 * (1 - cents / 200), clamped at 0.
 * Displayed with 2 decimals using floor (202.57 vs 209.36 => 7.146 shown as 7.14).
 * TODO: verify against dialed.gg/sound with several inputs (see docs/dialed-spec.md).
 */

export function dialedCents(targetHz: number, guessHz: number): number {
  if (!(targetHz > 0) || !(guessHz > 0)) return 1200;
  return Math.abs(1200 * Math.log2(guessHz / targetHz));
}

/** Score in [0, 10], unrounded. */
export function dialedScore(targetHz: number, guessHz: number): number {
  const cents = dialedCents(targetHz, guessHz);
  return Math.max(0, Math.min(10, 10 * (1 - cents / 200)));
}

/** Floor to 2 decimals so display matches the reference (7.146 -> 7.14). */
export function floorScore2(score: number): number {
  return Math.floor(Math.max(0, score) * 100 + 1e-9) / 100;
}
