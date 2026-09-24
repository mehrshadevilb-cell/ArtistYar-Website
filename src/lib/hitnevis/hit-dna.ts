/**
 * Hit DNA + Human Tests — Phase 4
 * Uses only analytical features derived from the USER's own text.
 * Never scrapes or stores third-party copyrighted lyrics.
 * Does not claim any lyric is guaranteed to become a hit.
 */

import type {
  HitDnaFeatures,
  HumanTestId,
  HumanTestResult,
  HumanTestsReport,
} from "./types";

const DISCLAIMER =
  "این تحلیل تضمین هیت بودن نیست؛ فقط الگوهای ساختاری و زبانی متن خودت را نشان می‌دهد.";

function normalizeText(raw: string): string {
  return raw.replace(/\r\n/g, "\n").replace(/\u200c/g, "\u200c").trim();
}

function linesOf(text: string): string[] {
  return normalizeText(text)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function wordsOf(text: string): string[] {
  return normalizeText(text)
    .split(/[\s\n،,;؛.!?؟…]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1);
}

function uniqueRatio(items: string[]): number {
  if (!items.length) return 0;
  const set = new Set(items.map((i) => i.toLowerCase()));
  return set.size / items.length;
}

function clamp01(n: number): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function score10(n: number): number {
  return Math.round(clamp01(n) * 10 * 10) / 10;
}

function structureSignal(text: string): number {
  const t = text.toLowerCase();
  let hits = 0;
  const markers = [
    "ورس", "verse", "کورس", "chorus", "بریج", "bridge", "پری", "pre-chorus", "قلاب", "hook", "اوت", "outro",
  ];
  for (const m of markers) if (t.includes(m)) hits += 1;
  const lineCount = linesOf(text).length;
  if (lineCount >= 8) hits += 1;
  if (lineCount >= 16) hits += 1;
  return clamp01(hits / 6);
}

function hookSignal(text: string): number {
  const lines = linesOf(text);
  if (!lines.length) return 0;
  const freq = new Map<string, number>();
  for (const l of lines) {
    const key = l.replace(/\s+/g, " ").slice(0, 80);
    freq.set(key, (freq.get(key) || 0) + 1);
  }
  let max = 1;
  for (const v of freq.values()) if (v > max) max = v;
  const hasChorusLabel = /کورس|chorus|قلاب|hook/i.test(text);
  return clamp01((max >= 2 ? 0.5 : 0.2) + (hasChorusLabel ? 0.4 : 0) + (lines.length >= 4 ? 0.1 : 0));
}

function repetitionIndex(text: string): number {
  const lines = linesOf(text);
  if (lines.length < 2) return 0.2;
  const ratio = 1 - uniqueRatio(lines);
  if (ratio < 0.1) return 0.4;
  if (ratio < 0.35) return 0.85;
  if (ratio < 0.55) return 0.7;
  return 0.35;
}

function narrativeClarity(text: string): number {
  const words = wordsOf(text);
  if (words.length < 8) return 0.25;
  const pronouns = words.filter((w) => /^(من|تو|او|ما|شما|آن‌ها|اون|توئی|تویی)$/i.test(w)).length;
  const verbs = words.filter((w) => /م$|ی$|د$|یم$|ید$|ند$|ن$/.test(w)).length;
  const density = clamp01((pronouns + verbs) / Math.max(12, words.length));
  return clamp01(0.3 + density * 0.7);
}

function emotionalArc(text: string): number {
  const emotionWords =
    /عشق|دل|گریه|خنده|تنهایی|امید|درد|شب|صبح|آتش|سرد|گرم|ترس|شوق|بغض|آغوش|جدایی|وصال|خواب|رؤیا/gi;
  const matches = text.match(emotionWords) || [];
  const lines = linesOf(text).length || 1;
  return clamp01(matches.length / Math.max(4, lines * 0.4));
}

function rhymeDensity(text: string): number {
  const lines = linesOf(text);
  if (lines.length < 2) return 0.2;
  const endings = lines.map((l) => {
    const w = wordsOf(l);
    const last = w[w.length - 1] || "";
    return last.slice(-2).toLowerCase();
  });
  let pairs = 0;
  for (let i = 0; i < endings.length - 1; i++) {
    if (endings[i] && endings[i] === endings[i + 1]) pairs += 1;
    if (i + 2 < endings.length && endings[i] && endings[i] === endings[i + 2]) pairs += 0.5;
  }
  return clamp01(pairs / Math.max(2, lines.length / 2));
}

function registerConsistency(text: string): number {
  const formal = (text.match(/می‌|هست|است|باشد|گردد/g) || []).length;
  const colloquial = (text.match(/می‌شه|هستش|دیگه|چیز|آره|نه|واسه|اون/g) || []).length;
  const total = formal + colloquial;
  if (total < 3) return 0.55;
  const mix = Math.min(formal, colloquial) / total;
  return clamp01(1 - mix * 0.8);
}

function phraseDensity(text: string): number {
  const lines = linesOf(text);
  if (!lines.length) return 0;
  const avg = lines.reduce((s, l) => s + wordsOf(l).length, 0) / lines.length;
  if (avg >= 4 && avg <= 9) return 0.9;
  if (avg >= 3 && avg <= 12) return 0.7;
  if (avg < 3) return 0.4;
  return 0.45;
}

function memorabilitySignal(text: string): number {
  return clamp01(
    hookSignal(text) * 0.35 +
      repetitionIndex(text) * 0.25 +
      phraseDensity(text) * 0.2 +
      emotionalArc(text) * 0.2,
  );
}

const CLICHE_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /شب\s*تا\s*صبح/gi, label: "شب تا صبح" },
  { re: /دل\s*من/gi, label: "دل من (تکراری)" },
  { re: /بدون\s*تو\s*نمی‌تونم/gi, label: "بدون تو نمی‌تونم" },
  { re: /عشق\s*من/gi, label: "عشق من (کلیشه)" },
  { re: /تا\s*ابد/gi, label: "تا ابد" },
  { re: /قلب\s*شکسته/gi, label: "قلب شکسته" },
  { re: /گریه‌[ی ]?های\s*شبانه/gi, label: "گریه‌های شبانه" },
  { re: /you'?re\s+my\s+everything/gi, label: "you're my everything" },
];

export function detectCliches(text: string): string[] {
  const found: string[] = [];
  for (const c of CLICHE_PATTERNS) {
    if (c.re.test(text)) found.push(c.label);
    c.re.lastIndex = 0;
  }
  return [...new Set(found)].slice(0, 12);
}

export function analyzeHitDna(rawText: string): HitDnaFeatures {
  const text = normalizeText(rawText);
  const notes: string[] = [];
  if (!text || text.length < 12) {
    return {
      structureScore: 0, hookPresence: 0, repetitionIndex: 0, narrativeClarity: 0,
      emotionalArc: 0, rhymeDensity: 0, registerConsistency: 0, phraseDensity: 0,
      memorabilitySignal: 0, overall: 0, notes: ["متن کافی برای تحلیل نیست."], disclaimer: DISCLAIMER,
    };
  }
  const structureScore = structureSignal(text);
  const hookPresence = hookSignal(text);
  const rep = repetitionIndex(text);
  const narrative = narrativeClarity(text);
  const emotion = emotionalArc(text);
  const rhyme = rhymeDensity(text);
  const register = registerConsistency(text);
  const phrase = phraseDensity(text);
  const memo = memorabilitySignal(text);
  if (structureScore < 0.4) notes.push("ساختار بخش‌ها (ورس/کورس) را واضح‌تر مشخص کن.");
  if (hookPresence < 0.45) notes.push("قلاب تکرارشونده یا کورس قوی‌تر می‌تواند memorability را بالا ببرد.");
  if (rep > 0.8) notes.push("تکرار زیاد است؛ تعادل با خطوط تازه.");
  if (emotion < 0.35) notes.push("واژه‌های حسی و تصویر ملموس اضافه کن.");
  if (rhyme < 0.3) notes.push("قافیه‌های انتهای خط را کمی محکم‌تر کن (اختیاری).");
  const cliches = detectCliches(text);
  if (cliches.length) notes.push(`کلیشه‌های احتمالی: ${cliches.join("، ")}`);
  const overall = clamp01(
    structureScore * 0.12 + hookPresence * 0.16 + rep * 0.1 + narrative * 0.12 +
      emotion * 0.14 + rhyme * 0.1 + register * 0.08 + phrase * 0.08 + memo * 0.1,
  );
  return {
    structureScore: score10(structureScore), hookPresence: score10(hookPresence),
    repetitionIndex: score10(rep), narrativeClarity: score10(narrative),
    emotionalArc: score10(emotion), rhymeDensity: score10(rhyme),
    registerConsistency: score10(register), phraseDensity: score10(phrase),
    memorabilitySignal: score10(memo), overall: score10(overall),
    notes: notes.slice(0, 8), disclaimer: DISCLAIMER,
  };
}

const TEST_LABELS: Record<HumanTestId, string> = {
  first_listen: "اولین شنیدن", sing: "تست خواندن", memory: "تست حافظه",
  emotion: "تست احساس", conversation: "تست مکالمه", cliche: "تست کلیشه", artist: "تست صدای هنرمند",
};

export function runHumanTests(rawText: string, artistNotes?: string): HumanTestsReport {
  const dna = analyzeHitDna(rawText);
  const cliches = detectCliches(rawText);
  const tests: HumanTestResult[] = [
    {
      id: "first_listen", label: TEST_LABELS.first_listen,
      score: score10((dna.hookPresence / 10) * 0.5 + (dna.memorabilitySignal / 10) * 0.5),
      summary: "آیا در چند ثانیه اول قلاب یا تصویر می‌چسبد؟",
      tips: dna.hookPresence < 5 ? ["یک خط تکرارشونده در کورس بگذار.", "اولین خط را تصویری‌تر کن."] : ["قلاب نسبتاً مشخص است؛ روی تازگی واژه‌ها کار کن."],
    },
    {
      id: "sing", label: TEST_LABELS.sing, score: dna.phraseDensity,
      summary: "آیا خطوط روی نفس و ملودی راحت می‌نشینند؟",
      tips: dna.phraseDensity < 6 ? ["طول خطوط را متعادل کن (حدود ۴–۹ واژه).", "خوشه‌های صامت سنگین را کم کن."] : ["تراکم عبارت مناسب آواز است."],
    },
    {
      id: "memory", label: TEST_LABELS.memory, score: dna.memorabilitySignal,
      summary: "چقدر احتمال دارد فردا هنوز یک خط را به یاد بیاورد؟",
      tips: dna.memorabilitySignal < 6 ? ["یک عبارت امضا (signature line) بساز.", "تکرار هوشمند در کورس."] : ["سیگنال memorability قابل قبول است."],
    },
    {
      id: "emotion", label: TEST_LABELS.emotion, score: dna.emotionalArc,
      summary: "قوس احساسی و واژه‌های حسی چقدر ملموس‌اند؟",
      tips: dna.emotionalArc < 5 ? ["جزئیات حسی (صدا، نور، لمس) اضافه کن.", "از کلیشهٔ احساسی پرهیز کن."] : ["بار احساسی قابل لمس است."],
    },
    {
      id: "conversation", label: TEST_LABELS.conversation, score: dna.registerConsistency,
      summary: "آیا مثل حرف زدن واقعی یک نفر به نظر می‌رسد؟",
      tips: dna.registerConsistency < 6 ? ["رجیستر محاوره/ادبی را یکدست کن.", "جملات را بلند بخوان و طبیعی‌شان کن."] : ["رجیستر نسبتاً یکدست است."],
    },
    {
      id: "cliche", label: TEST_LABELS.cliche, score: score10(1 - Math.min(1, cliches.length / 5)),
      summary: cliches.length ? `کلیشه‌های یافت‌شده: ${cliches.join("، ")}` : "کلیشهٔ رایج کمی دیده شد.",
      tips: cliches.length ? ["با موتور ضدکلیشه جایگزین تازه بساز.", "تصویر شخصی‌تر به جای عبارت آماده."] : ["ادامه بده؛ از عبارات آماده دوری کن."],
    },
    {
      id: "artist", label: TEST_LABELS.artist,
      score: artistNotes?.trim() ? score10(0.55 + (dna.registerConsistency / 10) * 0.45) : score10(0.45 + (dna.narrativeClarity / 10) * 0.4),
      summary: artistNotes?.trim() ? "با پروفایل صدای هنرمند مقایسهٔ تقریبی انجام شد." : "پروفایل صدا تنظیم نشده؛ امتیاز بر اساس انسجام متن است.",
      tips: artistNotes?.trim() ? ["واژه‌های امضای خودت را تکرار کن.", "از کلمات ممنوع پروفایل پرهیز کن."] : ["پروفایل صدای هنرمند را در تنظیمات پر کن."],
    },
  ];
  const overall = Math.round((tests.reduce((s, t) => s + t.score, 0) / tests.length) * 10) / 10;
  return { tests, overall, disclaimer: DISCLAIMER };
}

export function formatHitDnaReport(dna: HitDnaFeatures): string {
  const lines = [
    "🧬 Hit DNA (تحلیل الگو — نه تضمین هیت)",
    `ساختار: ${dna.structureScore}/10`, `حضور هوک: ${dna.hookPresence}/10`,
    `تکرار: ${dna.repetitionIndex}/10`, `وضوح روایت: ${dna.narrativeClarity}/10`,
    `قوس احساسی: ${dna.emotionalArc}/10`, `تراکم قافیه: ${dna.rhymeDensity}/10`,
    `انسجام رجیستر: ${dna.registerConsistency}/10`, `تراکم عبارت: ${dna.phraseDensity}/10`,
    `سیگنال memorability: ${dna.memorabilitySignal}/10`, `جمع: ${dna.overall}/10`,
  ];
  if (dna.notes.length) {
    lines.push("", "نکات:");
    for (const n of dna.notes) lines.push(`• ${n}`);
  }
  lines.push("", dna.disclaimer);
  return lines.join("\n");
}

export function formatHumanTestsReport(report: HumanTestsReport): string {
  const lines = ["🧪 تست‌های انسانی کیفیت", `میانگین: ${report.overall}/10`, ""];
  for (const t of report.tests) {
    lines.push(`${t.label}: ${t.score}/10 — ${t.summary}`);
    for (const tip of t.tips) lines.push(`  → ${tip}`);
  }
  lines.push("", report.disclaimer);
  return lines.join("\n");
}
