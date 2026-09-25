/** Natural-language intent detection for Persian songwriting requests. */

export type PrimaryIntent =
  | "chat"
  | "write"
  | "continue"
  | "rewrite"
  | "improve"
  | "critique"
  | "analyze"
  | "rhyme"
  | "hook"
  | "structure"
  | "shorten"
  | "emotional"
  | "conversational"
  | "anti_cliche"
  | "brainstorm"
  | "directions"
  | "title";

export type TargetSection =
  | "full"
  | "verse"
  | "pre_chorus"
  | "chorus"
  | "hook"
  | "bridge"
  | "outro"
  | "selected"
  | "project";

export type SecondaryTone =
  | "more_emotional"
  | "more_commercial"
  | "more_personal"
  | "more_conversational"
  | "darker"
  | "simpler"
  | "more_memorable"
  | "more_poetic"
  | "more_aggressive"
  | "less_cliche"
  | "bolder"
  | "proud";

export type DetectedIntent = {
  primary: PrimaryIntent;
  target: TargetSection;
  secondary: SecondaryTone[];
  wantDirections: boolean;
  confidence: number;
  /** API mode compatible with existing VALID_MODES */
  mode: string;
};

type Rule = {
  primary: PrimaryIntent;
  mode: string;
  weight: number;
  patterns: RegExp[];
};

const PRIMARY_RULES: Rule[] = [
  { primary: "directions", mode: "save_lyric", weight: 96, patterns: [/سه\s*مسیر/, /چند\s*(نسخه|مسیر|جهت)/, /۳\s*مسیر/, /alternatives?/i] },
  { primary: "analyze", mode: "hit_dna", weight: 94, patterns: [/hit\s*dna/i, /هیت\s*دی\s*ان\s*ای/, /تحلیل\s*(الگو|ساختاری|کیفیت)/] },
  { primary: "anti_cliche", mode: "anti_cliche", weight: 93, patterns: [/کلیشه/, /ضد\s*کلیشه/, /عبارت\s*تکراری/] },
  { primary: "critique", mode: "critic", weight: 92, patterns: [/نقد/, /منتقد/, /نقاط\s*(قوت|ضعف)/, /نقدش\s*کن/] },
  { primary: "hook", mode: "hook_lab", weight: 91, patterns: [/هوک/, /قلاب/, /hook\s*lab/i] },
  { primary: "continue", mode: "continue", weight: 90, patterns: [/ادامه‌?ش\s*بده/, /ادامه\s*بده/, /از\s*اینجا\s*ادامه/, /برام\s*ادامه/] },
  { primary: "rewrite", mode: "rewrite", weight: 88, patterns: [/بازنویس/, /از\s*نو\s*بنویس/, /rewrite/i] },
  { primary: "improve", mode: "improve", weight: 87, patterns: [/بهتر\s*کن/, /بهبود/, /قوی‌?تر\s*کن/, /اصلاح\s*کن/, /اینو\s*بهتر/] },
  { primary: "shorten", mode: "shorten", weight: 85, patterns: [/کوتاه/, /فشرده/, /خلاصه\s*کن/] },
  { primary: "emotional", mode: "emotional", weight: 84, patterns: [/احساسی‌?تر/, /عمیق‌?تر\s*کن/, /بار\s*احساسی/] },
  { primary: "conversational", mode: "conversational", weight: 83, patterns: [/محاوره/, /عامیانه/, /طبیعی‌?تر\s*صحبت/] },
  { primary: "rhyme", mode: "rhyme", weight: 82, patterns: [/قافیه/, /هم‌?قافیه/, /rhyme/i] },
  { primary: "title", mode: "title_ideas", weight: 80, patterns: [/عنوان/, /اسم\s*ترانه/, /تایتل/, /title/i] },
  { primary: "structure", mode: "structure", weight: 79, patterns: [/ساختار/, /فرم\s*ترانه/, /ترتیب\s*بخش/] },
  { primary: "write", mode: "write_full", weight: 70, patterns: [/ترانه\s*کامل/, /یه\s*آهنگ/, /بنویس/, /بساز/] },
  { primary: "brainstorm", mode: "idea_analyze", weight: 68, patterns: [/ایده/, /برainstorm/i, /چی\s*بنویسم/] },
];

const TARGET_RULES: { target: TargetSection; patterns: RegExp[] }[] = [
  { target: "chorus", patterns: [/کورس/, /chorus/i] },
  { target: "hook", patterns: [/هوک/, /قلاب/, /hook/i] },
  { target: "verse", patterns: [/ورس/, /بند/, /verse/i] },
  { target: "pre_chorus", patterns: [/پری[-\s]?کورس/, /pre[-\s]?chorus/i] },
  { target: "bridge", patterns: [/بریج/, /bridge/i] },
  { target: "outro", patterns: [/اوت[-\s]?رو/, /outro/i] },
  { target: "full", patterns: [/ترانه\s*کامل/, /کل\s*آهنگ/, /full\s*song/i] },
];

const SECONDARY_RULES: { tone: SecondaryTone; patterns: RegExp[] }[] = [
  { tone: "more_emotional", patterns: [/احساسی/, /غمگین/, /دلتنگ/] },
  { tone: "proud", patterns: [/غرور/, /مفتخر/, /قدرتمند/] },
  { tone: "more_commercial", patterns: [/تجاری/, /رادیویی/, /پاپ\s*تر/] },
  { tone: "more_personal", patterns: [/شخصی‌?تر/, /از\s*زندگی\s*خودم/] },
  { tone: "more_conversational", patterns: [/محاوره/, /طبیعی‌?تر/, /عامیانه/] },
  { tone: "darker", patterns: [/تیره‌?تر/, /سیاه‌?تر/, /تاریک/] },
  { tone: "simpler", patterns: [/ساده‌?تر/, /کمتر\s*پیچیده/] },
  { tone: "more_memorable", patterns: [/ماندگار/, /یادماندنی/, /گیراتر/] },
  { tone: "more_poetic", patterns: [/شاعرانه‌?تر/, /ادبی‌?تر/] },
  { tone: "more_aggressive", patterns: [/تهاجمی/, /تندتر/, /خشن‌?تر/] },
  { tone: "less_cliche", patterns: [/کمتر\s*کلیشه/, /تازه‌?تر/, /غیرمنتظره/] },
  { tone: "bolder", patterns: [/جسور/, /بی‌پرده/, /مستقیم‌?تر/] },
];

function mapTargetToMode(primary: PrimaryIntent, target: TargetSection, baseMode: string): string {
  if (primary === "write" || primary === "continue") {
    if (target === "verse") return "write_verse";
    if (target === "chorus" || target === "hook") return "write_chorus";
    if (target === "pre_chorus") return "write_pre_chorus";
    if (target === "bridge") return "write_bridge";
    if (target === "outro") return "write_outro";
    if (target === "full") return "write_full";
  }
  return baseMode;
}

export function detectIntent(text: string): DetectedIntent {
  const t = (text || "").trim();
  if (!t) {
    return { primary: "chat", target: "project", secondary: [], wantDirections: false, confidence: 0.2, mode: "chat" };
  }

  let best: Rule | null = null;
  for (const rule of PRIMARY_RULES) {
    if (rule.patterns.some((re) => re.test(t))) {
      if (!best || rule.weight > best.weight) best = rule;
    }
  }

  let target: TargetSection = "project";
  for (const tr of TARGET_RULES) {
    if (tr.patterns.some((re) => re.test(t))) {
      target = tr.target;
      break;
    }
  }

  const secondary: SecondaryTone[] = [];
  for (const sr of SECONDARY_RULES) {
    if (sr.patterns.some((re) => re.test(t))) secondary.push(sr.tone);
  }

  const wantDirections =
    /سه\s*مسیر|چند\s*(نسخه|مسیر)|۳\s*مسیر|alternatives?/i.test(t) ||
    (best?.primary === "directions");

  if (!best) {
    // Free chat / vague request — prefer useful co-writing over forcing mode
    const mode =
      target === "full"
        ? "write_full"
        : target === "chorus" || target === "hook"
          ? "write_chorus"
          : target === "verse"
            ? "write_verse"
            : "chat";
    return {
      primary: mode === "chat" ? "chat" : "write",
      target,
      secondary,
      wantDirections,
      confidence: 0.45,
      mode,
    };
  }

  const mode = mapTargetToMode(best.primary, target, best.mode);
  return {
    primary: best.primary,
    target,
    secondary,
    wantDirections,
    confidence: Math.min(0.98, best.weight / 100),
    mode,
  };
}

export function secondaryHints(secondary: SecondaryTone[]): string {
  if (!secondary.length) return "";
  const map: Record<SecondaryTone, string> = {
    more_emotional: "احساسی‌تر و ملموس‌تر",
    more_commercial: "تجاری‌تر و گیراتر برای شنیدن مکرر",
    more_personal: "شخصی‌تر با جزئیات زندگی واقعی",
    more_conversational: "محاوره‌ای و طبیعی‌تر",
    darker: "تیره‌تر و سنگین‌تر",
    simpler: "ساده‌تر و شفاف‌تر",
    more_memorable: "ماندگارتر و تکرارپذیرتر",
    more_poetic: "شاعرانه‌تر",
    more_aggressive: "تهاجمی‌تر",
    less_cliche: "کمتر کلیشه‌ای و تازه‌تر",
    bolder: "جسورتر و مستقیم‌تر",
    proud: "با حس غرور و قدرت",
  };
  return secondary.map((s) => map[s]).filter(Boolean).join("؛ ");
}
