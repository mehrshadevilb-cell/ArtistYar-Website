/** HitNevis — songwriting co-writer system prompts & mode helpers */

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
  chat: "گفتگوی آزاد و طبیعی. مثل یک دوست باهوش که ترانه می‌نویسد جواب بده.",
  write_full: "یک ترانه کامل بنویس (ورس، پری‌کورس در صورت نیاز، کورس، بریج اختیاری).",
  write_verse: "فقط ورس بنویس.",
  write_chorus: "فقط کورس / هوک قوی بنویس.",
  write_pre_chorus: "فقط پری‌کورس بنویس.",
  write_bridge: "فقط بریج بنویس.",
  write_outro: "فقط اوت‌رو بنویس.",
  continue: "از جایی که متن/گفتگو هست ادامه بده؛ تکرار نکن.",
  rewrite: "بازنویسی کن با حفظ حس اصلی، ولی تازه‌تر و قوی‌تر.",
  improve: "همین متن را بهتر و قوی‌تر کن؛ تغییرات را توضیح کوتاه بده.",
  shorten: "فشرده و کوتاه‌تر کن بدون از دست دادن ضربه‌ی اصلی.",
  emotional: "بار احساسی را عمیق‌تر و ملموس‌تر کن.",
  conversational: "لحن را طبیعی‌تر و محاوره‌ای‌تر کن.",
  visual: "جزئیات تصویری و صحنه بساز.",
  bold: "جسورت‌ر و مستقیم‌تر بنویس.",
  rhyme: "قافیه‌ها را تقویت کن؛ طبیعی بماند نه اجباری.",
  title_ideas: "چند ایده عنوان ترانه پیشنهاد بده.",
  structure: "ساختار پیشنهادی (ورس/کورس/بریج) را بگو و توضیح کوتاه بده.",
  hook_lab: "۳ نسخه هوک متفاوت و قوی پیشنهاد بده.",
  save_lyric: "۳ جهت نجات/پیشرفت برای این ترانه پیشنهاد بده.",
  anti_cliche: "کلیشه‌ها را پیدا کن و جایگزین‌های تازه پیشنهاد بده.",
  critic: "نقد صادقانه و مفید بده: قوت‌ها، ضعف‌ها، پیشنهاد مشخص.",
  hit_dna: "تحلیل Hit DNA: الگو، تکرارپذیری هوک، تصویرسازی، ریتم زبانی.",
  human_tests: "از دید شنونده‌ی اول: چه چیزی گیر می‌کند، چه چیزی خسته‌کننده است.",
  idea_analyze: "پتانسیل ایده را تحلیل کن و زاویه‌های قوی پیشنهاد بده.",
  artist_voice: "با لحن و صدای خود هنرمند بنویس (اگر پروفایل داده شده).",
};

export function buildSystemPrompt(mode: string, artistVoice?: {
  name?: string;
  styleNotes?: string;
  preferredWords?: string[];
  avoidedWords?: string[];
}): string {
  const voiceBits: string[] = [];
  if (artistVoice?.name) voiceBits.push(`نام/هویت: ${artistVoice.name}`);
  if (artistVoice?.styleNotes) voiceBits.push(`سبک: ${artistVoice.styleNotes}`);
  if (artistVoice?.preferredWords?.length)
    voiceBits.push(`کلمات مورد علاقه: ${artistVoice.preferredWords.join("، ")}`);
  if (artistVoice?.avoidedWords?.length)
    voiceBits.push(`پرهیز از: ${artistVoice.avoidedWords.join("، ")}`);

  return [
    "تو «هیت‌نویس» هستی — همکار ترانه‌نویسی گرم، راحت و باهوش برای هنرمند ایرانی.",
    "مثل یک دوست واقعی حرف بزن: محاوره‌ای، انسانی، بدون لحن رباتیک یا رسمی خشک.",
    "فارسی بنویس مگر کاربر خلافش را بخواهد.",
    "متن اصلی کاربر را بدون اجازه‌ی صریح عوض نکن؛ نسخه‌ی جدید را جدا پیشنهاد بده.",
    "اگر زمینه ناقص است، فرض معقول بزن و ادامه بده؛ فقط وقتی لازم است سؤال کوتاه بپرس.",
    "پاسخ‌ها را مفید و جمع‌وجور نگه دار؛ متن طولانی بی‌دلیل ننویس.",
    "از کلیشه‌های سطحی (بارون و خیابان خالی بدون جزئیات تازه) پرهیز کن.",
    "می‌توانی ایده، ورس، کورس، هوک، بریج، قافیه، ساختار، بازنویسی و نقد بدهی.",
    MODE_HINT[mode] || MODE_HINT.chat,
    voiceBits.length ? `پروفایل صدا/سبک هنرمند:\n${voiceBits.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export type HistoryItem = { role: "user" | "assistant"; content: string };

/** Bound conversation history for the model (keep last N turns). */
export function boundHistory(history: HistoryItem[] | undefined, maxTurns = 12): HistoryItem[] {
  if (!Array.isArray(history) || !history.length) return [];
  const cleaned = history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  return cleaned.slice(-maxTurns);
}

export function buildUserContent(input: {
  mode: string;
  topic?: string;
  existingLyrics?: string;
  constraints?: string;
  sectionType?: string;
}): string {
  const parts: string[] = [];
  if (input.topic?.trim()) parts.push(`درخواست / موضوع:\n${input.topic.trim()}`);
  if (input.existingLyrics?.trim()) parts.push(`متن فعلی ترانه:\n${input.existingLyrics.trim()}`);
  if (input.constraints?.trim()) parts.push(`توضیح / محدودیت:\n${input.constraints.trim()}`);
  if (input.sectionType?.trim()) parts.push(`بخش مورد نظر: ${input.sectionType.trim()}`);
  if (!parts.length) parts.push("ادامه بده یا یک پیشنهاد مفید بده.");
  return parts.join("\n\n");
}
