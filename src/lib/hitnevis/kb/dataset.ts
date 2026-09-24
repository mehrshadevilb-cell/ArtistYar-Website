/**
 * Persian Hit Knowledge Base v2026.09.24-v1 — abstract patterns, no lyrics.
 */
import type { HitKbRecord } from "./types";
import { inflateSync } from "zlib";
export const HIT_KB_VERSION = "2026.09.24-v1";
export const HIT_KB_SOURCE = "public-charts-abstract-patterns";
export type { HitKbRecord } from "./types";

const PACK = "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";

function unpack(): HitKbRecord[] {
  const buf = Buffer.from(PACK, "base64");
  const json = inflateSync(buf).toString("utf8");
  const rows = JSON.parse(json) as unknown[];
  return rows.map((row) => {
    const r = row as [
      string, string, string, number, string,
      string[], string, string, string,
      string, string, string, string,
      string, string[], string[],
      string[], string, string[],
    ];
    return {
      id: r[0], title: r[1], artist: r[2], year: r[3], genre: r[4],
      moods: r[5], structure: r[6], hookType: r[7], rhymeStyle: r[8],
      lineLength: r[9], repetition: r[10], register: r[11], storyTopic: r[12],
      emotionalArc: r[13], memorableTraits: r[14], clicheRisks: r[15],
      originalityTechniques: r[16], eraStyle: r[17], tags: r[18],
    };
  });
}

export const HIT_KB: HitKbRecord[] = unpack();

export function getHitKbStats() {
  return {
    version: HIT_KB_VERSION,
    source: HIT_KB_SOURCE,
    songCount: HIT_KB.length,
    genres: Array.from(new Set(HIT_KB.map((r) => r.genre))),
    yearMin: Math.min(...HIT_KB.map((r) => r.year)),
    yearMax: Math.max(...HIT_KB.map((r) => r.year)),
  };
}
