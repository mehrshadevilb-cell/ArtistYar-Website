/**
 * Phase 6 — deterministic global daily challenge from real exercises.
 */

import { utcDayKey } from "@/lib/practice-streak";

const CHALLENGE_POOL = [
  "freq-detect",
  "eq-peak",
  "eq-match",
  "filter-expert",
  "bass-detective",
  "compressionist",
  "dr-compressor",
  "loudness-db",
  "pan-train",
  "stereo-width",
  "mix-masking",
  "mix-eq-decision",
  "balance-memory",
] as const;

function hashDay(dayKey: string): number {
  let h = 2166136261;
  for (let i = 0; i < dayKey.length; i++) {
    h ^= dayKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

export type DailyChallengeSpec = {
  dayKey: string;
  exerciseId: string;
  gameId: string;
  difficulty: number;
  seed: number;
  fingerprint: string;
  rounds: number;
  promptFa: string;
};

export function buildDailyChallenge(dayKey: string = utcDayKey()): DailyChallengeSpec {
  const h = hashDay(dayKey);
  const exerciseId = CHALLENGE_POOL[h % CHALLENGE_POOL.length];
  const difficulty = 120 + (h % 200); // 120–319
  const seed = h;
  const fingerprint = `daily|${dayKey}|${exerciseId}|${difficulty}|${seed}`;
  return {
    dayKey,
    exerciseId,
    gameId: `sg-${exerciseId}`,
    difficulty,
    seed,
    fingerprint,
    rounds: 5,
    promptFa: "چالش روزانه · ۵ راند · یک بار ارسال",
  };
}
