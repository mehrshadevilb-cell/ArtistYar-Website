"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Loader2, Send, Square } from "lucide-react";
import { detectIntent, QUICK_ACTIONS, type HitNevisMode, type LyricSectionId } from "@/lib/hitnevis/intent";
import { Bubble, type ChatMessage } from "./HitNevisBubbles";

type Section = { id: string; type: LyricSectionId; label: string; text: string };
type ArtistVoice = { name: string; styleNotes: string; preferredWords: string; avoidedWords: string };

const STORAGE = "hitnevis_chat_v2";
const ORIGINAL_KEY = "hitnevis_original_v2";
const DEFAULT_SECTIONS: Section[] = [
  { id: "s-v1", type: "verse", label: "ورس ۱", text: "" },
  { id: "s-pre", type: "pre_chorus", label: "پری‌کورس", text: "" },
  { id: "s-ch", type: "chorus", label: "کورس", text: "" },
  { id: "s-br", type: "bridge", label: "بریج", text: "" },
];

function uid(p = "m") {
  return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
function sectionsToText(sections: Section[]) {
  return sections.filter((s) => s.text.trim()).map((s) => `[${s.label}]\n${s.text.trim()}`).join("\n\n");
}
function emptyVoice(): ArtistVoice {
  return { name: "", styleNotes: "", preferredWords: "", avoidedWords: "" };
}
function persianError(raw: unknown) {
  if (typeof raw === "string" && raw.trim() && !/provider|model|openai|anthropic|api[_ ]?key|stack|ECONN/i.test(raw)) {
    return raw.trim().slice(0, 280);
  }
  return "الان نتونستم جواب بدم. متنت سر جاشه — دوباره بزن.";
}

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "سلام — من همکار ترانه‌نویسی‌ات هستم.\n\nهر چی تو ذهنته بگو: ایده، یک خط، حس، یا «این کورس رو قوی‌تر کن».\nبدون فرم و تنظیمات اضافه، همین‌جا با هم پیش می‌ریم.\n\nمتن اصلیت بدون اجازه‌ات عوض نمی‌شه.",
  at: 0,
  kind: "text",
};

export default function HitNevisClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS);
  const [activeId, setActiveId] = useState(DEFAULT_SECTIONS[0].id);
  const [topic] = useState("");
  const [voice] = useState<ArtistVoice>(emptyVoice());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const active = useMemo(() => sections.find((s) => s.id === activeId) || sections[0], [sections, activeId]);
  const fullLyrics = useMemo(() => sectionsToText(sections), [sections]);
  const hasLyrics = Boolean(fullLyrics.trim() || active?.text?.trim());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const d = JSON.parse(raw) as Record<string, unknown>;
        if (Array.isArray(d.messages) && d.messages.length) setMessages(d.messages as ChatMessage[]);

        if (Array.isArray(d.sections) && (d.sections as Section[]).length) {
          setSections(d.sections as Section[]);
          setActiveId((d.sections as Section[])[0].id);
        }

      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE, JSON.stringify({ messages: messages.slice(-60), sections, savedAt: new Date().toISOString() }));
      } catch {}
    }, 500);
    return (
    <div className="mx-auto flex h-[min(100dvh-6rem,820px)] min-h-0 max-w-3xl flex-col overflow-hidden" dir="rtl">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-ink-800/50 bg-ink-950/40">
        <div ref={chatScrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5">
          {messages.map((m) => (
            <Bubble key={m.id} msg={m} copied={copiedId === m.id} loading={loading} isEditing={editingId === m.id}
              onCopy={async () => { try { await navigator.clipboard.writeText(m.content); setCopiedId(m.id); setTimeout(() => setCopiedId(null), 1400); } catch {} }}
              onUse={() => applyText(m.content, "replace")} onAppend={() => applyText(m.content, "append")}
              onContinue={() => void runRequest("ادامه‌ش بده", { forcedMode: "continue" })}
              onRewrite={() => void runRequest("بازنویسی کن", { forcedMode: "rewrite" })}
              onRegen={() => m.lastPrompt && void runRequest(m.lastPrompt, { forcedMode: m.mode, skipUserBubble: true })}
              onRetry={() => m.lastPrompt && void runRequest(m.lastPrompt, { forcedMode: m.mode, skipUserBubble: true })}
              onEdit={() => { if (m.role === "user" && !loading) { setEditingId(m.id); setInput(m.content); inputRef.current?.focus(); } }}
              onDirection={(d) => applyText(d, "replace")}
            />
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-ink-500">
              <span className="inline-flex h-8 items-center gap-1.5 rounded-2xl bg-ink-900/80 px-3 text-ink-300">در حال نوشتن…</span>
              <button type="button" onClick={() => abortRef.current?.abort()} className="inline-flex items-center gap-1"><Square size={10} /> لغو</button>
            </div>
          )}
        </div>

        {messages.length <= 2 && !loading && (
          <div className="flex flex-wrap gap-1.5 border-t border-ink-800/40 px-3 py-2.5">
            {QUICK_ACTIONS.slice(0, 6).map((q) => (
              <button key={q.label} type="button" onClick={() => void runRequest(q.prompt)} className="rounded-full border border-ink-800 px-2.5 py-1 text-[11px] text-ink-400 hover:border-ink-600 hover:text-sand-100">{q.label}</button>
            ))}
          </div>
        )}

        <form onSubmit={onSubmit} className="shrink-0 border-t border-ink-800/50 bg-ink-950/60 px-3 py-3">
          {editingId && (
            <div className="mb-2 flex items-center justify-between text-[11px] text-ink-400">
              <span>ویرایش پیام…</span>
              <button type="button" onClick={() => { setEditingId(null); setInput(""); }}>انصراف</button>
            </div>
          )}
          <div className="flex items-end gap-2 rounded-2xl border border-ink-800/80 bg-ink-900/40 px-2 py-1.5 focus-within:border-ink-600">
            <textarea ref={inputRef} value={input}
              onChange={(e) => { const v = e.target.value.slice(0, 4000); setInput(v); const el = e.target; el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 144)}px`; }}
              onKeyDown={onKeyDown} rows={1} placeholder="پیامت را بنویس…" disabled={loading}
              className="max-h-36 min-h-[2.75rem] flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-sand-50 outline-none placeholder:text-ink-600 disabled:opacity-60" />
            <button type="submit" disabled={loading || !input.trim()} aria-label="ارسال" className="mb-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand-100 text-ink-950 disabled:opacity-35">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-ink-600">Enter ارسال · Shift+Enter خط جدید</p>
        </form>
      </div>
    </div>
  );
}
