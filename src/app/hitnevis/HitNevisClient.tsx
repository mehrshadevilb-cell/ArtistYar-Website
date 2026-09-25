"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  absorbUserHints,
  brainToPromptBlock,
  emptyBrain,
  loadBrainFromStorage,
  pushVersion,
  restoreVersion,
  saveBrainToStorage,
  type SongBrain,
} from "@/lib/hitnevis/song-brain";
import { detectIntent } from "@/lib/hitnevis/intent";

type Role = "user" | "assistant";
type Msg = {
  id: string;
  role: Role;
  content: string;
  pending?: boolean;
  error?: boolean;
  retryable?: boolean;
  /** AI suggestion that can be applied to draft */
  applyText?: string;
};

const QUICK = [
  { label: "ترانه کامل", mode: "write_full", seed: "یه ترانه کامل درباره " },
  { label: "کورس قوی", mode: "write_chorus", seed: "یه کورس قوی و ماندگار بساز" },
  { label: "۳ مسیر", mode: "save_lyric", seed: "سه مسیر متفاوت برای این قسمت بده", directions: true },
  { label: "ادامه بده", mode: "continue", seed: "ادامه‌ش بده" },
  { label: "بهترش کن", mode: "improve", seed: "این قسمت رو بهتر کن" },
  { label: "کلیشه‌ها", mode: "anti_cliche", seed: "کلیشه‌هاشو پیدا کن و جایگزین پیشنهاد بده" },
  { label: "نقد", mode: "critic", seed: "این متن رو صادقانه نقد کن" },
] as const;

const WELCOME =
  "سلام — من همکار ترانه‌نویسی‌ات هستم.\n\nهر چی تو ذهنته بگو: ایده، یک خط، حس، یا «این کورس رو قوی‌تر کن».\nبدون فرم اضافه، همین‌جا با هم پیش می‌ریم.\n\nمتن اصلیت بدون اجازه‌ات عوض نمی‌شه. پیش‌نویس و نسخه‌ها این‌طرف ذخیره می‌شن.";

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function HitNevisClient() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: "welcome", role: "assistant", content: WELCOME },
  ]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [brain, setBrain] = useState<SongBrain>(() => emptyBrain());
  const [showDraft, setShowDraft] = useState(false);
  const [workingText, setWorkingText] = useState("");

  const listRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const reqSeq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const lastFail = useRef<{
    mode: string;
    topic: string;
    userMsgId: string;
    wantDirections?: boolean;
  } | null>(null);
  const brainRef = useRef(brain);
  brainRef.current = brain;

  useEffect(() => {
    const saved = loadBrainFromStorage();
    if (saved) {
      setBrain(saved);
      setWorkingText(saved.currentDraft || saved.originalDraft || "");
    }
  }, []);

  useEffect(() => {
    saveBrainToStorage(brain);
  }, [brain]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const applyToDraft = useCallback((text: string, mode: "replace" | "append" = "replace") => {
    setBrain((b) => {
      const prev = b.currentDraft || b.originalDraft || "";
      let nextDraft = text;
      if (mode === "append") nextDraft = prev ? `${prev.trim()}\n\n${text.trim()}` : text;
      let nb = b;
      if (prev.trim() && prev.trim() !== nextDraft.trim()) {
        nb = pushVersion(b, `قبل از اعمال`, prev);
      }
      if (!nb.originalDraft.trim()) nb = { ...nb, originalDraft: prev || text };
      nb = {
        ...nb,
        currentDraft: nextDraft,
        updatedAt: new Date().toISOString(),
      };
      setWorkingText(nextDraft);
      return nb;
    });
    setShowDraft(true);
  }, []);

  const send = useCallback(
    async (raw: string, forcedMode?: string, wantDirections?: boolean) => {
      const text = raw.trim();
      if (!text || loading) return;

      const intent = detectIntent(text);
      const mode = forcedMode || intent.mode;
      const userMsg: Msg = { id: uid(), role: "user", content: text };
      const pendingId = uid();

      setBrain((b) => absorbUserHints(b, text));

      const history = messages
        .filter((m) => (m.role === "user" || m.role === "assistant") && m.id !== "welcome" && !m.pending && !m.error)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
        .slice(-14);

      setMessages((prev) => [...prev, userMsg, { id: pendingId, role: "assistant", content: "…", pending: true }]);
      setDraft("");
      setLoading(true);

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const seq = ++reqSeq.current;
      lastFail.current = { mode, topic: text, userMsgId: userMsg.id, wantDirections };

      const b = brainRef.current;
      const brainBlock = brainToPromptBlock(b);

      try {
        const res = await fetch("/api/hitnevis/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            topic: text.slice(0, 500),
            constraints: text.slice(0, 800),
            existingLyrics: (b.currentDraft || b.originalDraft || workingText || "").slice(0, 8000) || undefined,
            language: "fa",
            conversationHistory: history,
            brainBlock,
            wantDirections: wantDirections || intent.wantDirections,
            artistVoice: {
              name: b.artistName,
              styleNotes: b.styleNotes,
              preferredWords: b.preferredWords,
              avoidedWords: b.avoidedWords,
            },
          }),
          signal: ac.signal,
          cache: "no-store",
        });

        let data: any = {};
        try {
          data = await res.json();
        } catch {
          data = { ok: false, error: "پاسخ سرور خوانده نشد." };
        }

        if (seq !== reqSeq.current) return;

        if (!data?.ok || !data?.text) {
          const errText =
            data?.error ||
            (ac.signal.aborted ? "درخواست لغو شد." : "الان نتونستم جواب بدم. متنت سر جاشه — دوباره بزن.");
          setMessages((prev) =>
            prev.map((m) =>
              m.id === pendingId
                ? { ...m, pending: false, error: true, retryable: data?.retryable !== false, content: errText }
                : m,
            ),
          );
        } else {
          lastFail.current = null;
          const reply = String(data.text);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === pendingId
                ? { ...m, pending: false, content: reply, applyText: reply }
                : m,
            ),
          );
        }
      } catch (e: any) {
        if (seq !== reqSeq.current) return;
        const aborted = e?.name === "AbortError" || /abort/i.test(String(e?.message || ""));
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId
              ? {
                  ...m,
                  pending: false,
                  error: true,
                  retryable: true,
                  content: aborted ? "درخواست لغو شد." : "ارتباط قطع شد. پیش‌نویس محفوظ است — دوباره بزن.",
                }
              : m,
          ),
        );
      } finally {
        if (seq === reqSeq.current) {
          setLoading(false);
          if (abortRef.current === ac) abortRef.current = null;
        }
      }
    },
    [loading, messages, workingText],
  );

  const retry = useCallback(() => {
    const fail = lastFail.current;
    if (!fail) return;
    setMessages((prev) => {
      const next = [...prev];
      while (next.length && next[next.length - 1].error) next.pop();
      if (next.length && next[next.length - 1].id === fail.userMsgId) next.pop();
      return next;
    });
    setTimeout(() => send(fail.topic, fail.mode, fail.wantDirections), 0);
  }, [send]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(draft);
    }
  };

  const newProject = () => {
    stop();
    setMessages([{ id: "welcome", role: "assistant", content: WELCOME }]);
    setDraft("");
    setWorkingText("");
    setBrain(emptyBrain());
    lastFail.current = null;
  };

  return (
    <div className="hn-root" dir="rtl">
      <header className="hn-bar">
        <div className="hn-bar-actions">
          <button type="button" className="hn-chip" onClick={newProject}>
            تازه
          </button>
          <button type="button" className="hn-chip" onClick={() => setShowDraft((v) => !v)}>
            {showDraft ? "چت" : "پیش‌نویس"}
          </button>
          <span className="hn-title">{brain.title}</span>
        </div>
        <div className="hn-brand">هیت‌نویس</div>
      </header>

      {showDraft ? (
        <div className="hn-draft-panel">
          <label className="hn-draft-label">پیش‌نویس فعلی (متن اصلیت محفوظ است)</label>
          <textarea
            className="hn-draft-area"
            value={workingText}
            onChange={(e) => {
              setWorkingText(e.target.value);
              setBrain((b) => ({
                ...b,
                currentDraft: e.target.value,
                originalDraft: b.originalDraft || e.target.value,
                updatedAt: new Date().toISOString(),
              }));
            }}
            placeholder="متن ترانه را اینجا بنویس یا از پاسخ‌ها اعمال کن…"
            rows={14}
          />
          <div className="hn-draft-actions">
            <button
              type="button"
              className="hn-chip"
              onClick={() => {
                if (!workingText.trim()) return;
                setBrain((b) => pushVersion(b, `نسخه ${b.versions.length + 1}`, workingText));
              }}
            >
              ذخیره نسخه
            </button>
            {brain.versions.slice(-5).reverse().map((v) => (
              <button
                key={v.id}
                type="button"
                className="hn-chip"
                title={v.createdAt}
                onClick={() => {
                  const restored = restoreVersion(brain, v.id);
                  if (restored) {
                    setBrain(restored);
                    setWorkingText(restored.currentDraft);
                  }
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="hn-thread" ref={listRef}>
          {messages.map((m) => (
            <div
              key={m.id}
              className={
                "hn-bubble " +
                (m.role === "user" ? "hn-user" : "hn-bot") +
                (m.error ? " hn-error" : "") +
                (m.pending ? " hn-pending" : "")
              }
            >
              <div className="hn-bubble-label">{m.role === "user" ? "تو" : "هیت‌نویس"}</div>
              <div className="hn-bubble-body" style={{ whiteSpace: "pre-wrap" }}>
                {m.content}
              </div>
              {m.error && m.retryable && (
                <button type="button" className="hn-retry" onClick={retry}>
                  تلاش دوباره
                </button>
              )}
              {!m.error && !m.pending && m.applyText && m.role === "assistant" && m.id !== "welcome" && (
                <div className="hn-apply-row">
                  <button type="button" className="hn-retry" onClick={() => applyToDraft(m.applyText!, "replace")}>
                    جایگزینی در پیش‌نویس
                  </button>
                  <button type="button" className="hn-retry" onClick={() => applyToDraft(m.applyText!, "append")}>
                    افزودن به پیش‌نویس
                  </button>
                  <button
                    type="button"
                    className="hn-retry"
                    onClick={() => {
                      void navigator.clipboard?.writeText(m.content);
                    }}
                  >
                    کپی
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="hn-composer">
        <div className="hn-quick">
          {QUICK.map((q) => (
            <button
              key={q.label}
              type="button"
              className="hn-chip"
              disabled={loading}
              onClick={() => {
                if (q.seed.endsWith(" ")) {
                  setDraft(q.seed);
                  taRef.current?.focus();
                } else {
                  void send(q.seed, q.mode, "directions" in q && q.directions);
                }
              }}
            >
              {q.label}
            </button>
          ))}
        </div>
        <div className="hn-input-row">
          <textarea
            ref={taRef}
            className="hn-input"
            rows={2}
            placeholder="پیامت را بنویس… مثلاً: این کورس خوبه ولی زیادی غمگینه"
            value={draft}
            disabled={loading}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
          />
          {loading ? (
            <button type="button" className="hn-send hn-stop" onClick={stop} title="لغو">
              ■
            </button>
          ) : (
            <button
              type="button"
              className="hn-send"
              disabled={!draft.trim()}
              onClick={() => void send(draft)}
              title="ارسال"
            >
              ↑
            </button>
          )}
        </div>
        <div className="hn-hint">Enter ارسال · Shift+Enter خط جدید · پیش‌نویس جدا از چت ذخیره می‌شود</div>
      </div>

      <style jsx>{`
        .hn-root {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: #0b0b0a;
          color: #f4f1ea;
          max-width: 720px;
          margin: 0 auto;
        }
        .hn-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          gap: 12px;
        }
        .hn-bar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .hn-title {
          font-size: 13px;
          opacity: 0.7;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .hn-brand {
          font-size: 13px;
          font-weight: 600;
          opacity: 0.85;
        }
        .hn-thread {
          flex: 1;
          overflow-y: auto;
          padding: 20px 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .hn-draft-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 16px;
          gap: 10px;
          min-height: 0;
        }
        .hn-draft-label {
          font-size: 12px;
          opacity: 0.6;
        }
        .hn-draft-area {
          flex: 1;
          min-height: 240px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          color: inherit;
          padding: 14px;
          font-size: 15px;
          line-height: 1.7;
          font-family: inherit;
          resize: vertical;
        }
        .hn-draft-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .hn-bubble {
          max-width: 92%;
          border-radius: 16px;
          padding: 12px 14px;
          line-height: 1.7;
          font-size: 15px;
        }
        .hn-bot {
          align-self: flex-start;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .hn-user {
          align-self: flex-end;
          background: rgba(234, 179, 8, 0.12);
          border: 1px solid rgba(234, 179, 8, 0.2);
        }
        .hn-error {
          border-color: rgba(248, 113, 113, 0.35);
          background: rgba(248, 113, 113, 0.08);
        }
        .hn-pending {
          opacity: 0.65;
        }
        .hn-bubble-label {
          font-size: 11px;
          opacity: 0.5;
          margin-bottom: 4px;
        }
        .hn-retry {
          margin-top: 8px;
          margin-left: 6px;
          font-size: 12px;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: transparent;
          color: inherit;
          cursor: pointer;
        }
        .hn-apply-row {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .hn-composer {
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding: 10px 12px 16px;
          background: #0b0b0a;
        }
        .hn-quick {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 10px;
        }
        .hn-chip {
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          color: inherit;
          cursor: pointer;
        }
        .hn-chip:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .hn-input-row {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }
        .hn-input {
          flex: 1;
          resize: none;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          color: inherit;
          padding: 12px 14px;
          font-size: 15px;
          line-height: 1.5;
          font-family: inherit;
        }
        .hn-input:focus {
          outline: none;
          border-color: rgba(234, 179, 8, 0.45);
        }
        .hn-send {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          background: #eab308;
          color: #0b0b0a;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          flex-shrink: 0;
        }
        .hn-send:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .hn-stop {
          background: rgba(248, 113, 113, 0.9);
          color: #fff;
        }
        .hn-hint {
          font-size: 11px;
          opacity: 0.4;
          margin-top: 6px;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
