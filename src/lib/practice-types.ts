/**
 * ArtistYar Practice — unified domain model (Phase 1 foundation).
 *
 * game → skill → source → round → difficulty → answer → validation → score → XP → rating → review → telemetry
 *
 * Phase 2 exercises (Frequency, EQ, EQ Matching, Filter, Compression, Dynamics,
 * Pan, Stereo Width, Delay, Reverb, Distortion, Feedback, Balance Memory,
 * Mix Decision, Adaptive Workouts) should plug into this model.
 */

export type PracticeSkillKey =
  | "ear_training"
  | "harmony"
  | "mixing"
  | "dynamics"
  | "stereo"
  | "critical_listening";

/** Stable game / exercise ids used in practice_records.game_id and skill mapping. */
export type PracticeGameId =
  | "tone"
  | "eq"
  | "compressor"
  | "phase"
  | "theory"
  | "theory-interval"
  | "theory-chord"
  | "reverb"
  | "saturation"
  | "masking"
  | "transient"
  | "voicing"
  | "personal"
  | "pro-reverb"
  | "pro-saturation"
  | "pro-masking"
  | "pro-transient"
  | string;

export type PracticeAnswerSource =
  | "core_ear_gym"
  | "pro_arcade"
  | "theory_lab"
  | "voicing_lab"
  | "starter"
  | "adaptive"
  | "soundgym"
  | string;

export type PracticeRoundPayload = {
  userId: string;
  gameId: PracticeGameId;
  score: number;
  accuracy: number;
  streak: number;
  bestScore?: number;
  metadata: {
    source?: PracticeAnswerSource;
    skill?: string;
    answer?: string | number;
    correct?: boolean;
    difficulty?: number;
    responseTimeMs?: number;
    itemKey?: string;
    verificationToken?: string;
    sessionId?: string;
    tier?: number;
    wrongPenalty?: boolean;
    [key: string]: unknown;
  };
};

/** Free tier: max stages per UTC day across all games. Pro: unlimited while subscription active. */
export const PRACTICE_FREE_DAILY_STAGE_LIMIT = 5;

/** Per-round score bounds enforced server-side. */
export const PRACTICE_SCORE_MIN = -8;
export const PRACTICE_SCORE_MAX = 20;
export const PRACTICE_SESSION_SCORE_MAX = 300;

export type PracticeAccessSnapshot = {
  pro: boolean;
  dailyLimit: number;
  used: number;
  remaining: number | null;
  unlimited: boolean;
  proExpiresAt: string | null;
};
