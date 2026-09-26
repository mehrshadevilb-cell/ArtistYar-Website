/**
 * Interval Recognition — domain model + round generator.
 * Uses existing adaptive level (1–50) as hardness authority.
 * Audio: existing harmonic + intervalHz (melodic sequential presentation).
 */

import type { GameRound } from "./rounds";
import { bandForLevel, listenSeconds, pick, seeded } from "./difficulty";

export type IntervalId =
  | "P1"
  | "m2"
  | "M2"
  | "m3"
  | "M3"
  | "P4"
  | "TT"
  | "P5"
  | "m6"
  | "M6"
  | "m7"
  | "M7"
  | "P8";

export type IntervalDirection = "ascending" | "descending";

export type IntervalDef = {
  id: IntervalId;
  semitones: number;
  titleEn: string;
  titleFa: string;
  /** relative difficulty weight 1–5 for pool ordering */
  weight: number;
};

/** Canonical interval table — single source for this module. */
export const INTERVALS: readonly IntervalDef[] = [
  { id: "P1", semitones: 0, titleEn: "Unison", titleFa: "هم‌صدا", weight: 1 },
  { id: "m2", semitones: 1, titleEn: "Minor 2nd", titleFa: "دوم کوچک", weight: 4 },
  { id: "M2", semitones: 2, titleEn: "Major 2nd", titleFa: "دوم بزرگ", weight: 2 },
  { id: "m3", semitones: 3, titleEn: "Minor 3rd", titleFa: "سوم کوچک", weight: 2 },
  { id: "M3", semitones: 4, titleEn: "Major 3rd", titleFa: "سوم بزرگ", weight: 2 },
  { id: "P4", semitones: 5, titleEn: "Perfect 4th", titleFa: "چهارم درست", weight: 2 },
  { id: "TT", semitones: 6, titleEn: "Tritone", titleFa: "تریتون", weight: 4 },
  { id: "P5", semitones: 7, titleEn: "Perfect 5th", titleFa: "پنجم درست", weight: 1 },
  { id: "m6", semitones: 8, titleEn: "Minor 6th", titleFa: "ششم کوچک", weight: 3 },
  { id: "M6", semitones: 9, titleEn: "Major 6th", titleFa: "ششم بزرگ", weight: 3 },
  { id: "m7", semitones: 10, titleEn: "Minor 7th", titleFa: "هفتم کوچک", weight: 3 },
  { id: "M7", semitones: 11, titleEn: "Major 7th", titleFa: "هفتم بزرگ", weight: 4 },
  { id: "P8", semitones: 12, titleEn: "Octave", titleFa: "اکتاو", weight: 1 },
] as const;

const BY_ID: Record<string, IntervalDef> = Object.fromEntries(INTERVALS.map((i) => [i.id, i]));

export function getInterval(id: string): IntervalDef | undefined {
  return BY_ID[id];
}

/** Level-mapped beginner → advanced interval pools (adaptive level is sole hardness authority). */
export function intervalPoolForLevel(level: number): IntervalDef[] {
  const safe = Number.isFinite(level) ? Math.max(1, Math.min(50, Math.round(level))) : 1;
  if (safe <= 5) {
    return INTERVALS.filter((i) => ["P5", "P8", "M3", "M2", "P4"].includes(i.id));
  }
  if (safe <= 10) {
    return INTERVALS.filter((i) =>
      ["P5", "P8", "M3", "m3", "M2", "P4", "M6"].includes(i.id),
    );
  }
  if (safe <= 20) {
    return INTERVALS.filter((i) => i.id !== "P1" && i.weight <= 3);
  }
  if (safe <= 35) {
    return INTERVALS.filter((i) => i.id !== "P1");
  }
  return [...INTERVALS];
}

function optionCountForLevel(level: number): number {
  if (level <= 8) return 3;
  if (level <= 18) return 4;
  if (level <= 30) return 5;
  return 6;
}

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function shuffleIds<T extends { id: string }>(items: T[], seed: number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(seeded(seed + i * 17) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function key(parts: Array<string | number>) {
  return parts.join("|").slice(0, 180);
}

export type IntervalGenerateOpts = {
  recentIntervalIds?: string[];
  recentDirections?: IntervalDirection[];
};

export function generateIntervalRecognition(
  level: number,
  seed: number,
  opts?: IntervalGenerateOpts,
): GameRound {
  const lvl = Number.isFinite(level) ? Math.max(1, Math.min(50, Math.round(level))) : 1;
  const pool = intervalPoolForLevel(lvl);
  const recent = (opts?.recentIntervalIds || []).filter(Boolean).slice(-6);

  let candidates = pool.filter((i) => !recent.includes(i.id));
  if (candidates.length === 0) {
    // Beginner pools can be smaller than the six-item history window. In that
    // case, prefer the least-recently-used interval instead of reopening the
    // whole pool and allowing an immediate repeat.
    const lastSeen = new Map<string, number>();
    recent.forEach((id, index) => lastSeen.set(id, index));
    const ranked = [...pool].sort((a, b) => {
      const aSeen = lastSeen.has(a.id) ? (lastSeen.get(a.id) as number) : -1;
      const bSeen = lastSeen.has(b.id) ? (lastSeen.get(b.id) as number) : -1;
      return aSeen - bSeen;
    });
    const oldest = ranked.filter((i) => {
      const seen = lastSeen.get(i.id);
      return seen === undefined || seen === Math.min(
        ...ranked
          .map((item) => lastSeen.get(item.id))
          .filter((value): value is number => value !== undefined),
      );
    });
    candidates = oldest.length ? oldest : ranked.slice(0, 1);
  }

  const picked = pick(candidates, seed);
  const def = BY_ID[picked.id] || picked;

  let direction: IntervalDirection = "ascending";
  if (lvl >= 8) {
    const wantDesc = seeded(seed + 41) > (lvl >= 20 ? 0.45 : 0.65);
    direction = wantDesc ? "descending" : "ascending";
    const lastDirs = opts?.recentDirections || [];
    if (lastDirs.length >= 2 && lastDirs.slice(-2).every((d) => d === direction)) {
      direction = direction === "ascending" ? "descending" : "ascending";
    }
  }

  const rootBase = 48 + Math.floor(seeded(seed + 9) * 16);
  let rootMidi = rootBase;
  let otherMidi = rootMidi + (direction === "ascending" ? def.semitones : -def.semitones);
  if (otherMidi < 36) {
    rootMidi += 12;
    otherMidi += 12;
  }
  if (otherMidi > 84) {
    rootMidi -= 12;
    otherMidi -= 12;
  }

  const fundHz = midiToHz(rootMidi);
  const otherHz = midiToHz(otherMidi);
  const firstHz = direction === "ascending" ? fundHz : otherHz;
  const secondHz = direction === "ascending" ? otherHz : fundHz;

  const nOpts = optionCountForLevel(lvl);
  const distractorPool = pool.filter((i) => i.id !== def.id);
  const distractors = shuffleIds(
    distractorPool.map((i) => ({ id: i.id, label: i.titleFa })),
    seed + 3,
  ).slice(0, Math.max(1, nOpts - 1));

  let options = shuffleIds(
    [{ id: def.id, label: def.titleFa }, ...distractors],
    seed + 11,
  );
  if (!options.some((o) => o.id === def.id)) {
    options = [{ id: def.id, label: def.titleFa }, ...options].slice(0, nOpts);
    options = shuffleIds(options, seed + 19);
  }
  options = options.slice(0, nOpts);

  const band = bandForLevel(lvl);
  const dirFa = direction === "ascending" ? "صعودی" : "نزولی";
  const dur = Math.min(0.7, Math.max(0.4, listenSeconds(lvl) * 0.45));

  return {
    gameId: "interval-recognition",
    mode: "choice",
    prompt: "فاصلهٔ بین دو نت را تشخیص بده",
    hint:
      band === "beginner"
        ? "اول نت پایه را قفل کن، بعد فاصله را بسنج"
        : `جهت: ${dirFa} · به اندازهٔ پرش گوش بده`,
    reviewText: `${def.titleFa} · ${def.semitones} نیم‌پرده · ${dirFa}`,
    source: {
      kind: "harmonic",
      fundamental: firstHz,
      partials: [1],
      duration: dur,
      intervalHz: secondHz,
    },
    challengeDsp: { type: "none" },
    options,
    correctOptionId: def.id,
    itemKey: key(["interval-recognition", lvl, def.id, direction, rootMidi, seed]),
    level: lvl,
  };
}

export function parseIntervalFromItemKey(itemKey: string): string | null {
  const parts = String(itemKey || "").split("|");
  return parts[2] || null;
}
