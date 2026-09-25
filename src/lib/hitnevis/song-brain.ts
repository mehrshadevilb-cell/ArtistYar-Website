/** Compact song-level creative memory for HitNevis co-writing. */

export type SongSection = {
  id: string;
  type: "verse" | "pre_chorus" | "chorus" | "hook" | "bridge" | "outro" | "other";
  title?: string;
  text: string;
  version: number;
  updatedAt: string;
};

export type SongVersion = {
  id: string;
  label: string;
  snapshot: string;
  createdAt: string;
  note?: string;
};

export type SongBrain = {
  id: string;
  title: string;
  topic?: string;
  coreConcept?: string;
  story?: string;
  persona?: string;
  emotionalDirection?: string;
  genre?: string;
  tone?: string;
  language: "fa" | "en" | "mixed";
  artistName?: string;
  styleNotes?: string;
  preferredWords: string[];
  avoidedWords: string[];
  hookConcept?: string;
  importantPhrases: string[];
  approved: string[];
  rejected: string[];
  constraints: string[];
  sections: SongSection[];
  versions: SongVersion[];
  /** Latest full draft the user accepts as current working text */
  currentDraft: string;
  /** Original artist material — never silently overwrite */
  originalDraft: string;
  updatedAt: string;
  createdAt: string;
};

export function emptyBrain(partial?: Partial<SongBrain>): SongBrain {
  const now = new Date().toISOString();
  return {
    id: partial?.id || `song-${Date.now().toString(36)}`,
    title: partial?.title || "ترانه بدون عنوان",
    topic: partial?.topic,
    coreConcept: partial?.coreConcept,
    story: partial?.story,
    persona: partial?.persona,
    emotionalDirection: partial?.emotionalDirection,
    genre: partial?.genre,
    tone: partial?.tone,
    language: partial?.language || "fa",
    artistName: partial?.artistName,
    styleNotes: partial?.styleNotes,
    preferredWords: partial?.preferredWords || [],
    avoidedWords: partial?.avoidedWords || [],
    hookConcept: partial?.hookConcept,
    importantPhrases: partial?.importantPhrases || [],
    approved: partial?.approved || [],
    rejected: partial?.rejected || [],
    constraints: partial?.constraints || [],
    sections: partial?.sections || [],
    versions: partial?.versions || [],
    currentDraft: partial?.currentDraft || "",
    originalDraft: partial?.originalDraft || "",
    updatedAt: now,
    createdAt: partial?.createdAt || now,
  };
}

/** Serialize a compact creative brief for the model (not full chat). */
export function brainToPromptBlock(brain: SongBrain): string {
  const lines: string[] = [];
  lines.push(`عنوان پروژه: ${brain.title}`);
  if (brain.topic) lines.push(`موضوع: ${brain.topic}`);
  if (brain.coreConcept) lines.push(`مفهوم مرکزی: ${brain.coreConcept}`);
  if (brain.story) lines.push(`داستان: ${brain.story}`);
  if (brain.persona) lines.push(`راوی/پرسونا: ${brain.persona}`);
  if (brain.emotionalDirection) lines.push(`جهت احساسی: ${brain.emotionalDirection}`);
  if (brain.genre) lines.push(`ژانر: ${brain.genre}`);
  if (brain.tone) lines.push(`تن: ${brain.tone}`);
  if (brain.hookConcept) lines.push(`مفهوم هوک: ${brain.hookConcept}`);
  if (brain.artistName || brain.styleNotes) {
    lines.push(
      `صدای هنرمند: ${[brain.artistName, brain.styleNotes].filter(Boolean).join(" — ")}`,
    );
  }
  if (brain.preferredWords.length) lines.push(`کلمات مورد علاقه: ${brain.preferredWords.join("، ")}`);
  if (brain.avoidedWords.length) lines.push(`پرهیز از: ${brain.avoidedWords.join("، ")}`);
  if (brain.importantPhrases.length) lines.push(`عبارات مهم: ${brain.importantPhrases.slice(-8).join(" | ")}`);
  if (brain.approved.length) lines.push(`تأییدشده: ${brain.approved.slice(-5).join(" | ")}`);
  if (brain.rejected.length) lines.push(`ردشده: ${brain.rejected.slice(-5).join(" | ")}`);
  if (brain.constraints.length) lines.push(`محدودیت‌ها: ${brain.constraints.slice(-6).join("؛ ")}`);
  if (brain.currentDraft.trim()) {
    lines.push(`پیش‌نویس فعلی:\n${brain.currentDraft.trim().slice(0, 3500)}`);
  } else if (brain.originalDraft.trim()) {
    lines.push(`متن اصلی هنرمند:\n${brain.originalDraft.trim().slice(0, 3500)}`);
  }
  if (brain.sections.length) {
    const sec = brain.sections
      .slice(-8)
      .map((s) => `[${s.type}${s.title ? `:${s.title}` : ""} v${s.version}]\n${s.text.slice(0, 600)}`)
      .join("\n\n");
    lines.push(`بخش‌ها:\n${sec}`);
  }
  return lines.join("\n");
}

/** Light heuristic update of brain fields from user message (no LLM). */
export function absorbUserHints(brain: SongBrain, userText: string): SongBrain {
  const t = userText.trim();
  if (!t) return brain;
  const next = { ...brain, updatedAt: new Date().toISOString() };

  if (!next.topic && t.length < 120) next.topic = t.slice(0, 120);

  if (/ژانر\s*[:：]?\s*(.+)/i.test(t)) {
    next.genre = t.match(/ژانر\s*[:：]?\s*(.+)/i)?.[1]?.slice(0, 60) || next.genre;
  }
  if (/حس\s*[:：]?\s*(.+)/i.test(t)) {
    next.emotionalDirection =
      t.match(/حس\s*[:：]?\s*(.+)/i)?.[1]?.slice(0, 80) || next.emotionalDirection;
  }
  if (/این\s*خوبه|نگه\s*دار|همین\s*باشه/.test(t)) {
    next.approved = [...next.approved, t.slice(0, 160)].slice(-12);
  }
  if (/نه\s*این|نمی‌خوام|حذف\s*کن|رد\s*کن/.test(t)) {
    next.rejected = [...next.rejected, t.slice(0, 160)].slice(-12);
  }
  if (/کلیشه/.test(t)) {
    next.constraints = [...next.constraints, "کمتر کلیشه‌ای"].slice(-10);
  }
  if (/غرور/.test(t)) {
    next.emotionalDirection = [next.emotionalDirection, "غرور"].filter(Boolean).join(" + ");
  }
  return next;
}

export function pushVersion(brain: SongBrain, label: string, snapshot: string, note?: string): SongBrain {
  const v: SongVersion = {
    id: `v-${Date.now().toString(36)}`,
    label,
    snapshot: snapshot.slice(0, 12000),
    createdAt: new Date().toISOString(),
    note,
  };
  return {
    ...brain,
    versions: [...brain.versions, v].slice(-30),
    updatedAt: new Date().toISOString(),
  };
}

export function restoreVersion(brain: SongBrain, versionId: string): SongBrain | null {
  const v = brain.versions.find((x) => x.id === versionId);
  if (!v) return null;
  return {
    ...brain,
    currentDraft: v.snapshot,
    updatedAt: new Date().toISOString(),
  };
}

const STORAGE_KEY = "artistyar.hitnevis.brain.v1";

export function loadBrainFromStorage(): SongBrain | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return emptyBrain(parsed);
  } catch {
    return null;
  }
}

export function saveBrainToStorage(brain: SongBrain) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(brain));
  } catch {
    /* quota */
  }
}
