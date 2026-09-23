/**
 * ArtistYar Practice — unified domain model.
 * game → skill → source → round → difficulty → answer → validation → score → XP → rating → review
 */

export type PracticeSkillKey =
  | "ear_training"
  | "harmony"
  | "mixing"
  | "dynamics"
  | "stereo"
  | "critical_listening";

export type PracticeGameId = string;

export type PracticeAnswerSource =
  | "core_ear_gym"
  | "soundgym"
  | "pro_arcade"
  | "workout"
  | "daily_challenge"
  | "user_audio"
  | "voicing"
  | string;

export type PracticeRoundPayload = {
  gameId: PracticeGameId;
  skill?: PracticeSkillKey;
  difficulty?: number;
  correct?: boolean;
  accuracy?: number;
  responseTimeMs?: number;
  itemKey?: string;
  fingerprint?: string;
  rated?: boolean;
  source?: PracticeAnswerSource;
};

/** Free users: max stages per UTC day across ALL games (server-enforced). */
export const PRACTICE_FREE_DAILY_STAGE_LIMIT = 5;

export const PRACTICE_SCORE_MIN = -12;
export const PRACTICE_SCORE_MAX = 45;
export const PRACTICE_SESSION_SCORE_MAX = 300;

export type PracticeAccessSnapshot = {
  pro: boolean;
  dailyLimit: number | null;
  used: number;
  remaining: number | null;
};
