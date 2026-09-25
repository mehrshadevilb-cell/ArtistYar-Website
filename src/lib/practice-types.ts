/** Unified Practice model — free daily limit is global across all games. */
export const PRACTICE_FREE_DAILY_STAGE_LIMIT = 5;

export type PracticeGameId =
  | "core-ear"
  | "pro-arcade"
  | "soundgym"
  | "theory"
  | "voicing"
  | "workout"
  | "user-audio"
  | "challenge";

export type PracticeAccessSnapshot = {
  pro: boolean;
  stageLimit: number;
  stagesUsedToday: number;
  remaining: number;
  subscriptionDays?: number;
  proExpiresAt?: string | null;
};
