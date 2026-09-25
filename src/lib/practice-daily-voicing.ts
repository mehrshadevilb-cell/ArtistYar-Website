/**
 * Phase 6 — one advanced piano voicing per UTC day.
 * Styles: Jazz, Pop, R&B, Trap, Neo-Soul, Gospel
 */

import { utcDayKey } from "@/lib/practice-streak";

export type VoicingStyle = "jazz" | "pop" | "rnb" | "trap" | "neosoul" | "gospel";

export type DailyVoicing = {
  dayKey: string;
  style: VoicingStyle;
  styleFa: string;
  chord: string;
  quality: string;
  notes: string[]; // pitch names
  midi: number[];
  difficulty: number;
  usageFa: string;
  fingerprint: string;
};

const STYLES: Array<{ id: VoicingStyle; fa: string }> = [
  { id: "jazz", fa: "جز" },
  { id: "pop", fa: "پاپ" },
  { id: "rnb", fa: "آراندبی" },
  { id: "trap", fa: "ترپ" },
  { id: "neosoul", fa: "نئوسول" },
  { id: "gospel", fa: "گاسل" },
];

const BANK: Array<Omit<DailyVoicing, "dayKey" | "fingerprint">> = [
  { style: "jazz", styleFa: "جز", chord: "Cmaj7", quality: "rootless A", notes: ["E", "B", "D", "G"], midi: [64, 71, 74, 79], difficulty: 2, usageFa: "کمپینگ پشت سولو · hand voicing" },
  { style: "jazz", styleFa: "جز", chord: "Dm7", quality: "rootless B", notes: ["F", "A", "C", "E"], midi: [65, 69, 72, 76], difficulty: 2, usageFa: "ii در ii–V–I" },
  { style: "jazz", styleFa: "جز", chord: "G7alt", quality: "altered", notes: ["F", "Ab", "B", "Eb"], midi: [65, 68, 71, 75], difficulty: 4, usageFa: "V قبل از resolve به Cmaj" },
  { style: "pop", styleFa: "پاپ", chord: "Am", quality: "open triad+", notes: ["A", "E", "A", "C", "E"], midi: [57, 64, 69, 72, 76], difficulty: 1, usageFa: "بالاد · pad" },
  { style: "pop", styleFa: "پاپ", chord: "Fmaj7", quality: "add9 shell", notes: ["F", "A", "C", "G"], midi: [53, 57, 60, 67], difficulty: 2, usageFa: "پیش‌روی I–V–vi–IV" },
  { style: "rnb", styleFa: "آراندبی", chord: "Cmin9", quality: "spread", notes: ["C", "Eb", "G", "Bb", "D"], midi: [48, 51, 55, 58, 62], difficulty: 3, usageFa: "groove ballad" },
  { style: "rnb", styleFa: "آراندبی", chord: "Abmaj9", quality: "upper structure", notes: ["Ab", "C", "Eb", "G", "Bb"], midi: [56, 60, 63, 67, 70], difficulty: 3, usageFa: "color chord قبل از Fm" },
  { style: "trap", styleFa: "ترپ", chord: "Cm", quality: "dark stack", notes: ["C", "G", "Eb", "G"], midi: [36, 43, 51, 55], difficulty: 1, usageFa: "low + mid برای 808 space" },
  { style: "trap", styleFa: "ترپ", chord: "Abmaj7", quality: "bell", notes: ["Ab", "C", "Eb", "G"], midi: [68, 72, 75, 79], difficulty: 2, usageFa: "pluck / bell top" },
  { style: "neosoul", styleFa: "نئوسول", chord: "Emaj9#11", quality: "lush", notes: ["E", "G#", "B", "D#", "F#", "A#"], midi: [52, 56, 59, 63, 66, 70], difficulty: 4, usageFa: "pad + Rhodes" },
  { style: "neosoul", styleFa: "نئوسول", chord: "F#m11", quality: "quartal mix", notes: ["F#", "A", "C#", "E", "G#", "B"], midi: [54, 57, 61, 64, 68, 71], difficulty: 4, usageFa: "verse color" },
  { style: "gospel", styleFa: "گاسل", chord: "C7sus", quality: "shout", notes: ["C", "F", "G", "Bb", "D"], midi: [48, 53, 55, 58, 62], difficulty: 3, usageFa: "walk-up / shout chorus" },
  { style: "gospel", styleFa: "گاسل", chord: "Bb/C", quality: "slash", notes: ["C", "Bb", "D", "F"], midi: [48, 58, 62, 65], difficulty: 2, usageFa: "passing به F" },
];

function hashDay(dayKey: string): number {
  let h = 2166136261;
  for (let i = 0; i < dayKey.length; i++) {
    h ^= dayKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

export function buildDailyVoicing(dayKey: string = utcDayKey()): DailyVoicing {
  const h = hashDay(dayKey + ":voicing");
  const base = BANK[h % BANK.length];
  return {
    ...base,
    dayKey,
    fingerprint: `voicing|${dayKey}|${base.chord}|${base.style}`,
  };
}
