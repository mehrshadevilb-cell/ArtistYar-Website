/** HitNevis — songwriting co-writer system prompts & helpers */

import { secondaryHints, type DetectedIntent } from "@/lib/hitnevis/intent";

export type HitMode =
  | "chat"
  | "write_full"
  | "write_verse"
  | "write_chorus"
  | "write_pre_chorus"
  | "write_bridge"
  | "write_outro"
  | "continue"
  | "rewrite"
  | "improve"
  | "shorten"
  | "emotional"
  | "conversational"
  | "visual"
  | "bold"
  | "rhyme"
  | "title_ideas"
  | "structure"
  | "hook_lab"
  | "save_lyric"
  | "anti_cliche"
  | "critic"
  | "hit_dna"
  | "human_tests"
  | "idea_analyze"
  | "artist_voice";

export const VALID_MODES = new Set<string>([
  "chat",
  "write_full",
  "write_verse",
  "write_chorus",
  "write_pre_chorus",
  "write_bridge",
  "write_outro",
  "continue",
  "rewrite",
  "improve",
  "shorten",
  "emotional",
  "conversational",
  "visual",
  "bold",
  "rhyme",
  "title_ideas",
  "structure",
  "hook_lab",
  "save_lyric",
  "anti_cliche",
  "critic",
  "hit_dna",
  "human_tests",
  "idea_analyze",
  "artist_voice",
]);

const MODE_HINT: Record<string, string> = {
  chat: "گفتگوی آزاد. مثل همکار ترانه‌نویس جواب بده؛ فرض معقول بزن و جلو برو.",
  write_full: "یک ترانه کامل بنویس (ورس، پری‌کورس در صورت نیاز، کورس، بریج اختیاری).",
  write_verse: "فقط ورس بنویس.",
  write_chorus: "فقط کورس / هوک قوی بنویس.",
  write_pre_chorus: "فقط پری‌کورس بنویس.",
  write_bridge: "فقط بریج بنویس.",
  write_outro: "فقط اوت‌رو بنویس.",
  continue: "از جایی که متن/گفتگو هست ادامه بده؛ تکرار نکن.",
  rewrite: "بازنویسی با حفظ حس اصلی، ولی تازه‌تر و قوی‌تر.",
  improve: "متن را بهتر کن؛ مشکل را نام ببر و نسخهٔ بهتر بده.",
  shorten: "فشرده و کوتاه‌تر بدون از دست دادن ضربه اصلی.",
  emotional: "بار احساسی را عمیق‌تر و ملموس‌تر کن.",
  conversational: "لحن را طبیعی‌تر و محاوره‌ای‌تر کن.",
  visual: "جزئیات تصویری و صحنه بساز.",
  bold: "جسورتر و مستقیم‌تر بنویس.",
  rhyme: "قافیه‌ها را تقویت کن؛ طبیعی بماند.",
  title_ideas: "چند ایده عنوان پیشنهاد بده.",
  structure: "ساختار پیشنهادی و دلیل کوتاه.",
  hook_lab: "۳ هوک واقعاً متفاوت (نه فقط عوض کردن کلمات).",
  save_lyric: "۳ مسیر نجات/پیشرفت واقعاً متفاوت برای این ترانه.",
  anti_cliche: "کلیشه‌ها را پیدا کن و جایگزین تازه بده؛ اگر کلیشه واضحی نیست صادقانه بگو.",
  critic: "نقد صادقانه: قوت‌ها، ریسک‌ها، پیشنهاد مشخص. عدد جعلی نده.",
  hit_dna:
    "تحلیل مفید ترانه‌نویسی: هوک، تصویرسازی، ریتم زبانی، تکرار، ریسک کلیشه. امتیاز علمی جعلی نده؛ تشخیص و پیشنهاد بده.",
  human_tests: "از دید شنونده اول: چه چیزی گیر می‌کند، چه چیزی خسته می‌کند.",
  idea_analyze: "پتانسیل ایده و زاویه‌های قوی.",
  artist_voice: "با لحن و صدای خود هنرمند بنویس.",
};

export function buildSystemPrompt(opts: {
  mode: string;
  intent?: DetectedIntent;
  brainBlock?: string;
  wantDirections?: boolean;
  artistVoice?: {
    name?: string;
    styleNotes?: string;
    preferredWords?: string[];
    avoidedWords?: string[];
  };
}): string {
  const { mode, intent, brainBlock, wantDirections, artistVoice } = opts;
  const voiceBits: string[] = [];
  if (artistVoice?.name) voiceBits.push(`نام/هویت: ${artistVoice.name}`);
  if (artistVoice?.styleNotes) voiceBits.push(`سبک: ${artistVoice.styleNotes}`);
  if (artistVoice?.preferredWords?.length)
    voiceBits.push(`کلمات مورد علاقه: ${artistVoice.preferredWords.join("، ")}`);
  if (artistVoice?.avoidedWords?.length)
    voiceBits.push(`پرهیز از: ${artistVoice.avoidedWords.join("، ")}`);

  const sec = intent?.secondary?.length ? secondaryHints(intent.secondary) : "";
  const directions =
    wantDirections || intent?.wantDirections
      ? [
          "وقتی چند مسیر مفید است، دقیقاً ۳ مسیر واقعاً متفاوت بده:",
          "مسیر ۱ — ساده و ماندگار (عبارات کوتاه، هوک واضح)",
          "مسیر ۲ — شخصی و تصویری (جزئیات ملموس)",
          "مسیر ۳ — جسور و غیرمنتظره",
          "برای هر مسیر یک پیش‌نویس کوتاه قابل‌استفاده بنویس، نه فقط توضیح.",
        ].join("\n")
      : "";

  return [
    "تو «هیت‌نویس» هستی — همکار ترانه‌نویسی گرم، راحت و متخصص برای هنرمند ایرانی.",
    "مثل دو نوازنده که با هم آهنگ می‌سازند حرف بزن: محاوره‌ای، انسانی، بدون لحن رباتیک.",
    "فارسی بنویس مگر خلافش خواسته شود.",
    "متن اصلی کاربر را بدون اجازه‌ی صریح جایگزین نکن؛ نسخهٔ جدید را جدا پیشنهاد بده.",
    "اگر زمینه ناقص است فرض معقول بزن و ادامه بده؛ فقط وقتی واقعاً لازم است سؤال کوتاه بپرس.",
    "پاسخ مفید و جمع‌وجور: مشکل را ببین، پیشنهاد مشخص بده، متن قابل‌استفاده تولید کن.",
    "از کلیشه‌های سطحی بدون جزئیات تازه پرهیز کن.",
    "امتیاز یا درصد «hit» جعلی نده. به جای آن قوت، ریسک و پیشنهاد بگو.",
    MODE_HINT[mode] || MODE_HINT.chat,
    sec ? `جهت‌گیری درخواستی کاربر: ${sec}` : "",
    directions,
    voiceBits.length ? `پروفایل صدا:\n${voiceBits.join("\n")}` : "",
    brainBlock ? `حافظهٔ خلاق پروژه (Song Brain):\n${brainBlock}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export type HistoryItem = { role: "user" | "assistant"; content: string };

export function boundHistory(history: HistoryItem[] | undefined, maxTurns = 12): HistoryItem[] {
  if (!Array.isArray(history) || !history.length) return [];
  const cleaned = history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));
  return cleaned.slice(-maxTurns);
}

export function buildUserContent(input: {
  mode: string;
  topic?: string;
  existingLyrics?: string;
  constraints?: string;
  sectionType?: string;
  intentNote?: string;
}): string {
  const parts: string[] = [];
  if (input.intentNote) parts.push(`تشخیص intent: ${input.intentNote}`);
  if (input.topic?.trim()) parts.push(`درخواست / موضوع:\n${input.topic.trim()}`);
  if (input.existingLyrics?.trim()) parts.push(`متن فعلی ترانه:\n${input.existingLyrics.trim()}`);
  if (input.constraints?.trim()) parts.push(`توضیح / محدودیت:\n${input.constraints.trim()}`);
  if (input.sectionType?.trim()) parts.push(`بخش مورد نظر: ${input.sectionType.trim()}`);
  if (!parts.length) parts.push("ادامه بده یا یک پیشنهاد مفید بده.");
  return parts.join("\n\n");
}

/** Lightweight lyric diagnostics — approximate, never presented as science. */
export function roughLyricHints(text: string): string[] {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const hints: string[] = [];
  const lengths = lines.map((l) => l.replace(/\s+/g, " ").length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  if (avg > 55) hints.push("بعضی خطوط طولانی‌اند؛ برای خوانایی ممکن است نیاز به شکستن داشته باشند.");
  if (avg < 12 && lines.length > 4) hints.push("خطوط خیلی کوتاه‌اند؛ ممکن است حس بریده‌بریده بدهد.");
  const joined = text.replace(/\s+/g, " ");
  const cliches = ["بارون", "خیابون خالی", "چشمات", "قلب من", "تنهایی"];
  const hit = cliches.filter((c) => joined.includes(c));
  if (hit.length >= 2) hints.push(`عبارات پرتکرار/در معرض کلیشه: ${hit.join("، ")}`);
  return hints.slice(0, 4);
}
