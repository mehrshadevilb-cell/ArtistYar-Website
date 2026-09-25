/**
 * Hit KB retrieval — lightweight tag/genre/mood scoring.
 * Returns abstract pattern context only (no lyrics).
 */

import { getHitKb, HIT_KB_VERSION, HIT_KB_SOURCE, type HitKbRecord, getHitKbStats } from "./dataset";

export type RetrieveQuery = {
  genre?: string;
  mood?: string;
  topic?: string;
  sectionType?: string;
  goal?: string;
  text?: string;
  limit?: number;
};

export type RetrieveResult = {
  version: string;
  source: string;
  matched: number;
  records: HitKbRecord[];
  patternSummary: string;
  antiCliche: string[];
  originality: string[];
};

type Stats = {
  retrievals: number;
  hits: number;
  misses: number;
  lastQueryAt: string | null;
};

const stats: Stats = {
  retrievals: 0,
  hits: 0,
  misses: 0,
  lastQueryAt: null,
};

function norm(s: string): string {
  return s
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .toLowerCase()
    .trim();
}

const GENRE_ALIASES: Record<string, string> = {
  pop: "pop",
  پاپ: "pop",
  hiphop: "hiphop",
  "hip-hop": "hiphop",
  rap: "hiphop",
  رپ: "hiphop",
  هیپ‌هاپ: "hiphop",
  هیپهاپ: "hiphop",
};

const MOOD_KEYWORDS: { key: string; patterns: RegExp[] }[] = [
  { key: "romantic", patterns: [/عاشق|عشق|رمانتیک|دلبر|معشوق/] },
  { key: "sad", patterns: [/غم|جدایی|خداحافظ|تنهایی|دلتنگ|شکست/] },
  { key: "party", patterns: [/مهمونی|پارتی|شب\s*جمع|بریم|شادی|رقص/] },
  { key: "longing", patterns: [/کجایی|دوری|انتظار|هوس/] },
  { key: "attitude", patterns: [/تهدید|قدرت|خیابون|رقیب|غیرت/] },
  { key: "melancholy", patterns: [/مالیخولیا|افسوس|حسرت|نوستالژی|یاد/] },
];

function scoreRecord(r: HitKbRecord, q: RetrieveQuery): number {
  let score = 0;
  const genre = q.genre ? GENRE_ALIASES[norm(q.genre)] || norm(q.genre) : "";
  if (genre && r.genre === genre) score += 5;
  if (genre && r.tags.includes(genre)) score += 2;

  const moodBlob = norm([q.mood, q.topic, q.text, q.goal].filter(Boolean).join(" "));
  if (moodBlob) {
    for (const m of r.moods) {
      if (moodBlob.includes(norm(m))) score += 3;
    }
    for (const t of r.tags) {
      if (moodBlob.includes(norm(t))) score += 1;
    }
    for (const mk of MOOD_KEYWORDS) {
      if (mk.patterns.some((p) => p.test(moodBlob)) && r.moods.includes(mk.key)) {
        score += 2;
      }
    }
  }

  if (q.sectionType) {
    const sec = norm(q.sectionType);
    if (sec.includes("chorus") || sec.includes("کورس") || sec.includes("hook")) {
      if (r.hookType) score += 2;
      if (r.repetition.includes("chorus") || r.repetition.includes("hook")) score += 1;
    }
    if (sec.includes("verse") || sec.includes("ورس")) {
      if (r.structure.includes("verse")) score += 1;
    }
    if (sec.includes("bridge") || sec.includes("بریج")) {
      if (r.structure.includes("bridge")) score += 2;
    }
  }

  if (q.goal) {
    const g = norm(q.goal);
    if (/هوک|قلاب|hook/.test(g) && r.hookType) score += 2;
    if (/قافیه|rhyme/.test(g)) score += 1;
    if (/نقد|تحلیل|dna/.test(g)) score += 1;
  }

  if (r.year >= 2024) score += 0.5;
  if (r.year >= 2025) score += 0.5;

  return score;
}

/** Retrieve top pattern cards for a songwriting request. */
export function retrieveHitPatterns(query: RetrieveQuery): RetrieveResult {
  stats.retrievals += 1;
  stats.lastQueryAt = new Date().toISOString();

  const limit = Math.min(8, Math.max(1, query.limit ?? 4));
  const kb = getHitKb();
  const scored = kb.map((r) => ({ r, s: scoreRecord(r, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);

  let top = scored.slice(0, limit).map((x) => x.r);

  if (top.length === 0) {
    stats.misses += 1;
    const genre = query.genre ? GENRE_ALIASES[norm(query.genre)] || norm(query.genre) : "";
    const pool = genre ? kb.filter((r) => r.genre === genre) : kb;
    top = [...pool].sort((a, b) => b.year - a.year).slice(0, limit);
  } else {
    stats.hits += 1;
  }

  const antiCliche = Array.from(new Set(top.flatMap((r) => r.clicheRisks))).slice(0, 8);
  const originality = Array.from(new Set(top.flatMap((r) => r.originalityTechniques))).slice(0, 6);
  const patternSummary = formatPatternSummary(top);

  return {
    version: HIT_KB_VERSION,
    source: HIT_KB_SOURCE,
    matched: top.length,
    records: top,
    patternSummary,
    antiCliche,
    originality,
  };
}

function formatPatternSummary(records: HitKbRecord[]): string {
  if (!records.length) return "";
  const lines: string[] = [
    "الگوهای انتزاعی از دانش‌پایهٔ ترانه‌های محبوب فارسی اخیر (بدون کپی متن ترانه):",
  ];
  for (const r of records.slice(0, 5)) {
    lines.push(
      `• [${r.genre}/${r.year}] ساختار: ${r.structure} | هوک: ${r.hookType} | قافیه: ${r.rhymeStyle} | قوس: ${r.emotionalArc} | رجیستر: ${r.register}`,
    );
  }
  const traits = Array.from(new Set(records.flatMap((r) => r.memorableTraits))).slice(0, 4);
  if (traits.length) lines.push(`ویژگی ماندگاری رایج: ${traits.join("؛ ")}`);
  lines.push(
    "این‌ها فقط الگو هستند. متن اصلی هیچ ترانه‌ای را بازنویسی یا نقل نکن. خروجی باید کاملاً اصیل باشد.",
  );
  return lines.join("\n");
}

export function getRetrievalDiagnostics() {
  const base = getHitKbStats();
  return {
    ...base,
    retrievals: stats.retrievals,
    successfulRetrievals: stats.hits,
    failedRetrievals: stats.misses,
    lastQueryAt: stats.lastQueryAt,
  };
}

export { HIT_KB_VERSION, HIT_KB_SOURCE, getHitKbStats };
