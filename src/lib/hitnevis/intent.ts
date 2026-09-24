/**
 * Persian natural-language → HitNevisMode intent router.
 * Client-side only; no secrets. Prefer explicit section/action cues.
 */

export type HitNevisMode =
  | "write_full"
  | "write_chorus"
  | "write_verse"
  | "write_pre_chorus"
  | "write_bridge"
  | "write_outro"
  | "improve"
  | "rhyme"
  | "title_ideas"
  | "structure"
  | "continue"
  | "rewrite"
  | "shorten"
  | "emotional"
  | "conversational"
  | "visual"
  | "bold"
  | "critic"
  | "idea_analyze"
  | "hook_lab"
  | "anti_cliche"
  | "save_lyric"
  | "hit_dna"
  | "human_tests"
  | "artist_voice"
  | "chat";

export type LyricSectionId =
  | "verse"
  | "pre_chorus"
  | "chorus"
  | "bridge"
  | "outro"
  | "hook"
  | "other";

export type IntentResult = {
  mode: HitNevisMode;
  sectionType?: LyricSectionId;
  confidence: number;
  label: string;
};

function norm(s: string): string {
  return s
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

type Rule = {
  mode: HitNevisMode;
  sectionType?: LyricSectionId;
  label: string;
  patterns: RegExp[];
  weight: number;
};

const RULES: Rule[] = [
  {
    mode: "hit_dna",
    label: "تحلیل Hit DNA",
    weight: 100,
    patterns: [/hit\s*dna/i, /هیت\s*دی\s*ان\s*ای/, /دی ان ای/, /تحلیل\s*(الگو|ساختاری|کیفیت)/],
  },
  {
    mode: "human_tests",
    label: "تست انسانی",
    weight: 98,
    patterns: [/تست\s*انسانی/, /human\s*test/i, /اولین\s*شنود/, /تست\s*کیفیت/],
  },
  {
    mode: "anti_cliche",
    label: "ضدکلیشه",
    weight: 96,
    patterns: [/کلیشه/, /ضد\s*کلیشه/, /کلیشه\s*ها/, /عبارت\s*تکراری/],
  },
  {
    mode: "critic",
    label: "نقد حرفه‌ای",
    weight: 94,
    patterns: [/نقد/, /منتقد/, /نقاط\s*(قوت|ضعف)/, /نقدش\s*کن/, /نظر\s*بده\s*درباره/],
  },
  {
    mode: "hook_lab",
    label: "آزمایشگاه هوک",
    weight: 92,
    patterns: [/هوک/, /قلاب/, /چند\s*(نسخه|هوک|قلاب)/, /hook\s*lab/i],
  },
  {
    mode: "save_lyric",
    label: "نجات ترانه",
    weight: 90,
    patterns: [/نجات/, /چند\s*جهت/, /راه\s*نجات/, /save\s*the\s*lyric/i],
  },
  {
    mode: "idea_analyze",
    label: "تحلیل ایده",
    weight: 88,
    patterns: [/تحلیل\s*ایده/, /ایده\s*(رو|را)?\s*تحلیل/, /پتانسیل\s*(ایده|ترانه)/],
  },
  {
    mode: "artist_voice",
    label: "صدای هنرمند",
    weight: 86,
    patterns: [/با\s*لحن\s*خودم/, /صدای\s*(من|خودم|هنرمند)/, /به\s*سبک\s*خودم/, /پروفایل\s*صدا/],
  },
  {
    mode: "continue",
    label: "ادامه",
    weight: 84,
    patterns: [/ادامه/, /ادامه‌?ش/, /برام\s*ادامه/, /ادامه‌?ش\s*بده/, /از\s*اینجا\s*ادامه/],
  },
  {
    mode: "rewrite",
    label: "بازنویسی",
    weight: 82,
    patterns: [/بازنویس/, /از\s*نو\s*بنویس/, /rewrite/i],
  },
  {
    mode: "improve",
    label: "بهبود",
    weight: 80,
    patterns: [/بهتر\s*کن/, /بهبود/, /قوی‌?تر/, /این\s*قسمت\s*رو\s*بهتر/, /اصلاح\s*کن/],
  },
  {
    mode: "shorten",
    label: "کوتاه‌سازی",
    weight: 78,
    patterns: [/کوتاه/, /فشرده/, /خلاصه\s*کن/, /کوتاه‌?تر/],
  },
  {
    mode: "emotional",
    label: "احساسی‌تر",
    weight: 76,
    patterns: [/احساس/, /احساسی‌?تر/, /عمیق‌?تر\s*کن/, /بار\s*احساسی/],
  },
  {
    mode: "conversational",
    label: "محاوره",
    weight: 74,
    patterns: [/محاوره/, /عامیانه/, /طبیعی‌?تر\s*صحبت/, /لحن\s*صحبت/],
  },
  {
    mode: "visual",
    label: "تصویری",
    weight: 72,
    patterns: [/تصویر/, /تصویری/, /جزئیات\s*بصری/, /صحنه\s*بساز/],
  },
  {
    mode: "bold",
    label: "جسورت‌تر",
    weight: 70,
    patterns: [/جسور/, /جسورانه‌?تر/, /مستقیم‌?تر/, /بی‌پرده/],
  },
  {
    mode: "rhyme",
    label: "قافیه",
    weight: 68,
    patterns: [/قافیه/, /هم‌?قافیه/, /rhyme/i, /قافیه‌?ها/],
  },
  {
    mode: "title_ideas",
    label: "ایده عنوان",
    weight: 66,
    patterns: [/عنوان/, /اسم\s*ترانه/, /تایتل/, /title/i],
  },
  {
    mode: "structure",
    label: "ساختار",
    weight: 64,
    patterns: [/ساختار/, /ترتیب\s*بخش/, /چیدمان\s*ترانه/],
  },
  {
    mode: "write_outro",
    sectionType: "outro",
    label: "نوشتن اوت‌رو",
    weight: 62,
    patterns: [/اوت\s*رو/, /outro/i, /پایان\s*ترانه\s*بنویس/],
  },
  {
    mode: "write_bridge",
    sectionType: "bridge",
    label: "نوشتن بریج",
    weight: 60,
    patterns: [/بریج/, /bridge/i],
  },
  {
    mode: "write_pre_chorus",
    sectionType: "pre_chorus",
    label: "نوشتن پری‌کورس",
    weight: 58,
    patterns: [/پری[\s\-‌]?کورس/, /pre[\s\-]?chorus/i],
  },
  {
    mode: "write_chorus",
    sectionType: "chorus",
    label: "نوشتن کورس",
    weight: 56,
    patterns: [/کورس/, /chorus/i, /یه\s*کورس/, /یک\s*کورس/, /کورس\s*قوی/],
  },
  {
    mode: "write_verse",
    sectionType: "verse",
    label: "نوشتن ورس",
    weight: 54,
    patterns: [/ورس/, /verse/i, /یه\s*ورس/, /بند\s*شعر/],
  },
  {
    mode: "write_full",
    label: "ترانه کامل",
    weight: 50,
    patterns: [/ترانه\s*کامل/, /یه\s*ترانه/, /یک\s*ترانه/, /بنویس.*ترانه/, /ترانه\s*بساز/, /full\s*song/i],
  },
];

/** Infer mode + optional section from free Persian text. */
export function detectIntent(userText: string, hasExistingLyrics: boolean): IntentResult {
  const t = norm(userText);
  if (!t) {
    return {
      mode: "chat",
      confidence: 0.15,
      label: "گفتگو",
    };
  }

  let best: Rule | null = null;
  let bestScore = 0;
  for (const rule of RULES) {
    for (const p of rule.patterns) {
      if (p.test(t)) {
        const score = rule.weight;
        if (score > bestScore) {
          bestScore = score;
          best = rule;
        }
        break;
      }
    }
  }

  if (best) {
    return {
      mode: best.mode,
      sectionType: best.sectionType,
      confidence: Math.min(1, bestScore / 100),
      label: best.label,
    };
  }

  // No strong rule → natural co-writing chat (multi-turn context handles the rest)
  if (/تحلیل/.test(t)) {
    return { mode: "idea_analyze", confidence: 0.45, label: "تحلیل ایده" };
  }
  return { mode: "chat", confidence: 0.3, label: "گفتگو" };
}

export const QUICK_ACTIONS: { label: string; prompt: string }[] = [
  { label: "ترانه کامل", prompt: "یه ترانه کامل درباره جدایی در شب بارانی بنویس" },
  { label: "کورس قوی", prompt: "یه کورس قوی و ماندگار بساز" },
  { label: "ادامه بده", prompt: "ادامه‌ش بده" },
  { label: "بهترش کن", prompt: "این قسمت رو بهتر کن" },
  { label: "کلیشه‌ها", prompt: "کلیشه‌هاشو پیدا کن و جایگزین پیشنهاد بده" },
  { label: "تحلیل DNA", prompt: "تحلیل Hit DNA این متن رو بده" },
  { label: "نقد کن", prompt: "این ترانه رو نقد حرفه‌ای کن" },
  { label: "چند هوک", prompt: "چند نسخه هوک قوی پیشنهاد بده" },
];
