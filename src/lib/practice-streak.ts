/** UTC day-boundary streak (server source of truth). */
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

export function applyPracticeDay(state: StreakState, today: string = utcDayKey()): StreakState {
  const last = state.lastPracticeDay;
  if (last === today) return { ...state, practicedToday: true };
  let streak = 1;
  if (last) {
    const gap = daysBetweenUtc(last, today);
    streak = gap === 1 ? state.streak + 1 : 1;
  }
  return {
    streak,
    longestStreak: Math.max(state.longestStreak || 0, streak),
    lastPracticeDay: today,
    practicedToday: true,
  };
}
