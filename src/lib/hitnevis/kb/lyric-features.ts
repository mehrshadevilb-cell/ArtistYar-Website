/**
 * Extracts non-lyric songwriting features from supplied lyric text.
 * Input should be user-provided, licensed, or otherwise authorized text.
 * The analyzer returns derived features only; it never persists lyric text.
 */
import { analyzeProsody, type ProsodyReport } from "../prosody";

export type LyricCorpusFeatures = {
  lineCount: number;
  wordCount: number;
  sectionCount: number;
  chorusLikeSections: number;
  repeatedLineRate: number;
  repeatedEndWordRate: number;
  clicheRiskHits: string[];
  prosody: ProsodyReport;
  featureVersion: string;
};

const CLICHE_PATTERNS: [string, RegExp][] = [
  ["دل/قلب + شکست", /(?:دل|قلب).{0,12}(?:شکست|شکسته)/],
  ["بدون تو", /بدون\s+(?:تو|عشق)/],
  ["تا ابد", /تا\s+ابد/],
  ["دلم تنگه", /دلم\s+(?:برات|برای\s+تو)?\s*تنگ/],
  ["شب تا صبح", /شب.{0,8}صبح/],
  ["اشک/گریه", /(?:اشک|گریه).{0,12}(?:چشم|می‌ریزم|ریختم)?/],
  ["عشق من", /عشق\s+من/],
];

function cleanLines(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
}

function endWord(line: string): string {
  return line
    .replace(/[«»“”"'.،!?؟:;()[\]{}]/g, " ")
    .trim()
    .split(/\s+/)
    .pop() || "";
}

export function extractLyricFeatures(text: string): LyricCorpusFeatures {
  const lines = cleanLines(text);
  const words = text.trim().split(/\s+/).filter(Boolean);
  const normalized = lines.map((line) => line.toLowerCase().replace(/\u200c/g, " "));
  const counts = new Map<string, number>();
  for (const line of normalized) counts.set(line, (counts.get(line) || 0) + 1);

  const repeatedLines = [...counts.values()].filter((n) => n > 1).reduce((sum, n) => sum + n - 1, 0);
  const repeatedLineRate = lines.length ? repeatedLines / lines.length : 0;

  const endCounts = new Map<string, number>();
  for (const line of lines) {
    const end = endWord(line);
    if (end) endCounts.set(end, (endCounts.get(end) || 0) + 1);
  }
  const repeatedEnds = [...endCounts.values()].filter((n) => n > 1).reduce((sum, n) => sum + n - 1, 0);
  const repeatedEndWordRate = lines.length ? repeatedEnds / lines.length : 0;

  const sections = text.split(/(?=^\s*(?:\[|#)?\s*(?:کورس|ترجیع|ورس|بند|بریج|bridge|chorus|verse|hook)\b)/im);
  const chorusLikeSections = sections.filter((s) => /(?:کورس|ترجیع|chorus|hook)/i.test(s)).length;

  const clicheRiskHits = CLICHE_PATTERNS
    .filter(([, pattern]) => pattern.test(text))
    .map(([name]) => name);

  return {
    lineCount: lines.length,
    wordCount: words.length,
    sectionCount: Math.max(1, sections.filter((s) => s.trim()).length),
    chorusLikeSections,
    repeatedLineRate: Math.round(repeatedLineRate * 1000) / 1000,
    repeatedEndWordRate: Math.round(repeatedEndWordRate * 1000) / 1000,
    clicheRiskHits,
    prosody: analyzeProsody(text),
    featureVersion: "1.0",
  };
}
