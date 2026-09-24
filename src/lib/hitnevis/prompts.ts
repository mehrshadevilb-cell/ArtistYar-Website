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
  chat: "گفتگوی آزاد ترانه‌سرایی با حفظ زمینهٔ مکالمه",
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

/** Abstract Hit Strategy — patterns only, never quote real songs */
const HIT_STRATEGY_KB = [
  "هوک قوی معمولاً کوتاه، تکرارپذیر و از نظر احساسی واضح است؛ اغلب در کورس یا همان ابتدای ذهن شنونده می‌نشیند.",
  "قوس احساسی: ورس زمینه می‌چیند، پری‌کورس تنش می‌سازد، کورس آزادسازی می‌کند، بریج زاویهٔ تازه می‌آورد.",
  "تراکم تصویر بهتر از کلیشهٔ انتزاعی است؛ یک جزئیات ملموس از ده صفت کلی قوی‌تر است.",
  "قابلیت خواندن روی ملودی: خطوط هم‌طول تقریبی، استرس هجایی طبیعی، فاصلهٔ نفس منطقی.",
  "به‌خاطرسپاری: تکرار کنترل‌شدهٔ یک عبارت کلیدی + واریاسیون جزئی در تکرار دوم.",
  "اصالت: زاویهٔ شخصی یا جزئیات غیرمنتظره؛ پرهیز از پایان‌های قابل‌پیش‌بینی.",
  "هرگز ترانهٔ معروف را بازنویسی یا نقل نکن؛ فقط الگوهای انتزاعی را به‌کار ببر.",
].join("\n- ");

export function buildHitNevisSystemPrompt(req: HitNevisGenerateRequest): string {
  const lang =
    req.language === "en"
      ? "English"
      : req.language === "fa-en"
        ? "Persian with optional English hooks"
        : "Persian (فارسی)";

  const parts = [
    "تو «هیت‌نویس» هستی — همکار حرفه‌ای ترانه‌سرایی آرتیست‌یار، نه ابزار تولید انبوه.",
    "مثل یک مشاور ترانه‌نویس باتجربه رفتار کن: کوتاه، دقیق، صادق. اگر ایده ضعیف است مودبانه بگو چرا و جایگزین پیشنهاد بده.",
    "وقتی اطلاعات کافی نیست، حداکثر یک یا دو سؤال کوتاه بپرس؛ بعد از آن پیش‌نویس مفید بده.",
    "در حالت گفتگو زمینهٔ قبلی را حفظ کن و مثل یک همکار واقعی ادامه بده؛ جواب‌های کلیشه‌ای یا تکرار بی‌مورد نده.",
    "فقط درباره ترانه، شعر، قافیه، ساختار و ایده‌های موسیقایی صحبت کن.",
    `زبان خروجی: ${lang}.`,
    "لحن: حرفه‌ای، گرم، بدون اصطلاحات فنی انگلیسی مگر لازم.",
    "صدای هنرمند را حفظ کن؛ متن اصلی را بدون درخواست صریح جایگزین نکن.",
    "هرگز نام مدل یا ارائه‌دهندهٔ هوش مصنوعی را ذکر نکن.",
    "ادعا نکن که هر متنی هیت می‌شود. به جای آن روی هوک، احساس، اصالت، به‌خاطرسپاری و خوانایی تمرکز کن.",
    "دانش الگوی ترانه‌سرایی (انتزاعی — بدون کپی):\n- " + HIT_STRATEGY_KB,
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
  if (req.conversationHistory?.length) {
    const turns = req.conversationHistory.slice(-12);
    parts.push("زمینهٔ گفتگوی اخیر (برای پیوستگی؛ تکرار نکن مگر لازم):");
    for (const turn of turns) {
      const who = turn.role === "user" ? "کاربر" : "هیت‌نویس";
      parts.push(`${who}: ${turn.content.slice(0, 800)}`);
    }
  }
  if (req.constraints?.trim()) {
    if (req.mode === "chat") {
      parts.push("پیام فعلی کاربر:");
      parts.push(req.constraints.trim().slice(0, 1200));
    } else {
      parts.push(`محدودیت‌ها / درخواست: ${req.constraints.trim().slice(0, 400)}`);
    }
  }
  if (req.existingLyrics?.trim()) {
    parts.push("متن فعلی پروژه (اصلی — محترم بدار):");
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
    case "chat":
      parts.push(
        "مثل یک همکار ترانه‌نویس پاسخ بده. اگر کاربر ایده یا متن داد، کمک کن پیش ببرد: پیشنهاد، ادامه، بازنویسی یا سؤال کوتاه. متن ترانه‌ای که می‌نویسی را واضح و قابل‌استفاده بده. زمینهٔ گفتگوی قبلی را در نظر بگیر.",
      );
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
  "chat",
];

export function isValidMode(value: unknown): value is HitNevisMode {
  return typeof value === "string" && (HITNEVIS_MODES as string[]).includes(value);
}

export { MODE_LABELS, SECTION_LABELS };
