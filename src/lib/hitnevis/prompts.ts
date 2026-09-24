/**
 * HitNevis prompts — Persian-first professional songwriting.
 * Never mention provider/model names. Preserve artist voice.
 */

import type {
  ArtistVoiceProfile,
  HitNevisGenerateRequest,
  HitNevisMode,
  LyricSectionId,
} from "./types";

const MODE_LABELS: Record<HitNevisMode, string> = {
  write_full: "نوشتن ترانه کامل (ورس + پری‌کورس + کورس + بریج اختیاری)",
  write_chorus: "نوشتن فقط کورس/قلاب",
  write_verse: "نوشتن ورس",
  write_pre_chorus: "نوشتن پری‌کورس",
  write_bridge: "نوشتن بریج",
  write_outro: "نوشتن اوت‌رو",
  improve: "بهبود و بازنویسی متن موجود بدون تغییر صدای هنرمند",
  rhyme: "پیشنهاد قافیه و هم‌آوایی",
  title_ideas: "ایده عنوان ترانه",
  structure: "پیشنهاد ساختار ترانه",
  continue: "ادامه دادن متن از جایی که هست",
  rewrite: "بازنویسی خلاقانه با حفظ معنا",
  shorten: "کوتاه و فشرده کردن",
  emotional: "تقویت بار احساسی",
  conversational: "لحن محاوره‌ای و طبیعی",
  visual: "تصویرسازی و جزئیات بصری",
  bold: "جسارت بیشتر در بیان",
  critic: "نقد حرفه‌ای ترانه (نقاط قوت/ضعف/پیشنهاد)",
  idea_analyze: "تحلیل ایده و پتانسیل ترانه",
  hook_lab: "آزمایشگاه هوک — چند نسخه قلاب قوی",
  anti_cliche: "شناسایی و جایگزینی کلیشه",
  save_lyric: "چند جهت خلاقانه برای نجات ترانه",
  hit_dna: "تحلیل الگوهای ساختاری و کیفیت (بدون کپی)",
  human_tests: "تست‌های انسانی کیفیت ترانه",
  artist_voice: "هم‌راستا کردن با پروفایل صدای هنرمند",
};

const SECTION_LABELS: Record<LyricSectionId, string> = {
  verse: "ورس",
  pre_chorus: "پری‌کورس",
  chorus: "کورس",
  bridge: "بریج",
  outro: "اوت‌رو",
  hook: "قلاب/هوک",
  other: "بخش",
};

function voiceBlock(v?: ArtistVoiceProfile): string {
  if (!v) return "";
  const lines: string[] = ["پروفایل صدای هنرمند (حتماً رعایت کن):"];
  if (v.name) lines.push(`- نام/هویت: ${v.name}`);
  if (v.styleNotes) lines.push(`- سبک: ${v.styleNotes.slice(0, 400)}`);
  if (v.register) lines.push(`- رجیستر: ${v.register}`);
  if (v.rhymePreference) lines.push(`- قافیه: ${v.rhymePreference}`);
  if (v.preferredWords?.length)
    lines.push(`- واژه‌های مورد علاقه: ${v.preferredWords.slice(0, 20).join("، ")}`);
  if (v.avoidedWords?.length)
    lines.push(`- پرهیز از: ${v.avoidedWords.slice(0, 20).join("، ")}`);
  return lines.join("\n");
}

export function buildHitNevisSystemPrompt(req: HitNevisGenerateRequest): string {
  const lang =
    req.language === "en"
      ? "English"
      : req.language === "fa-en"
        ? "Persian with optional English hooks"
        : "Persian (فارسی)";

  const parts = [
    "تو «هیت‌نویس» هستی — دستیار حرفه‌ای ترانه‌سرایی آرتیست‌یار.",
    "فقط درباره ترانه، شعر، قافیه، ساختار آهنگ و ایده‌های موسیقایی پاسخ بده.",
    `زبان خروجی: ${lang}.`,
    "لحن: طبیعی، قابل‌خواندن روی ملودی، بدون کلیشهٔ مصنوعی مگر درخواست شود.",
    "صدای اصلی هنرمند را حفظ کن؛ متن اصلی را بدون اجازه جایگزین نکن.",
    "هرگز نام مدل یا ارائه‌دهندهٔ هوش مصنوعی را ذکر نکن.",
    "اگر متن نامناسب یا خارج از حوزه بود، کوتاه و محترمانه رد کن.",
    "ادعا نکن که هر ترانه‌ای حتماً هیت می‌شود.",
  ];
  const vb = voiceBlock(req.artistVoice);
  if (vb) parts.push(vb);
  return parts.join("\n");
}

export function buildHitNevisUserPrompt(req: HitNevisGenerateRequest): string {
  const parts: string[] = [];
  parts.push(`حالت: ${MODE_LABELS[req.mode] || req.mode}`);
  if (req.sectionType) parts.push(`بخش هدف: ${SECTION_LABELS[req.sectionType] || req.sectionType}`);
  if (req.topic?.trim()) parts.push(`موضوع / حس: ${req.topic.trim().slice(0, 500)}`);
  if (req.genre) parts.push(`ژانر: ${req.genre}`);
  if (req.tone) parts.push(`تون احساسی: ${req.tone}`);
  if (req.constraints?.trim()) parts.push(`محدودیت‌ها: ${req.constraints.trim().slice(0, 400)}`);
  if (req.existingLyrics?.trim()) {
    parts.push("متن فعلی (اصلی — محترم بدار):");
    parts.push(req.existingLyrics.trim().slice(0, 6000));
  }

  switch (req.mode) {
    case "write_full":
      parts.push("یک ترانه کامل با برچسب [ورس] [پری‌کورس] [کورس] [بریج] بنویس.");
      break;
    case "hook_lab":
      parts.push("۳ تا ۵ نسخهٔ کوتاه و قوی برای قلاب/کورس پیشنهاد بده. هر نسخه را شماره‌گذاری کن.");
      break;
    case "save_lyric":
      parts.push(
        `دقیقاً ${Math.min(5, Math.max(2, req.directionsCount || 3))} جهت خلاقانهٔ متفاوت برای نجات/تقویت این ترانه بده. هر جهت را با عنوان کوتاه و نمونهٔ ۲–۴ خط همراه کن.`,
      );
      break;
    case "critic":
      parts.push(
        "نقد حرفه‌ای بنویس: ۱) نقاط قوت ۲) نقاط ضعف ۳) پیشنهادهای مشخص ساختاری/زبانی/احساسی. ادعا نکن که هیت قطعی است.",
      );
      break;
    case "idea_analyze":
      parts.push(
        "ایده را تحلیل کن: موضوع، زاویه، پتانسیل هوک، ریسک کلیشه، پیشنهاد زاویهٔ تازه.",
      );
      break;
    case "anti_cliche":
      parts.push(
        "عبارات کلیشه‌ای را مشخص کن و برای هر کدام جایگزین طبیعی و تازه پیشنهاد بده. متن اصلی را کامل جایگزین نکن مگر درخواست شده.",
      );
      break;
    case "hit_dna":
      parts.push(
        "فقط الگوهای تحلیلی بده (ساختار، تکرار، قوس احساسی، تراکم قافیه، وضوح روایت). هیچ متن ترانهٔ معروف را کپی نکن. در پایان بگو این تحلیل تضمین هیت نیست.",
      );
      break;
    case "human_tests":
      parts.push(
        "برای هر تست یک امتیاز ۰–۱۰ و ۲ نکته بده: First Listen، Sing، Memory، Emotion، Conversation، Cliché، Artist. جمع‌بندی کوتاه. تضمین هیت نده.",
      );
      break;
    case "continue":
      parts.push("از جایی که متن تمام شده ادامه بده؛ سبک و صدای فعلی را حفظ کن.");
      break;
    case "rewrite":
      parts.push("بازنویسی کن با حفظ معنا و حس؛ نسخهٔ تازه ارائه بده.");
      break;
    case "shorten":
      parts.push("فشرده و کوتاه‌تر کن؛ خطوط اضافی را حذف کن.");
      break;
    case "emotional":
      parts.push("بار احساسی را عمیق‌تر کن بدون ملودرام مصنوعی.");
      break;
    case "conversational":
      parts.push("لحن را محاوره‌ای و قابل‌گفتن روی صحنه کن.");
      break;
    case "visual":
      parts.push("تصویر و جزئیات حسی اضافه کن.");
      break;
    case "bold":
      parts.push("بیان را جسورتر و مستقیم‌تر کن.");
      break;
    case "artist_voice":
      parts.push("متن را با پروفایل صدای هنرمند هم‌راستا بازنویسی کن.");
      break;
    default:
      break;
  }
  return parts.join("\n\n");
}

export const HITNEVIS_MODES: HitNevisMode[] = [
  "write_full",
  "write_chorus",
  "write_verse",
  "write_pre_chorus",
  "write_bridge",
  "write_outro",
  "improve",
  "rhyme",
  "title_ideas",
  "structure",
  "continue",
  "rewrite",
  "shorten",
  "emotional",
  "conversational",
  "visual",
  "bold",
  "critic",
  "idea_analyze",
  "hook_lab",
  "anti_cliche",
  "save_lyric",
  "hit_dna",
  "human_tests",
  "artist_voice",
];

export function isValidMode(value: unknown): value is HitNevisMode {
  return typeof value === "string" && (HITNEVIS_MODES as string[]).includes(value);
}

export { MODE_LABELS, SECTION_LABELS };
