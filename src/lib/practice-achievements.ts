/** Phase 6 — achievement evaluation (server-side). */

export type AchievementContext = {
  totalXp: number;
  streak: number;
  longestStreak: number;
  totalRounds: number;
  workoutsCompleted: number;
  challengesSubmitted: number;
  voicingDays: number;
  maxDifficultyCorrect: number;
  alreadyGranted: Set<string>;
};

export type GrantedAchievement = {
  id: string;
  title: string;
  titleFa: string;
};

const DEFS: Array<{
  id: string;
  title: string;
  titleFa: string;
  test: (c: AchievementContext) => boolean;
}> = [
  { id: "first_round", title: "First Round", titleFa: "اولین راند", test: (c) => c.totalRounds >= 1 },
  { id: "streak_3", title: "3-Day Streak", titleFa: "۳ روز پیاپی", test: (c) => c.streak >= 3 || c.longestStreak >= 3 },
  { id: "streak_7", title: "7-Day Streak", titleFa: "۷ روز پیاپی", test: (c) => c.streak >= 7 || c.longestStreak >= 7 },
  { id: "streak_30", title: "30-Day Streak", titleFa: "۳۰ روز پیاپی", test: (c) => c.streak >= 30 || c.longestStreak >= 30 },
  { id: "workout_1", title: "First Workout", titleFa: "اولین ورک‌اوت", test: (c) => c.workoutsCompleted >= 1 },
  { id: "workout_10", title: "10 Workouts", titleFa: "۱۰ ورک‌اوت", test: (c) => c.workoutsCompleted >= 10 },
  { id: "challenge_1", title: "Daily Challenger", titleFa: "چالش روزانه", test: (c) => c.challengesSubmitted >= 1 },
  { id: "challenge_5", title: "Challenge Regular", titleFa: "۵ چالش", test: (c) => c.challengesSubmitted >= 5 },
  { id: "xp_500", title: "XP 500", titleFa: "۵۰۰ XP", test: (c) => c.totalXp >= 500 },
  { id: "xp_2000", title: "XP 2000", titleFa: "۲۰۰۰ XP", test: (c) => c.totalXp >= 2000 },
  { id: "hard_mode", title: "Hard Mode", titleFa: "سختی بالا", test: (c) => c.maxDifficultyCorrect >= 350 },
  { id: "voicing_7", title: "Voicing Week", titleFa: "هفته وکینگ", test: (c) => c.voicingDays >= 7 },
];

export function evaluateAchievements(ctx: AchievementContext): GrantedAchievement[] {
  const out: GrantedAchievement[] = [];
  for (const d of DEFS) {
    if (ctx.alreadyGranted.has(d.id)) continue;
    if (d.test(ctx)) out.push({ id: d.id, title: d.title, titleFa: d.titleFa });
  }
  return out;
}
