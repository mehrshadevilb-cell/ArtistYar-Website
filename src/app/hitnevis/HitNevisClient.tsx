"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import {
  Loader2,
  Send,
  Square,
  Copy,
  Check,
  RotateCcw,
  PanelRight,
  X,
  Sparkles,
  AlertCircle,
  User,
  ChevronDown,
  Plus,
} from "lucide-react";
import { detectIntent, QUICK_ACTIONS, type HitNevisMode, type LyricSectionId } from "@/lib/hitnevis/intent";

type Section = { id: string; type: LyricSectionId; label: string; text: string };
type ArtistVoice = {
  name: string;
  styleNotes: string;
  preferredWords: string;
  avoidedWords: string;
  register: "" | "colloquial" | "literary" | "mixed";
};
type DnaResult = {
  structureScore: number;
  hookPresence: number;
  repetitionIndex: number;
  narrativeClarity: number;
  emotionalArc: number;
  rhymeDensity: number;
  registerConsistency: number;
  phraseDensity: number;
  memorabilitySignal: number;
  overall: number;
  notes: string[];
  disclaimer: string;
};
type HumanTest = { id: string; label: string; score: number; summary: string; tips: string[] };

type CardKind = "lyrics" | "analysis" | "dna" | "human" | "directions" | "error";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  at: number;
  mode?: HitNevisMode;
  modeLabel?: string;
  cardKind?: CardKind;
  directions?: string[];
  dna?: DnaResult;
  humanTests?: HumanTest[];
  humanOverall?: number;
  cliches?: string[];
  retryable?: boolean;
  lastPrompt?: string;
};

const STORAGE = "hitnevis_chat_v1";
const ORIGINAL_KEY = "hitnevis_original_v2";

const DEFAULT_SECTIONS: Section[] = [
  { id: "s-v1", type: "verse", label: "ورس ۱", text: "" },
  { id: "s-pre", type: "pre_chorus", label: "پری‌کورس", text: "" },
  { id: "s-ch", type: "chorus", label: "کورس", text: "" },
  { id: "s-v2", type: "verse", label: "ورس ۲", text: "" },
  { id: "s-br", type: "bridge", label: "بریج", text: "" },
  { id: "s-out", type: "outro", label: "اوت‌رو", text: "" },
];

function uid(prefix = "m"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function sectionsToText(sections: Section[]): string {
  return sections
    .filter((s) => s.text.trim())
    .map((s) => `[${s.label}]\n${s.text.trim()}`)
    .join("\n\n");
}

function emptyVoice(): ArtistVoice {
  return { name: "", styleNotes: "", preferredWords: "", avoidedWords: "", register: "" };
}

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "system",
  content:
    "سلام! من هیت‌نویس‌ام — دستیار ترانه‌سرایی فارسی.\n\nهر چی لازم داری به زبان خودت بگو؛ مثلاً:\n• «یه کورس قوی بساز»\n• «این قسمت رو بهتر کن»\n• «ادامه‌ش بده»\n• «کلیشه‌هاشو پیدا کن»\n• «تحلیلش کن» یا «Hit DNA»\n\nمتن اصلی‌ات هرگز خودکار جایگزین نمی‌شود. از دکمهٔ پروژه می‌تونی بخش‌ها و صدای هنرمند را ببینی.",
  at: 0,
  cardKind: "analysis",
};

export default function HitNevisClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS);
  const [activeSectionId, setActiveSectionId] = useState(DEFAULT_SECTIONS[0].id);
  const [title, setTitle] = useState("ترانهٔ بدون عنوان");
  const [topic, setTopic] = useState("");
  const [genre, setGenre] = useState("");
  const [tone, setTone] = useState("");
  const [voice, setVoice] = useState<ArtistVoice>(emptyVoice());
  const [drawer, setDrawer] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeSection = useMemo(
    () => sections.find((s) => s.id === activeSectionId) || sections[0],
    [sections, activeSectionId],
  );
  const fullLyrics = useMemo(() => sectionsToText(sections), [sections]);
  const hasLyrics = Boolean(fullLyrics.trim() || activeSection?.text?.trim());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const d = JSON.parse(raw) as Record<string, unknown>;
        if (Array.isArray(d.messages) && d.messages.length) {
          setMessages(d.messages as ChatMessage[]);
        }
        if (typeof d.title === "string") setTitle(d.title);
        if (typeof d.topic === "string") setTopic(d.topic);
        if (typeof d.genre === "string") setGenre(d.genre);
        if (typeof d.tone === "string") setTone(d.tone);
        if (Array.isArray(d.sections) && (d.sections as Section[]).length) {
          setSections(d.sections as Section[]);
          setActiveSectionId((d.sections as Section[])[0].id);
        }
        if (d.voice && typeof d.voice === "object") {
          setVoice({ ...emptyVoice(), ...(d.voice as ArtistVoice) });
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        const slim = messages.slice(-40);
        localStorage.setItem(
          STORAGE,
          JSON.stringify({
            messages: slim,
            title,
            topic,
            genre,
            tone,
            sections,
            voice,
            savedAt: new Date().toISOString(),
          }),
        );
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 800);
      } catch {
        /* quota */
      }
    }, 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [messages, title, topic, genre, tone, sections, voice, hydrated]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const lockOriginal = useCallback(() => {
    try {
      if (!localStorage.getItem(ORIGINAL_KEY) && fullLyrics.trim()) {
        localStorage.setItem(ORIGINAL_KEY, fullLyrics);
      }
    } catch {
      /* ignore */
    }
  }, [fullLyrics]);

  const restoreOriginal = useCallback(() => {
    try {
      const raw = localStorage.getItem(ORIGINAL_KEY);
      if (!raw) {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content: "پیش‌نویس اصلی هنوز ذخیره نشده است.",
            at: Date.now(),
            cardKind: "error",
          },
        ]);
        return;
      }
      setSections((prev) => {
        const next = [...prev];
        if (next[0]) next[0] = { ...next[0], text: raw };
        return next;
      });
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content: "متن اصلی هنرمند بازیابی شد و در بخش اول قرار گرفت.",
          at: Date.now(),
          cardKind: "analysis",
        },
      ]);
    } catch {
      /* ignore */
    }
  }, []);

  const buildVoicePayload = () => {
    if (
      !voice.name &&
      !voice.styleNotes &&
      !voice.preferredWords &&
      !voice.avoidedWords &&
      !voice.register
    ) {
      return undefined;
    }
    return {
      name: voice.name || undefined,
      styleNotes: voice.styleNotes || undefined,
      preferredWords: voice.preferredWords
        ? voice.preferredWords.split(/[,،]/).map((x) => x.trim()).filter(Boolean)
        : undefined,
      avoidedWords: voice.avoidedWords
        ? voice.avoidedWords.split(/[,،]/).map((x) => x.trim()).filter(Boolean)
        : undefined,
      register: voice.register || undefined,
    };
  };

  const applyToSection = (text: string, sectionId?: string) => {
    const id = sectionId || activeSectionId;
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, text } : s)));
  };

  const applyToActiveAppend = (text: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === activeSectionId
          ? { ...s, text: s.text.trim() ? `${s.text.trim()}\n${text}` : text }
          : s,
      ),
    );
  };

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1400);
    } catch {
      /* ignore */
    }
  };

  const runRequest = useCallback(
    async (userText: string, forcedMode?: HitNevisMode, forcedSection?: LyricSectionId) => {
      const trimmed = userText.trim();
      if (!trimmed && !forcedMode) return;

      const intent = forcedMode
        ? {
            mode: forcedMode,
            sectionType: forcedSection,
            confidence: 1,
            label: forcedMode,
          }
        : detectIntent(trimmed || topic, hasLyrics);

      const mode = intent.mode;
      const sectionType =
        intent.sectionType || (activeSection?.type as LyricSectionId | undefined);

      const userMsg: ChatMessage = {
        id: uid("u"),
        role: "user",
        content: trimmed || intent.label,
        at: Date.now(),
        mode,
        modeLabel: intent.label,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);
      lockOriginal();

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const existing =
        mode === "write_full" ||
        mode === "structure" ||
        mode === "title_ideas" ||
        mode === "idea_analyze"
          ? fullLyrics || activeSection?.text || ""
          : activeSection?.text?.trim() || fullLyrics;

      try {
        if (mode === "hit_dna" || mode === "human_tests" || mode === "anti_cliche") {
          const kind =
            mode === "hit_dna" ? "dna" : mode === "human_tests" ? "human" : "cliche";
          const res = await fetch("/api/hitnevis/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: existing || trimmed || topic,
              kind,
              artistNotes: voice.styleNotes || undefined,
            }),
            signal: ac.signal,
            cache: "no-store",
          });
          const data = await res.json();
          if (!data.ok) {
            setMessages((prev) => [
              ...prev,
              {
                id: uid(),
                role: "assistant",
                content: data.error || "تحلیل ممکن نشد.",
                at: Date.now(),
                cardKind: "error",
                retryable: true,
                lastPrompt: trimmed,
                mode,
              },
            ]);
            return;
          }
          if (mode === "hit_dna") {
            setMessages((prev) => [
              ...prev,
              {
                id: uid(),
                role: "assistant",
                content: data.report || data.dnaReport || "تحلیل آماده است.",
                at: Date.now(),
                cardKind: "dna",
                dna: data.dna,
                mode,
                modeLabel: "Hit DNA",
              },
            ]);
          } else if (mode === "human_tests") {
            setMessages((prev) => [
              ...prev,
              {
                id: uid(),
                role: "assistant",
                content: data.report || data.humanReport || "نتایج تست‌ها:",
                at: Date.now(),
                cardKind: "human",
                humanTests: data.human?.tests,
                humanOverall: data.human?.overall,
                mode,
                modeLabel: "تست انسانی",
              },
            ]);
          } else {
            const list: string[] = data.cliches || [];
            setMessages((prev) => [
              ...prev,
              {
                id: uid(),
                role: "assistant",
                content:
                  list.length > 0
                    ? `کلیشه‌های احتمالی:\n• ${list.join("\n• ")}\n\nمی‌تونی بگی «جایگزین پیشنهاد بده» تا نسخهٔ تازه بسازم.`
                    : "کلیشهٔ واضحی پیدا نشد — متن نسبتاً تازه به نظر می‌رسد.",
                at: Date.now(),
                cardKind: "analysis",
                cliches: list,
                mode,
                modeLabel: "ضدکلیشه",
              },
            ]);
          }
          return;
        }

        const res = await fetch("/api/hitnevis/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            topic: (topic || trimmed).slice(0, 500) || undefined,
            existingLyrics: existing || undefined,
            sectionType,
            genre: genre || undefined,
            tone: tone || undefined,
            constraints: trimmed && trimmed !== topic ? trimmed.slice(0, 400) : undefined,
            language: "fa",
            artistVoice: buildVoicePayload(),
            directionsCount: mode === "save_lyric" || mode === "hook_lab" ? 3 : undefined,
          }),
          signal: ac.signal,
          cache: "no-store",
        });

        const data = await res.json();
        if (!data.ok) {
          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              role: "assistant",
              content: data.error || "خطا در تولید. پیش‌نویس محفوظ است.",
              at: Date.now(),
              cardKind: "error",
              retryable: Boolean(data.retryable),
              lastPrompt: trimmed,
              mode,
            },
          ]);
          return;
        }

        const isLyric =
          mode.startsWith("write_") ||
          [
            "continue",
            "rewrite",
            "improve",
            "shorten",
            "emotional",
            "conversational",
            "visual",
            "bold",
            "rhyme",
            "artist_voice",
          ].includes(mode);

        const isDir = mode === "save_lyric" || mode === "hook_lab";

        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content: data.text,
            at: Date.now(),
            cardKind: isDir ? "directions" : isLyric ? "lyrics" : "analysis",
            directions: data.directions,
            mode,
            modeLabel: intent.label,
            lastPrompt: trimmed,
          },
        ]);
      } catch (e) {
        if ((e as Error)?.name === "AbortError") {
          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              role: "assistant",
              content: "درخواست لغو شد.",
              at: Date.now(),
              cardKind: "error",
              retryable: true,
              lastPrompt: trimmed,
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              role: "assistant",
              content: "ارتباط برقرار نشد. متنت امن است — دوباره امتحان کن.",
              at: Date.now(),
              cardKind: "error",
              retryable: true,
              lastPrompt: trimmed,
            },
          ]);
        }
      } finally {
        setLoading(false);
      }
    },
    [hasLyrics, topic, activeSection, fullLyrics, genre, tone, voice, lockOriginal, activeSectionId],
  );

  const onSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (loading) return;
    const t = input.trim();
    if (!t) return;
    void runRequest(t);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const addSection = (type: LyricSectionId, label: string) => {
    const s: Section = { id: uid("s"), type, label, text: "" };
    setSections((prev) => [...prev, s]);
    setActiveSectionId(s.id);
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-ink-400">
        <Loader2 className="me-2 animate-spin" size={18} />
        بازیابی گفتگو…
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[70vh] flex-col gap-3 lg:flex-row" dir="rtl">
      <div className="flex min-h-[60vh] flex-1 flex-col overflow-hidden rounded-2xl border border-ink-800/80 bg-ink-950/40">
        <div className="flex flex-wrap items-center gap-2 border-b border-ink-800/80 px-3 py-2.5 sm:px-4">
          <Sparkles size={16} className="text-gold-400" />
          <span className="text-sm font-medium text-sand-100">گفتگوی ترانه‌سرایی</span>
          <span className="text-[10px] text-ink-500">{savedFlash ? "ذخیره شد" : "ذخیرهٔ خودکار"}</span>
          <div className="ms-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={restoreOriginal}
              className="inline-flex items-center gap-1 rounded-lg border border-ink-700 px-2 py-1 text-[11px] text-ink-300 hover:text-sand-100"
              title="بازیابی متن اصلی"
            >
              <RotateCcw size={12} />
              اصل
            </button>
            <button
              type="button"
              onClick={() => setDrawer((d) => !d)}
              className="inline-flex items-center gap-1 rounded-lg border border-ink-700 px-2 py-1 text-[11px] text-ink-300 hover:text-sand-100 lg:hidden"
            >
              <PanelRight size={12} />
              پروژه
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-4">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              msg={m}
              copied={copiedId === m.id}
              loading={loading}
              onCopy={() => void copyText(m.id, m.content)}
              onUse={() => applyToSection(m.content)}
              onAppend={() => applyToActiveAppend(m.content)}
              onContinue={() => void runRequest("ادامه‌ش بده", "continue")}
              onRewrite={() => void runRequest("بازنویسی کن", "rewrite")}
              onRegen={() => m.lastPrompt && void runRequest(m.lastPrompt, m.mode)}
              onRetry={() => m.lastPrompt && void runRequest(m.lastPrompt, m.mode)}
              onDirection={(d) => applyToSection(d)}
            />
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-ink-400">
              <Loader2 size={16} className="animate-spin text-gold-400" />
              در حال نوشتن…
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="ms-2 inline-flex items-center gap-1 rounded-lg border border-ink-600 px-2 py-0.5 text-[11px] text-ink-300"
              >
                <Square size={10} /> لغو
              </button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {!loading && messages.length <= 2 && (
          <div className="flex flex-wrap gap-1.5 border-t border-ink-800/50 px-3 py-2 sm:px-4">
            {QUICK_ACTIONS.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => void runRequest(q.prompt)}
                className="rounded-full border border-ink-700/80 bg-ink-900/50 px-2.5 py-1 text-[11px] text-ink-300 hover:border-gold-400/40 hover:text-sand-100"
              >
                {q.label}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={onSubmit} className="border-t border-ink-800/80 bg-ink-950/60 p-3 sm:p-4">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 2000))}
              onKeyDown={onKeyDown}
              rows={2}
              placeholder="مثلاً: یه کورس قوی بساز…"
              className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-xl border border-ink-700/80 bg-ink-900/80 px-3 py-2.5 text-sm leading-6 text-sand-50 outline-none focus:border-gold-400/40"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-400/90 text-ink-950 transition hover:bg-gold-300 disabled:opacity-50"
              aria-label="ارسال"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-ink-600">Enter ارسال · Shift+Enter خط جدید</p>
        </form>
      </div>

      <aside
        className={`
          ${drawer ? "fixed inset-0 z-40 flex" : "hidden"}
          lg:relative lg:z-0 lg:flex lg:w-80 lg:shrink-0 lg:flex-col
        `}
      >
        {drawer && (
          <button
            type="button"
            className="absolute inset-0 bg-black/50 lg:hidden"
            aria-label="بستن"
            onClick={() => setDrawer(false)}
          />
        )}
        <div
          className={`
            relative ms-auto flex h-full w-[min(100%,20rem)] flex-col overflow-y-auto
            border-ink-800/80 bg-ink-950 p-4
            lg:ms-0 lg:h-auto lg:w-full lg:rounded-2xl lg:border
            ${drawer ? "border-s" : ""}
          `}
        >
          <div className="mb-3 flex items-center justify-between lg:hidden">
            <span className="text-sm font-medium text-sand-100">پروژه</span>
            <button type="button" onClick={() => setDrawer(false)} aria-label="بستن">
              <X size={18} className="text-ink-400" />
            </button>
          </div>

          <label className="block text-[11px] text-ink-500">
            عنوان
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 120))}
              className="mt-1 w-full rounded-lg border border-ink-700/80 bg-ink-900/60 px-2.5 py-1.5 text-sm text-sand-50"
            />
          </label>
          <label className="mt-2 block text-[11px] text-ink-500">
            موضوع / حس
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value.slice(0, 500))}
              className="mt-1 w-full rounded-lg border border-ink-700/80 bg-ink-900/60 px-2.5 py-1.5 text-sm text-sand-50"
              placeholder="اختیاری"
            />
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="block text-[11px] text-ink-500">
              ژانر
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="mt-1 w-full rounded-lg border border-ink-700/80 bg-ink-900/60 px-2 py-1.5 text-xs text-sand-50"
              >
                <option value="">—</option>
                <option value="pop">پاپ</option>
                <option value="hiphop">هیپ‌هاپ</option>
                <option value="rock">راک</option>
                <option value="traditional">سنتی</option>
                <option value="electronic">الکترونیک</option>
                <option value="rnb">R&B</option>
                <option value="folk">فولک</option>
              </select>
            </label>
            <label className="block text-[11px] text-ink-500">
              حس
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-ink-700/80 bg-ink-900/60 px-2 py-1.5 text-xs text-sand-50"
              >
                <option value="">—</option>
                <option value="romantic">عاشقانه</option>
                <option value="sad">غمگین</option>
                <option value="hopeful">امیدوار</option>
                <option value="angry">عصبانی</option>
                <option value="playful">شوخ</option>
                <option value="epic">حماسی</option>
                <option value="neutral">خنثی</option>
              </select>
            </label>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-medium text-ink-400">بخش‌ها</span>
              <button
                type="button"
                onClick={() =>
                  addSection("verse", `ورس ${sections.filter((x) => x.type === "verse").length + 1}`)
                }
                className="inline-flex items-center gap-0.5 text-[10px] text-gold-300"
              >
                <Plus size={12} /> ورس
              </button>
            </div>
            <div className="space-y-2">
              {sections.map((s) => (
                <div key={s.id}>
                  <button
                    type="button"
                    onClick={() => setActiveSectionId(s.id)}
                    className={`mb-1 rounded px-1.5 py-0.5 text-[11px] ${
                      activeSectionId === s.id ? "bg-gold-400/15 text-gold-200" : "text-ink-400"
                    }`}
                  >
                    {s.label}
                    {s.text.trim() ? " ·" : ""}
                  </button>
                  {activeSectionId === s.id && (
                    <textarea
                      value={s.text}
                      onChange={(e) =>
                        setSections((prev) =>
                          prev.map((x) =>
                            x.id === s.id ? { ...x, text: e.target.value.slice(0, 4000) } : x,
                          ),
                        )
                      }
                      rows={5}
                      className="w-full rounded-lg border border-ink-700/80 bg-ink-900/50 px-2 py-1.5 text-xs leading-6 text-sand-50"
                      dir="auto"
                      placeholder={`متن ${s.label}…`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setVoiceOpen((v) => !v)}
            className="mt-4 flex w-full items-center justify-between rounded-lg border border-ink-700/60 px-2.5 py-2 text-xs text-ink-300"
          >
            <span className="inline-flex items-center gap-1">
              <User size={12} /> صدای هنرمند
            </span>
            <ChevronDown size={14} className={voiceOpen ? "rotate-180" : ""} />
          </button>
          {voiceOpen && (
            <div className="mt-2 space-y-2 rounded-lg border border-ink-800/80 p-2">
              <input
                value={voice.name}
                onChange={(e) => setVoice((v) => ({ ...v, name: e.target.value.slice(0, 80) }))}
                placeholder="نام / هویت"
                className="w-full rounded border border-ink-700/60 bg-ink-900/50 px-2 py-1 text-xs text-sand-50"
              />
              <textarea
                value={voice.styleNotes}
                onChange={(e) =>
                  setVoice((v) => ({ ...v, styleNotes: e.target.value.slice(0, 500) }))
                }
                rows={2}
                placeholder="یادداشت سبک"
                className="w-full rounded border border-ink-700/60 bg-ink-900/50 px-2 py-1 text-xs text-sand-50"
              />
              <input
                value={voice.preferredWords}
                onChange={(e) =>
                  setVoice((v) => ({ ...v, preferredWords: e.target.value.slice(0, 300) }))
                }
                placeholder="واژه‌های مورد علاقه"
                className="w-full rounded border border-ink-700/60 bg-ink-900/50 px-2 py-1 text-xs text-sand-50"
              />
              <input
                value={voice.avoidedWords}
                onChange={(e) =>
                  setVoice((v) => ({ ...v, avoidedWords: e.target.value.slice(0, 300) }))
                }
                placeholder="پرهیز از"
                className="w-full rounded border border-ink-700/60 bg-ink-900/50 px-2 py-1 text-xs text-sand-50"
              />
            </div>
          )}

          <p className="mt-4 text-[10px] leading-5 text-ink-600">
            متن اصلی هرگز خودکار جایگزین نمی‌شود. از «جایگزینی» روی کارت برای اعمال در بخش فعال استفاده کن.
          </p>
        </div>
      </aside>

      <button
        type="button"
        onClick={() => setDrawer(true)}
        className="fixed bottom-20 left-4 z-30 rounded-full border border-ink-600 bg-ink-900 p-3 text-ink-300 shadow-lg lg:hidden"
        aria-label="پروژه"
      >
        <PanelRight size={18} />
      </button>
    </div>
  );
}

function MessageBubble({
  msg,
  copied,
  loading,
  onCopy,
  onUse,
  onAppend,
  onContinue,
  onRewrite,
  onRegen,
  onRetry,
  onDirection,
}: {
  msg: ChatMessage;
  copied: boolean;
  loading: boolean;
  onCopy: () => void;
  onUse: () => void;
  onAppend: () => void;
  onContinue: () => void;
  onRewrite: () => void;
  onRegen: () => void;
  onRetry: () => void;
  onDirection: (d: string) => void;
}) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[90%] rounded-2xl rounded-tr-md bg-gold-400/15 px-3.5 py-2.5 text-sm leading-7 text-sand-50">
          {msg.content}
          {msg.modeLabel && (
            <div className="mt-1 text-[10px] text-gold-300/80">{msg.modeLabel}</div>
          )}
        </div>
      </div>
    );
  }

  const isError = msg.cardKind === "error";
  const isLyrics = msg.cardKind === "lyrics";
  const isDna = msg.cardKind === "dna";
  const isHuman = msg.cardKind === "human";
  const isDir = msg.cardKind === "directions";

  return (
    <div className="flex justify-end">
      <div
        className={`max-w-[95%] rounded-2xl rounded-tl-md border px-3.5 py-3 text-sm leading-7 ${
          isError
            ? "border-red-500/30 bg-red-950/40 text-red-100"
            : "border-ink-700/60 bg-ink-900/70 text-sand-50"
        }`}
      >
        {msg.modeLabel && !isError && (
          <div className="mb-1.5 text-[10px] text-ink-500">{msg.modeLabel}</div>
        )}
        {isError && (
          <div className="mb-1 flex items-center gap-1.5 text-xs">
            <AlertCircle size={14} /> خطا
          </div>
        )}

        <pre className="whitespace-pre-wrap font-sans text-sm leading-7" dir="auto">
          {msg.content}
        </pre>

        {isDna && msg.dna && (
          <div className="mt-3 grid grid-cols-3 gap-1.5 text-[10px]">
            {(
              [
                ["ساختار", msg.dna.structureScore],
                ["هوک", msg.dna.hookPresence],
                ["تکرار", msg.dna.repetitionIndex],
                ["روایت", msg.dna.narrativeClarity],
                ["احساس", msg.dna.emotionalArc],
                ["قافیه", msg.dna.rhymeDensity],
                ["رجیستر", msg.dna.registerConsistency],
                ["عبارت", msg.dna.phraseDensity],
                ["حافظه", msg.dna.memorabilitySignal],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="rounded-md bg-ink-950/80 px-1.5 py-1">
                <div className="text-ink-500">{k}</div>
                <div>{v}/10</div>
              </div>
            ))}
            <div className="col-span-3 rounded-md bg-gold-400/10 px-2 py-1 text-xs">
              جمع: {msg.dna.overall}/10
            </div>
          </div>
        )}

        {isHuman && msg.humanTests && (
          <div className="mt-3 space-y-1.5 text-xs">
            <div className="text-gold-200">میانگین: {msg.humanOverall}/10</div>
            {msg.humanTests.map((t) => (
              <div key={t.id} className="rounded-md bg-ink-950/70 px-2 py-1.5">
                <span className="font-medium">{t.label}</span>: {t.score}/10 — {t.summary}
              </div>
            ))}
          </div>
        )}

        {isDir && msg.directions && msg.directions.length > 0 && (
          <div className="mt-3 space-y-2">
            {msg.directions.map((d, i) => (
              <button
                key={i}
                type="button"
                disabled={loading}
                onClick={() => onDirection(d)}
                className="block w-full rounded-xl border border-ink-600/60 bg-ink-950/50 p-2.5 text-start text-xs leading-6 hover:border-gold-400/30"
              >
                {d.slice(0, 500)}
                {d.length > 500 ? "…" : ""}
                <span className="mt-1 block text-[10px] text-gold-300">استفاده از این جهت</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {!isError && (
            <>
              <ActionBtn onClick={onCopy}>
                {copied ? <Check size={12} /> : <Copy size={12} />} کپی
              </ActionBtn>
              {(isLyrics || isDir) && (
                <>
                  <ActionBtn onClick={onUse}>جایگزینی</ActionBtn>
                  <ActionBtn onClick={onAppend}>افزودن</ActionBtn>
                  <ActionBtn onClick={onContinue} disabled={loading}>
                    ادامه
                  </ActionBtn>
                  <ActionBtn onClick={onRewrite} disabled={loading}>
                    بازنویسی
                  </ActionBtn>
                  <ActionBtn onClick={onRegen} disabled={loading}>
                    دوباره
                  </ActionBtn>
                </>
              )}
            </>
          )}
          {isError && msg.retryable && (
            <ActionBtn onClick={onRetry} disabled={loading}>
              تلاش دوباره
            </ActionBtn>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg border border-ink-600/70 px-2 py-0.5 text-[11px] text-ink-300 hover:border-gold-400/30 hover:text-sand-100 disabled:opacity-50"
    >
      {children}
    </button>
  );
}
