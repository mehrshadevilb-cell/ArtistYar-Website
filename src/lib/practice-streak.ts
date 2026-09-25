/**
 * Phase 6 — timezone-safe streak (UTC day boundaries).
 * Server is source of truth; client cannot invent days.
 */

export function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function daysBetweenUtc(a: string, b: string): number {
  const ta = Date.parse(a + "T00:00:00.000Z");
  const tb = Date.parse(b + "T00:00:00.000Z");
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return 999;
  return Math.round((tb - ta) / 86400000);
}

export type StreakState = {
  streak: number;
  longestStreak: number;
  lastPracticeDay: string | null;
  practicedToday: boolean;
};

/**
 * Apply a practice event on `today` (UTC day key).
 * Idempotent for same-day repeats.
 */
export function applyPracticeDay(
  state: StreakState,
  today: string = utcDayKey(),
): StreakState {
  const last = state.lastPracticeDay;
  if (last === today) {
    return { ...state, practicedToday: true };
  }
  let streak = 1;
  if (last) {
    const gap = daysBetweenUtc(last, today);
    if (gap === 1) streak = state.streak + 1;
    else streak = 1; // missed day(s)
  }
  const longest = Math.max(state.longestStreak || 0, streak);
  return {
    streak,
    longestStreak: longest,
    lastPracticeDay: today,
    practicedToday: true,
  };
}
