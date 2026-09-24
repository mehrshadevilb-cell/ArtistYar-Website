"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  Loader2,
  Send,
  Square,
  RotateCcw,
  X,
  Users,
  CheckCheck,
  MessageSquare,
} from "lucide-react";
import {
  detectIntent,
  QUICK_ACTIONS,
  type HitNevisMode,
  type LyricSectionId,
} from "@/lib/hitnevis/intent";
import { getSession } from "@/lib/auth";

type Section = { id: string; type: LyricSectionId; label: string; text: string };

type ArtistVoice = {
  name: string;
  styleNotes: string;
  preferredWords: string;
  avoidedWords: string;
};

type Suggestion = {
  id: string;
  text: string;
  from: string;
  sectionId: string;
  at: number;
  status: "pending" | "accepted" | "rejected";
};

type Actor = "self" | "partner" | "ai";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  actor?: Actor;
  authorName?: string;
  content: string;
  at: number;
  mode?: HitNevisMode;
  modeLabel?: string;
  kind?: "text" | "lyrics" | "analysis" | "error";
  directions?: string[];
  retryable?: boolean;
  lastPrompt?: string;
};

const STORAGE = "hitnevis_partner_v1";
const ORIGINAL_KEY = "hitnevis_original_v2";

const DEFAULT_SECTIONS: Section[] = [
  { id: "s-v1", type: "verse", label: "ورس ۱", text: "" },
  { id: "s-pre", type: "pre_chorus", label: "پری‌کورس", text: "" },
  { id: "s-ch", type: "chorus", label: "کورس", text: "" },
  { id: "s-br", type: "bridge", label: "بریج", text: "" },
];

function uid(p = "x"): string {
  return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function sectionsToText(sections: Section[]): string {
  return sections
    .filter((s) => s.text.trim())
    .map((s) => `[${s.label}]\n${s.text.trim()}`)
    .join("\n\n");
}

function emptyVoice(): ArtistVoice {
  return { name: "", styleNotes: "", preferredWords: "", avoidedWords: "" };
}

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "system",
  content:
    "سلام — من همکار ترانه‌نویسی‌ات هستم.\n\nهر چیزی که در ذهن داری بگو: ایده، حس، یک خط نیمه‌کاره، یا «این کورس رو قوی‌تر کن».\nاگر دو نفرید روی یک ترانه کار می‌کنید، از «همکاری» نام همکارتان را بگذارید؛ پیشنهادها قابل قبول یا رد هستند.\n\nمتن اصلیت بدون اجازه عوض نمی‌شود.",
  at: 0,
  kind: "text",
};

export default function HitNevisClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS);
  const [activeId, setActiveId] = useState(DEFAULT_SECTIONS[0].id);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [voice, setVoice] = useState<ArtistVoice>(emptyVoice());
  const [drawer, setDrawer] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [selfName, setSelfName] = useState("من");
  const [partnerName, setPartnerName] = useState("");
  const [composerAs, setComposerAs] = useState<"self" | "partner">("self");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = useMemo(
    () => sections.find((s) => s.id === activeId) || sections[0],
    [sections, activeId],
  );
  const fullLyrics = useMemo(() => sectionsToText(sections), [sections]);
  const hasLyrics = Boolean(fullLyrics.trim() || active?.text?.trim());
  const pendingCount = suggestions.filter((s) => s.status === "pending").length;

  useEffect(() => {
    try {
      const session = getSession();
      if (session?.fullName) setSelfName(session.fullName.split(" ")[0] || session.username);
    } catch {
      /* ignore */
    }
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const d = JSON.parse(raw) as Record<string, unknown>;
        if (Array.isArray(d.messages) && d.messages.length) setMessages(d.messages as ChatMessage[]);
        if (typeof d.title === "string") setTitle(d.title);
        if (typeof d.topic === "string") setTopic(d.topic);
        if (Array.isArray(d.sections) && (d.sections as Section[]).length) {
          setSections(d.sections as Section[]);
          setActiveId((d.sections as Section[])[0].id);
        }
        if (d.voice && typeof d.voice === "object") setVoice({ ...emptyVoice(), ...(d.voice as ArtistVoice) });
        if (typeof d.partnerName === "string") setPartnerName(d.partnerName);
        if (typeof d.selfName === "string") setSelfName(d.selfName);
        if (Array.isArray(d.suggestions)) setSuggestions(d.suggestions as Suggestion[]);
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
        localStorage.setItem(
          STORAGE,
          JSON.stringify({
            messages: messages.slice(-50),
            title,
            topic,
            sections,
            voice,
            selfName,
            partnerName,
            suggestions: suggestions.slice(-30),
            savedAt: new Date().toISOString(),
          }),
        );
      } catch {
        /* quota */
      }
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [messages, title, topic, sections, voice, selfName, partnerName, suggestions, hydrated]);

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

  const restoreOriginal = () => {
    try {
      const raw = localStorage.getItem(ORIGINAL_KEY);
      if (!raw) {
        pushSystem("پیش‌نویس اصلی هنوز ذخیره نشده.");
        return;
      }
      setSections((prev) => {
        const next = [...prev];
        if (next[0]) next[0] = { ...next[0], text: raw };
        return next;
      });
      pushSystem("متن اصلی بازیابی شد.");
    } catch {
      /* ignore */
    }
  };

  function pushSystem(content: string) {
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "system", content, at: Date.now(), kind: "text" },
    ]);
  }

  const voicePayload = () => {
    if (!voice.name && !voice.styleNotes && !voice.preferredWords && !voice.avoidedWords) return undefined;
    return {
      name: voice.name || undefined,
      styleNotes: voice.styleNotes || undefined,
      preferredWords: voice.preferredWords
        ? voice.preferredWords.split(/[,،]/).map((x) => x.trim()).filter(Boolean)
        : undefined,
      avoidedWords: voice.avoidedWords
        ? voice.avoidedWords.split(/[,،]/).map((x) => x.trim()).filter(Boolean)
        : undefined,
    };
  };

  const applyText = (text: string, mode: "replace" | "append" = "replace") => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== activeId) return s;
        if (mode === "append") {
          return { ...s, text: s.text.trim() ? `${s.text.trim()}\n${text}` : text };
        }
        return { ...s, text };
      }),
    );
  };

  const proposeSuggestion = (text: string, from: string) => {
    setSuggestions((prev) => [
      {
        id: uid("sg"),
        text,
        from,
        sectionId: activeId,
        at: Date.now(),
        status: "pending",
      },
      ...prev,
    ]);
  };

  const resolveSuggestion = (id: string, status: "accepted" | "rejected") => {
    setSuggestions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        if (status === "accepted") {
          setSections((secs) =>
            secs.map((sec) => (sec.id === s.sectionId ? { ...sec, text: s.text } : sec)),
          );
        }
        return { ...s, status };
      }),
    );
  };

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1200);
    } catch {
      /* ignore */
    }
  };

  const runRequest = useCallback(
    async (userText: string, forcedMode?: HitNevisMode) => {
      const trimmed = userText.trim();
      if (!trimmed && !forcedMode) return;

      const intent = forcedMode
        ? { mode: forcedMode, sectionType: undefined as LyricSectionId | undefined, label: forcedMode, confidence: 1 }
        : detectIntent(trimmed || topic, hasLyrics);

      const mode = intent.mode;
      const author =
        composerAs === "partner" && partnerName.trim()
          ? partnerName.trim()
          : selfName;
      const actor: Actor = composerAs === "partner" && partnerName.trim() ? "partner" : "self";

      setMessages((prev) => [
        ...prev,
        {
          id: uid("u"),
          role: "user",
          actor,
          authorName: author,
          content: trimmed || intent.label,
          at: Date.now(),
          mode,
          modeLabel: intent.label,
        },
      ]);
      setInput("");
      setLoading(true);
      lockOriginal();

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const existing =
        mode === "write_full" || mode === "structure" || mode === "title_ideas" || mode === "idea_analyze"
          ? fullLyrics || active?.text || ""
          : active?.text?.trim() || fullLyrics;

      try {
        if (mode === "hit_dna" || mode === "human_tests" || mode === "anti_cliche") {
          const kind = mode === "hit_dna" ? "dna" : mode === "human_tests" ? "human" : "cliche";
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
                actor: "ai",
                authorName: "هیت‌نویس",
                content: data.error || "تحلیل ممکن نشد.",
                at: Date.now(),
                kind: "error",
                retryable: true,
                lastPrompt: trimmed,
                mode,
              },
            ]);
            return;
          }
          let content = "";
          if (mode === "hit_dna") content = data.report || data.dnaReport || "";
          else if (mode === "human_tests") content = data.report || data.humanReport || "";
          else {
            const list: string[] = data.cliches || [];
            content =
              list.length > 0
                ? `چند عبارت نزدیک به کلیشه:\n• ${list.join("\n• ")}\n\nاگر بخواهی جایگزین طبیعی می‌نویسم.`
                : "کلیشهٔ واضحی ندیدم — مسیر نسبتاً تازه‌ای داری.";
          }
          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              role: "assistant",
              actor: "ai",
              authorName: "هیت‌نویس",
              content,
              at: Date.now(),
              kind: "analysis",
              mode,
              modeLabel: intent.label,
            },
          ]);
          return;
        }

        const res = await fetch("/api/hitnevis/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            topic: (topic || trimmed).slice(0, 500) || undefined,
            existingLyrics: existing || undefined,
            sectionType: intent.sectionType || active?.type,
            language: "fa",
            constraints: trimmed && trimmed !== topic ? trimmed.slice(0, 400) : undefined,
            artistVoice: voicePayload(),
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
              actor: "ai",
              authorName: "هیت‌نویس",
              content: data.error || "الان نتونستم جواب بدم. متنت سر جاشه.",
              at: Date.now(),
              kind: "error",
              retryable: Boolean(data.retryable),
              lastPrompt: trimmed,
              mode,
            },
          ]);
          return;
        }

        const isLyric =
          mode.startsWith("write_") ||
          ["continue", "rewrite", "improve", "shorten", "emotional", "conversational", "visual", "bold", "rhyme", "artist_voice"].includes(
            mode,
          );

        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            actor: "ai",
            authorName: "هیت‌نویس",
            content: data.text,
            at: Date.now(),
            kind: isLyric ? "lyrics" : "analysis",
            directions: data.directions,
            mode,
            modeLabel: intent.label,
            lastPrompt: trimmed,
          },
        ]);
      } catch (e) {
        const aborted = (e as Error)?.name === "AbortError";
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            actor: "ai",
            authorName: "هیت‌نویس",
            content: aborted ? "لغو شد." : "ارتباط قطع شد. پیش‌نویس محفوظ است.",
            at: Date.now(),
            kind: "error",
            retryable: true,
            lastPrompt: trimmed,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [
      hasLyrics,
      topic,
      active,
      fullLyrics,
      voice,
      lockOriginal,
      activeId,
      composerAs,
      partnerName,
      selfName,
    ],
  );

  const onSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (loading || !input.trim()) return;
    void runRequest(input);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-ink-400">
        <Loader2 className="me-2 animate-spin" size={16} />
        آماده‌سازی…
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[72vh] max-w-3xl flex-col" dir="rtl">
      <header className="mb-3 flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            placeholder="نام ترانه (اختیاری)"
            className="w-full bg-transparent text-base font-medium text-sand-50 outline-none placeholder:text-ink-600"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={restoreOriginal}
            className="rounded-full px-2.5 py-1 text-[11px] text-ink-400 hover:text-sand-100"
            title="بازیابی اصل"
          >
            <RotateCcw size={14} className="inline" />
          </button>
          <button
            type="button"
            onClick={() => setDrawer(true)}
            className="inline-flex items-center gap-1 rounded-full border border-ink-700/70 px-2.5 py-1 text-[11px] text-ink-300 hover:border-ink-500 hover:text-sand-100"
          >
            <Users size={13} />
            پروژه
            {pendingCount > 0 && (
              <span className="rounded-full bg-gold-400/20 px-1.5 text-[10px] text-gold-200">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-ink-800/60 bg-ink-950/30">
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
          {messages.map((m) => (
            <Bubble
              key={m.id}
              msg={m}
              copied={copiedId === m.id}
              loading={loading}
              onCopy={() => void copyText(m.id, m.content)}
              onUse={() => applyText(m.content, "replace")}
              onAppend={() => applyText(m.content, "append")}
              onPropose={() => proposeSuggestion(m.content, m.authorName || "هیت‌نویس")}
              onContinue={() => void runRequest("ادامه‌ش بده", "continue")}
              onRewrite={() => void runRequest("بازنویسی کن", "rewrite")}
              onRhyme={() => void runRequest("قافیه پیشنهاد بده", "rhyme")}
              onCritic={() => void runRequest("نقدش کن", "critic")}
              onRegen={() => m.lastPrompt && void runRequest(m.lastPrompt, m.mode)}
              onRetry={() => m.lastPrompt && void runRequest(m.lastPrompt, m.mode)}
              onDirection={(d) => applyText(d, "replace")}
            />
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-ink-500">
              <Loader2 size={14} className="animate-spin" />
              در حال فکر کردن…
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="ms-1 inline-flex items-center gap-1 text-ink-400 hover:text-sand-100"
              >
                <Square size={10} /> لغو
              </button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length <= 2 && !loading && (
          <div className="flex flex-wrap gap-1.5 border-t border-ink-800/40 px-4 py-2.5">
            {QUICK_ACTIONS.slice(0, 6).map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => void runRequest(q.prompt)}
                className="rounded-full border border-ink-800 px-2.5 py-1 text-[11px] text-ink-400 transition hover:border-ink-600 hover:text-sand-100"
              >
                {q.label}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={onSubmit} className="border-t border-ink-800/50 px-3 py-3 sm:px-4">
          {partnerName.trim() && (
            <div className="mb-2 flex gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => setComposerAs("self")}
                className={`rounded-full px-2 py-0.5 ${composerAs === "self" ? "bg-ink-800 text-sand-100" : "text-ink-500"}`}
              >
                {selfName}
              </button>
              <button
                type="button"
                onClick={() => setComposerAs("partner")}
                className={`rounded-full px-2 py-0.5 ${composerAs === "partner" ? "bg-ink-800 text-sand-100" : "text-ink-500"}`}
              >
                {partnerName}
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 2000))}
              onKeyDown={onKeyDown}
              rows={2}
              placeholder="با همکار ترانه‌نویس‌ات حرف بزن…"
              disabled={loading}
              className="max-h-28 min-h-[2.5rem] flex-1 resize-none bg-transparent px-1 py-2 text-sm leading-6 text-sand-50 outline-none placeholder:text-ink-600"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="ارسال"
              className="mb-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand-100 text-ink-950 disabled:opacity-40"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </form>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 flex justify-end" dir="rtl">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="بستن"
            onClick={() => setDrawer(false)}
          />
          <div className="relative flex h-full w-full max-w-sm flex-col overflow-y-auto border-s border-ink-800 bg-ink-950 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-sand-100">پروژه</span>
              <button type="button" onClick={() => setDrawer(false)} aria-label="بستن">
                <X size={18} className="text-ink-400" />
              </button>
            </div>

            <label className="block text-[11px] text-ink-500">
              موضوع / حس
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value.slice(0, 400))}
                className="mt-1 w-full border-b border-ink-800 bg-transparent py-1.5 text-sm text-sand-50 outline-none"
                placeholder="مثلاً جدایی، امید، شب شهر"
              />
            </label>

            <div className="mt-5">
              <p className="mb-2 text-[11px] font-medium text-ink-400">بخش‌ها</p>
              <div className="space-y-3">
                {sections.map((s) => (
                  <div key={s.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(s.id)}
                      className={`text-[11px] ${activeId === s.id ? "text-sand-100" : "text-ink-500"}`}
                    >
                      {s.label}
                      {s.text.trim() ? " ·" : ""}
                    </button>
                    {activeId === s.id && (
                      <textarea
                        value={s.text}
                        onChange={(e) =>
                          setSections((prev) =>
                            prev.map((x) =>
                              x.id === s.id ? { ...x, text: e.target.value.slice(0, 4000) } : x,
                            ),
                          )
                        }
                        rows={4}
                        dir="auto"
                        className="mt-1 w-full resize-y border border-ink-800/80 bg-transparent px-2 py-1.5 text-xs leading-6 text-sand-50 outline-none focus:border-ink-600"
                        placeholder={`متن ${s.label}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-2 border-t border-ink-800/60 pt-4">
              <p className="text-[11px] font-medium text-ink-400">همکاری</p>
              <input
                value={selfName}
                onChange={(e) => setSelfName(e.target.value.slice(0, 40))}
                placeholder="نام شما"
                className="w-full border-b border-ink-800 bg-transparent py-1 text-xs text-sand-50 outline-none"
              />
              <input
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value.slice(0, 40))}
                placeholder="نام همکار (اختیاری)"
                className="w-full border-b border-ink-800 bg-transparent py-1 text-xs text-sand-50 outline-none"
              />
              <p className="text-[10px] leading-5 text-ink-600">
                روی یک دستگاه می‌توانید نقش خود/همکار را عوض کنید. پیشنهادهای AI را می‌شود قبول یا رد کرد.
              </p>
            </div>

            {suggestions.some((s) => s.status === "pending") && (
              <div className="mt-5 space-y-2 border-t border-ink-800/60 pt-4">
                <p className="text-[11px] font-medium text-ink-400">پیشنهادهای باز</p>
                {suggestions
                  .filter((s) => s.status === "pending")
                  .map((s) => (
                    <div key={s.id} className="rounded-lg border border-ink-800/80 p-2.5 text-xs">
                      <div className="mb-1 text-[10px] text-ink-500">
                        از {s.from} · {sections.find((x) => x.id === s.sectionId)?.label || "بخش"}
                      </div>
                      <pre className="whitespace-pre-wrap font-sans leading-6 text-sand-50" dir="auto">
                        {s.text.slice(0, 400)}
                        {s.text.length > 400 ? "…" : ""}
                      </pre>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => resolveSuggestion(s.id, "accepted")}
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-300"
                        >
                          <CheckCheck size={12} /> قبول
                        </button>
                        <button
                          type="button"
                          onClick={() => resolveSuggestion(s.id, "rejected")}
                          className="text-[11px] text-ink-500"
                        >
                          رد
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <div className="mt-5 space-y-2 border-t border-ink-800/60 pt-4">
              <p className="text-[11px] font-medium text-ink-400">صدای هنرمند</p>
              <input
                value={voice.styleNotes}
                onChange={(e) => setVoice((v) => ({ ...v, styleNotes: e.target.value.slice(0, 400) }))}
                placeholder="سبک / لحن"
                className="w-full border-b border-ink-800 bg-transparent py-1 text-xs text-sand-50 outline-none"
              />
              <input
                value={voice.preferredWords}
                onChange={(e) =>
                  setVoice((v) => ({ ...v, preferredWords: e.target.value.slice(0, 200) }))
                }
                placeholder="واژه‌های مورد علاقه"
                className="w-full border-b border-ink-800 bg-transparent py-1 text-xs text-sand-50 outline-none"
              />
              <input
                value={voice.avoidedWords}
                onChange={(e) =>
                  setVoice((v) => ({ ...v, avoidedWords: e.target.value.slice(0, 200) }))
                }
                placeholder="پرهیز از"
                className="w-full border-b border-ink-800 bg-transparent py-1 text-xs text-sand-50 outline-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Bubble({
  msg,
  copied,
  loading,
  onCopy,
  onUse,
  onAppend,
  onPropose,
  onContinue,
  onRewrite,
  onRhyme,
  onCritic,
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
  onPropose: () => void;
  onContinue: () => void;
  onRewrite: () => void;
  onRhyme: () => void;
  onCritic: () => void;
  onRegen: () => void;
  onRetry: () => void;
  onDirection: (d: string) => void;
}) {
  if (msg.role === "user") {
    return (
      <div className="flex flex-col items-start gap-0.5">
        {msg.authorName && (
          <span className="text-[10px] text-ink-500">{msg.authorName}</span>
        )}
        <div className="max-w-[92%] text-sm leading-7 text-sand-50">{msg.content}</div>
      </div>
    );
  }

  if (msg.role === "system") {
    return (
      <div className="text-sm leading-7 text-ink-400">
        <MessageSquare size={12} className="mb-1 inline text-ink-600" /> {msg.content}
      </div>
    );
  }

  const isErr = msg.kind === "error";
  const isLyrics = msg.kind === "lyrics";

  return (
    <div className="flex flex-col items-stretch gap-1">
      <span className="text-[10px] text-ink-500">{msg.authorName || "هیت‌نویس"}</span>
      <div className={`text-sm leading-7 ${isErr ? "text-red-200/90" : "text-sand-50"}`}>
        <pre className="whitespace-pre-wrap font-sans" dir="auto">
          {msg.content}
        </pre>
      </div>

      {msg.directions && msg.directions.length > 0 && (
        <div className="mt-2 space-y-2">
          {msg.directions.map((d, i) => (
            <button
              key={i}
              type="button"
              disabled={loading}
              onClick={() => onDirection(d)}
              className="block w-full border border-ink-800/80 px-3 py-2 text-start text-xs leading-6 text-ink-300 hover:border-ink-600 hover:text-sand-100"
            >
              {d.slice(0, 360)}
              {d.length > 360 ? "…" : ""}
            </button>
          ))}
        </div>
      )}

      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
        {!isErr && (
          <>
            <A onClick={onCopy}>{copied ? "کپی شد" : "کپی"}</A>
            {(isLyrics || msg.directions) && (
              <>
                <A onClick={onUse}>جایگزینی</A>
                <A onClick={onAppend}>افزودن</A>
                <A onClick={onPropose}>پیشنهاد به پروژه</A>
                <A onClick={onContinue} disabled={loading}>
                  ادامه
                </A>
                <A onClick={onRewrite} disabled={loading}>
                  بازنویسی
                </A>
                <A onClick={onRhyme} disabled={loading}>
                  قافیه
                </A>
                <A onClick={onCritic} disabled={loading}>
                  نقد
                </A>
                <A onClick={onRegen} disabled={loading}>
                  دوباره
                </A>
              </>
            )}
            {msg.kind === "analysis" && (
              <A onClick={onRegen} disabled={loading}>
                دوباره
              </A>
            )}
          </>
        )}
        {isErr && msg.retryable && (
          <A onClick={onRetry} disabled={loading}>
            تلاش دوباره
          </A>
        )}
      </div>
    </div>
  );
}

function A({
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
      className="text-[11px] text-ink-500 transition hover:text-sand-100 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
