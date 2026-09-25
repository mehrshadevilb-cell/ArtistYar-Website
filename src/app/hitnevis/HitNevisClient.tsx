"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Role = "user" | "assistant" | "system";
type Msg = {
  id: string;
  role: Role;
  content: string;
  pending?: boolean;
  error?: boolean;
  retryable?: boolean;
};

const QUICK = [
  { label: "ترانه کامل", mode: "write_full", seed: "یه ترانه کامل درباره " },
  { label: "کورس قوی", mode: "write_chorus", seed: "یه کورس قوی و ماندگار بساز" },
  { label: "ادامه بده", mode: "continue", seed: "ادامه‌ش بده" },
  { label: "بهترش کن", mode: "improve", seed: "این قسمت رو بهتر کن" },
  { label: "کلیشه‌ها", mode: "anti_cliche", seed: "کلیشه‌هاشو پیدا کن و جایگزین پیشنهاد بده" },
  { label: "تحلیل DNA", mode: "hit_dna", seed: "تحلیل Hit DNA این متن رو بده" },
] as const;

const WELCOME =
  "سلام — من همکار ترانه‌نویسی‌ات هستم.\n\nهر چی تو ذهنته بگو: ایده، یک خط، حس، یا «این کورس رو قوی‌تر کن».\nبدون فرم و تنظیمات اضافه، همین‌جا با هم پیش می‌ریم.\n\nمتن اصلیت بدون اجازه‌ات عوض نمی‌شه.";

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function detectMode(text: string): string {
  const t = text.trim();
  const rules: { mode: string; re: RegExp }[] = [
    { mode: "hit_dna", re: /hit\s*dna|هیت\s*دی\s*ان\s*ای|تحلیل\s*(الگو|ساختاری)/i },
    { mode: "anti_cliche", re: /کلیشه/ },
    { mode: "critic", re: /نقد|منتقد/ },
    { mode: "hook_lab", re: /هوک|قلاب|hook/i },
    { mode: "continue", re: /ادامه‌?ش\s*بده|ادامه\s*بده|از\s*اینجا\s*ادامه/ },
    { mode: "rewrite", re: /بازنویس|از\s*نو\s*بنویس/ },
    { mode: "improve", re: /بهتر\s*کن|قوی‌?تر\s*کن|اصلاح\s*کن/ },
    { mode: "shorten", re: /کوتاه|فشرده|خلاصه\s*کن/ },
    { mode: "emotional", re: /احساسی‌?تر|عمیق‌?تر/ },
    { mode: "write_chorus", re: /کورس|هوک\s*بساز/ },
    { mode: "write_full", re: /ترانه\s*کامل|یه\s*آهنگ\s*کامل/ },
  ];
  for (const r of rules) if (r.re.test(t)) return r.mode;
  return "chat";
}

export default function HitNevisClient() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: "welcome", role: "assistant", content: WELCOME },
  ]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("ترانه بدون عنوان");

  const listRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  /** Monotonic request id — only the latest response may mutate loading/messages. */
  const reqSeq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  /** Last failed payload for retry */
  const lastFail = useRef<{
    mode: string;
    topic: string;
    history: { role: "user" | "assistant"; content: string }[];
    userMsgId: string;
  } | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    // Do not clear loading here if a newer request owns the seq — handled in send
  }, []);

  const send = useCallback(
    async (raw: string, forcedMode?: string) => {
      const text = raw.trim();
      if (!text || loading) return;

      const mode = forcedMode || detectMode(text);
      const userMsg: Msg = { id: uid(), role: "user", content: text };
      const pendingId = uid();

      // History for API: prior turns (exclude welcome system-like and pending)
      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .filter((m) => m.id !== "welcome" && !m.pending && !m.error)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
        .slice(-14);

      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: pendingId, role: "assistant", content: "…", pending: true },
      ]);
      setDraft("");
      setLoading(true);

      // Cancel previous in-flight request (replaced, not user cancel)
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const seq = ++reqSeq.current;

      lastFail.current = { mode, topic: text, history, userMsgId: userMsg.id };

      try {
        const res = await fetch("/api/hitnevis/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            topic: text.slice(0, 500),
            constraints: text.slice(0, 800),
            language: "fa",
            conversationHistory: history,
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

        // Stale response — ignore
        if (seq !== reqSeq.current) return;

        if (!data?.ok || !data?.text) {
          const errText =
            data?.error ||
            (ac.signal.aborted
              ? "درخواست لغو شد."
              : "الان نتونستم جواب بدم. متنت سر جاشه — دوباره بزن.");
          setMessages((prev) =>
            prev.map((m) =>
              m.id === pendingId
                ? {
                    ...m,
                    pending: false,
                    error: true,
                    retryable: data?.retryable !== false,
                    content: errText,
                  }
                : m,
            ),
          );
        } else {
          lastFail.current = null;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === pendingId
                ? { ...m, pending: false, content: String(data.text) }
                : m,
            ),
          );
        }
      } catch (e: any) {
        if (seq !== reqSeq.current) return;
        const aborted = e?.name === "AbortError" || /abort/i.test(String(e?.message || ""));
        // If we aborted because a newer request replaced us, stay silent
        if (aborted && seq !== reqSeq.current) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId
              ? {
                  ...m,
                  pending: false,
                  error: true,
                  retryable: true,
                  content: aborted
                    ? "درخواست لغو شد."
                    : "ارتباط قطع شد. پیش‌نویس محفوظ است — دوباره بزن.",
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
    [loading, messages],
  );

  const retry = useCallback(() => {
    const fail = lastFail.current;
    if (!fail) return;
    // Remove trailing error assistant bubble then resend same topic
    setMessages((prev) => {
      const next = [...prev];
      while (next.length && next[next.length - 1].error) next.pop();
      // also drop the user msg we'll re-add
      if (next.length && next[next.length - 1].id === fail.userMsgId) next.pop();
      return next;
    });
    // slight delay so state settles
    setTimeout(() => send(fail.topic, fail.mode), 0);
  }, [send]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(draft);
    }
  };

  return (
    <div className="hn-root" dir="rtl">
      <header className="hn-bar">
        <div className="hn-bar-actions">
          <button
            type="button"
            className="hn-chip"
            onClick={() => {
              stop();
              setMessages([{ id: "welcome", role: "assistant", content: WELCOME }]);
              setDraft("");
              setTitle("ترانه بدون عنوان");
              lastFail.current = null;
            }}
          >
            تازه
          </button>
          <span className="hn-title">{title}</span>
        </div>
        <div className="hn-brand">هیت‌نویس</div>
      </header>

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
            <div className="hn-bubble-label">
              {m.role === "user" ? "تو" : "هیت‌نویس"}
            </div>
            <div className="hn-bubble-body" style={{ whiteSpace: "pre-wrap" }}>
              {m.content}
            </div>
            {m.error && m.retryable && (
              <button type="button" className="hn-retry" onClick={retry}>
                تلاش دوباره
              </button>
            )}
          </div>
        ))}
      </div>

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
                  void send(q.seed, q.mode);
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
            placeholder="پیامت را بنویس…"
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
        <div className="hn-hint">Enter ارسال · Shift+Enter خط جدید</div>
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
          letter-spacing: 0.02em;
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
          font-size: 12px;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: transparent;
          color: inherit;
          cursor: pointer;
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
