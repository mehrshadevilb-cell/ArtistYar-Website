/**
 * Save a round through the existing /api/practice/progress contract.
 * Server recalculates XP; we send accuracy + difficulty, never trust client XP.
 */

export type PersistRoundInput = {
  userId?: string;
  username?: string;
  fullName?: string;
  telegramId?: string | number;
  gameId: string;
  level: number;
  correct: boolean;
  accuracy: number;
  responseTimeMs: number;
  itemKey: string;
  source: string;
  extra?: Record<string, unknown>;
};

export type PersistRoundResult =
  | { ok: true; score?: number; remaining?: number | null; pro?: boolean }
  | { ok: false; code?: string; error?: string; quota?: boolean };

export async function persistPracticeRound(input: PersistRoundInput): Promise<PersistRoundResult> {
  if (!input.userId) return { ok: true };

  try {
    const difficulty = Math.max(1, Math.min(500, Math.round(20 + ((input.level - 1) / 49) * 460)));
    const res = await fetch("/api/practice/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        userId: input.userId,
        username: input.username,
        fullName: input.fullName,
        telegramId: input.telegramId,
        gameId: input.gameId,
        score: 0,
        accuracy: input.accuracy,
        streak: input.correct ? 1 : 0,
        bestScore: 0,
        difficulty,
        metadata: {
          source: input.source,
          difficulty,
          level: input.level,
          responseTimeMs: input.responseTimeMs,
          correct: input.correct,
          itemKey: input.itemKey,
          rated: true,
          ...(input.extra || {}),
        },
      }),
    });
    const payload = await res.json().catch(() => ({}));
    if (res.status === 429 || payload?.code === "daily_limit_reached") {
      return { ok: false, quota: true, code: "daily_limit_reached", error: payload?.error };
    }
    if (res.status === 409 || payload?.code === "duplicate") {
      return { ok: true };
    }
    if (!res.ok) {
      return { ok: false, code: payload?.code, error: payload?.error || "save_failed" };
    }
    return {
      ok: true,
      score: Number(payload?.score) || undefined,
      remaining: payload?.remaining ?? null,
      pro: Boolean(payload?.pro),
    };
  } catch {
    return { ok: false, error: "network" };
  }
}

const LEVEL_KEY = "artistyar_practice_levels_v1";

export function loadLocalLevel(gameId: string): number {
  try {
    const raw = JSON.parse(localStorage.getItem(LEVEL_KEY) || "{}");
    const n = Number(raw[gameId]);
    return Number.isFinite(n) ? Math.max(1, Math.min(50, Math.round(n))) : 1;
  } catch {
    return 1;
  }
}

export function saveLocalLevel(gameId: string, level: number) {
  try {
    const raw = JSON.parse(localStorage.getItem(LEVEL_KEY) || "{}");
    raw[gameId] = Math.max(1, Math.min(50, Math.round(level)));
    localStorage.setItem(LEVEL_KEY, JSON.stringify(raw));
  } catch {
    /* private mode */
  }
}

const STATS_KEY = "artistyar_practice_stats_v1";

export type LocalStats = { xp: number; streak: number; bestStreak: number; plays: number };

export function loadLocalStats(): LocalStats {
  try {
    const raw = JSON.parse(localStorage.getItem(STATS_KEY) || "{}");
    return {
      xp: Number(raw.xp) || 0,
      streak: Number(raw.streak) || 0,
      bestStreak: Number(raw.bestStreak) || 0,
      plays: Number(raw.plays) || 0,
    };
  } catch {
    return { xp: 0, streak: 0, bestStreak: 0, plays: 0 };
  }
}

export function saveLocalStats(stats: LocalStats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    /* */
  }
}
