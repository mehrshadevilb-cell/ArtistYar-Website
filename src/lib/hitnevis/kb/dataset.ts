/**
 * Persian Hit Knowledge Base v2026.09.24-v1 — abstract patterns, no lyrics.
 */
import type { HitKbRecord } from "./types";
import { inflateSync } from "zlib";
import { P0 } from "./pack0";
import { P1 } from "./pack1";
export const HIT_KB_VERSION = "2026.09.24-v1";
export const HIT_KB_SOURCE = "public-charts-abstract-patterns";
export type { HitKbRecord } from "./types";

function unpack(): HitKbRecord[] {
  const buf = Buffer.from(P0 + P1, "base64");
  const json = inflateSync(buf).toString("utf8");
  const rows = JSON.parse(json) as unknown[];
  return rows.map((row) => {
    const r = row as [
      string,
      string,
      string,
      number,
      string,
      string[],
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string[],
      string[],
      string[],
      string,
      string[],
    ];
    return {
      id: r[0],
      title: r[1],
      artist: r[2],
      year: r[3],
      genre: r[4],
      moods: r[5],
      structure: r[6],
      hookType: r[7],
      rhymeStyle: r[8],
      lineLength: r[9],
      repetition: r[10],
      register: r[11],
      storyTopic: r[12],
      emotionalArc: r[13],
      memorableTraits: r[14],
      clicheRisks: r[15],
      originalityTechniques: r[16],
      eraStyle: r[17],
      tags: r[18],
    };
  });
}

let cachedHitKb: HitKbRecord[] | null = null;

/**
 * Lazily inflate the compressed knowledge base. This keeps unrelated HitNevis
 * routes (for example local text analysis) from executing the KB decoder while
 * Next.js is collecting route data during the production build.
 */
export function getHitKb(): HitKbRecord[] {
  if (cachedHitKb) return cachedHitKb;
  cachedHitKb = unpack();
  return cachedHitKb;
}

export function getHitKbStats() {
  const rows = getHitKb();
  return {
    version: HIT_KB_VERSION,
    source: HIT_KB_SOURCE,
    songCount: rows.length,
    genres: Array.from(new Set(rows.map((r) => r.genre))),
    yearMin: Math.min(...rows.map((r) => r.year)),
    yearMax: Math.max(...rows.map((r) => r.year)),
  };
}
