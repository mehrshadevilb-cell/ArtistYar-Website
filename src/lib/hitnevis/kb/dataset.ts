/**
 * Persian Hit Knowledge Base — abstract patterns only.
 * No full lyrics. Metadata from public charts 2021–2026.
 * Version: 2026.09.24-v1
 * NEVER reproduce copyrighted lyric text from source songs.
 */

export const HIT_KB_VERSION = "2026.09.24-v1";
export const HIT_KB_SOURCE = "public-charts-abstract-patterns";

export type { HitKbRecord } from "./types";
import type { HitKbRecord } from "./types";
import { PART as P0 } from "./part0";
import { PART as P1 } from "./part1";
import { PART as P2 } from "./part2";
import { PART as P3 } from "./part3";

export const HIT_KB: HitKbRecord[] = [...P0, ...P1, ...P2, ...P3];

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
