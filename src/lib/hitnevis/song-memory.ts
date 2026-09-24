/**
 * Compact song-level creative memory for HitNevis.
 * Keeps long conversations coherent without dumping entire history forever.
 * Never overwrites artist original material.
 */

export type CreativeDecision = {
  id: string;
  at: number;
  kind: "approved" | "rejected" | "kept" | "note";
  text: string;
};

export type SongMemory = {
  topic?: string;
  coreConcept?: string;
  story?: string;
  persona?: string;
  emotionalDirection?: string;
  genre?: string;
  tone?: string;
  language?: string;
  artistVoiceNotes?: string;
  preferredVocabulary?: string[];
  avoidedVocabulary?: string[];
  hookConcept?: string;
  importantPhrases?: string[];
  structureNotes?: string;
  rejectedIdeas?: string[];
  approvedIdeas?: string[];
  constraints?: string[];
  decisions?: CreativeDecision[];
  updatedAt?: string;
};

const MAX_LIST = 12;
const MAX_STR = 400;
const MAX_DECISIONS = 20;

export function emptySongMemory(): SongMemory {
  return {
    preferredVocabulary: [],
    avoidedVocabulary: [],
    importantPhrases: [],
    rejectedIdeas: [],
    approvedIdeas: [],
    constraints: [],
    decisions: [],
  };
}

function trimStr(s: string | undefined, max = MAX_STR): string | undefined {
  if (!s || typeof s !== "string") return undefined;
  const t = s.trim().slice(0, max);
  return t || undefined;
}

function trimList(arr: unknown, max = MAX_LIST): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim().slice(0, 160))
    .slice(0, max);
}

export function normalizeSongMemory(raw: unknown): SongMemory {
  if (!raw || typeof raw !== "object") return emptySongMemory();
  const m = raw as Record<string, unknown>;
  return {
    topic: trimStr(m.topic as string),
    coreConcept: trimStr(m.coreConcept as string),
    story: trimStr(m.story as string, 600),
    persona: trimStr(m.persona as string, 200),
    emotionalDirection: trimStr(m.emotionalDirection as string, 200),
    genre: trimStr(m.genre as string, 40),
    tone: trimStr(m.tone as string, 40),
    language: trimStr(m.language as string, 20),
    artistVoiceNotes: trimStr(m.artistVoiceNotes as string, 500),
    preferredVocabulary: trimList(m.preferredVocabulary),
    avoidedVocabulary: trimList(m.avoidedVocabulary),
    hookConcept: trimStr(m.hookConcept as string, 300),
    importantPhrases: trimList(m.importantPhrases),
    structureNotes: trimStr(m.structureNotes as string, 300),
    rejectedIdeas: trimList(m.rejectedIdeas),
    approvedIdeas: trimList(m.approvedIdeas),
    constraints: trimList(m.constraints),
    decisions: Array.isArray(m.decisions)
      ? (m.decisions as CreativeDecision[])
          .filter((d) => d && typeof d.text === "string")
          .map((d) => ({
            id: String(d.id || `d-${Date.now()}`),
            at: typeof d.at === "number" ? d.at : Date.now(),
            kind: (["approved", "rejected", "kept", "note"] as const).includes(d.kind as never)
              ? (d.kind as CreativeDecision["kind"])
              : "note",
            text: String(d.text).slice(0, 200),
          }))
          .slice(-MAX_DECISIONS)
      : [],
    updatedAt: typeof m.updatedAt === "string" ? m.updatedAt : undefined,
  };
}

export function enrichMemoryFromUserText(memory: SongMemory, userText: string): SongMemory {
  const t = userText.trim();
  if (!t || t.length < 4) return memory;
  const next = { ...memory };
  const lower = t.replace(/ي/g, "ی").replace(/ك/g, "ک");

  if (/نگه\s*دار|نگه‌?ش\s*دار|همین\s*خوبه|تأیید|تایید|این\s*نسخه\s*رو\s*می‌خوام/.test(lower)) {
    const snippet = t.slice(0, 120);
    next.approvedIdeas = [...(next.approvedIdeas || []).filter((x) => x !== snippet), snippet].slice(-MAX_LIST);
    next.decisions = [
      ...(next.decisions || []),
      { id: `d-${Date.now()}`, at: Date.now(), kind: "approved" as const, text: snippet },
    ].slice(-MAX_DECISIONS);
  }
  if (/حذف\s*کن|نه\s*این|دوست\s*ندارم|رد\s*کن|کلیشه‌?‌?ایه|قابل\s*پیش‌?بینیه/.test(lower)) {
    const snippet = t.slice(0, 120);
    next.rejectedIdeas = [...(next.rejectedIdeas || []).filter((x) => x !== snippet), snippet].slice(-MAX_LIST);
    next.decisions = [
      ...(next.decisions || []),
      { id: `d-${Date.now()}`, at: Date.now(), kind: "rejected" as const, text: snippet },
    ].slice(-MAX_DECISIONS);
  }

  const emo =
    lower.match(
      /حس\s+([^\n،.]{2,40})|می‌خوام\s+([^\n،.]{2,40})\s+باشه|تون\s+([^\n،.]{2,30})|غمگین|غرور|خشم|امید|عاشقانه|جسور|تاریک|شوخ/,
    ) || null;
  if (emo) {
    const captured = (emo[1] || emo[2] || emo[3] || emo[0] || "").trim().slice(0, 80);
    if (captured) next.emotionalDirection = captured;
  }

  if (/هوک\s*(رو|را)?\s*نگه|قلاب\s*(رو|را)?\s*نگه/.test(lower)) {
    next.constraints = [...(next.constraints || []).filter((c) => !/هوک|قلاب/.test(c)), "هوک فعلی را حفظ کن"].slice(
      -MAX_LIST,
    );
  }

  next.updatedAt = new Date().toISOString();
  return next;
}

export function formatSongMemoryForPrompt(memory: SongMemory | undefined): string {
  if (!memory) return "";
  const lines: string[] = [];
  if (memory.topic) lines.push(`موضوع: ${memory.topic}`);
  if (memory.coreConcept) lines.push(`مفهوم مرکزی: ${memory.coreConcept}`);
  if (memory.story) lines.push(`داستان: ${memory.story}`);
  if (memory.persona) lines.push(`راوی/پرسونا: ${memory.persona}`);
  if (memory.emotionalDirection) lines.push(`جهت احساسی: ${memory.emotionalDirection}`);
  if (memory.genre) lines.push(`ژانر: ${memory.genre}`);
  if (memory.tone) lines.push(`تون: ${memory.tone}`);
  if (memory.hookConcept) lines.push(`مفهوم هوک: ${memory.hookConcept}`);
  if (memory.importantPhrases?.length) lines.push(`عبارات مهم: ${memory.importantPhrases.join("؛ ")}`);
  if (memory.approvedIdeas?.length) lines.push(`تأییدشده توسط کاربر: ${memory.approvedIdeas.slice(-5).join("؛ ")}`);
  if (memory.rejectedIdeas?.length) lines.push(`ردشده توسط کاربر: ${memory.rejectedIdeas.slice(-5).join("؛ ")}`);
  if (memory.constraints?.length) lines.push(`محدودیت‌های خلاقانه: ${memory.constraints.join("؛ ")}`);
  if (memory.preferredVocabulary?.length)
    lines.push(`واژه‌های مورد علاقه: ${memory.preferredVocabulary.slice(0, 12).join("، ")}`);
  if (memory.avoidedVocabulary?.length)
    lines.push(`پرهیز از: ${memory.avoidedVocabulary.slice(0, 12).join("، ")}`);
  if (memory.artistVoiceNotes) lines.push(`یادداشت صدا: ${memory.artistVoiceNotes}`);
  if (memory.structureNotes) lines.push(`ساختار: ${memory.structureNotes}`);
  if (!lines.length) return "";
  return ["حافظهٔ خلاق پروژه (مختصر — رعایت کن):", ...lines.map((l) => `- ${l}`)].join("\n");
}
