/**
 * Phase 6 — authoritative XP calculation (server-side only).
 * Never trust client-submitted XP amounts.
 */

export type XpInput = {
  correct: boolean;
  accuracy: number; // 0–100
  difficulty: number; // 1–500
  responseTimeMs?: number | null;
  rated?: boolean;
  /** trivial farming: same difficulty band repeated with perfect score */
  recentPerfectEasyCount?: number;
  workoutBonus?: boolean;
  challengeBonus?: boolean;
};

const MAX_ROUND_XP = 45;
const MIN_ROUND_XP = -12;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Server-calculated XP for one rated round.
 * Wrong answers can yield negative XP.
 * Easy perfect spam is throttled.
 */
export function calculateRoundXp(input: XpInput): number {
  if (input.rated === false) return 0;

  const difficulty = clamp(Number(input.difficulty) || 1, 1, 500);
  const accuracy = clamp(Number(input.accuracy) || 0, 0, 100);
  const rt = input.responseTimeMs != null && input.responseTimeMs > 0 ? input.responseTimeMs : null;

  if (!input.correct) {
    // harder wrong = less penalty; easy wrong = more penalty
    const penalty = difficulty < 120 ? -12 : difficulty < 250 ? -8 : -5;
    return penalty;
  }

  // Base from difficulty (harder = more XP)
  let xp = 8 + Math.round(difficulty / 25); // ~8–28

  // Accuracy bonus
  if (accuracy >= 100) xp += 6;
  else if (accuracy >= 85) xp += 3;

  // Reaction time: under 2.5s small bonus, over 8s slight reduce
  if (rt != null) {
    if (rt < 2500) xp += 4;
    else if (rt < 4000) xp += 2;
    else if (rt > 8000) xp -= 2;
  }

  // Anti-farm: many perfect easy rounds recently
  const easySpam = Number(input.recentPerfectEasyCount) || 0;
  if (difficulty < 100 && accuracy >= 100 && easySpam >= 5) {
    xp = Math.min(xp, 3);
  }

  if (input.workoutBonus) xp += 5;
  if (input.challengeBonus) xp += 8;

  return clamp(xp, 0, MAX_ROUND_XP);
}

export function calculateWorkoutCompletionXp(accuracyPercent: number, slots: number): number {
  const base = 25 + Math.min(40, slots * 8);
  const acc = clamp(accuracyPercent, 0, 100);
  return Math.round(base * (0.5 + acc / 200));
}

export function calculateChallengeXp(correctCount: number, total: number, difficulty: number): number {
  const ratio = total > 0 ? correctCount / total : 0;
  const base = Math.round(20 + difficulty / 20);
  return clamp(Math.round(base * ratio * 1.4), 0, 80);
}

export { MAX_ROUND_XP, MIN_ROUND_XP };
