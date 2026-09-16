"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { SectionHeading } from "@/components/SectionHeading";

type Msg = { role: "user" | "assistant"; text: string };

const SUGGESTIONS = [
  "دوره‌های میکس و مسترینگ چی دارید؟",
  "چطور در کلاس آنلاین ثبت‌نام کنم؟",
  "Cubase برای شروع کافیه یا Studio One؟",
  "تفاوت تنظیم و میکس چیه؟",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "سلام؛ من دستیار آموزشی آرتیست‌یار هستم (همان موتور ربات راه‌یار). درباره دوره‌ها، کلاس‌ها و موضوعات موسیقی بپرس.",
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const clientId = useMemo(() => {
    if (typeof window === "undefined") return "ssr";
    const key = "ay_assistant_client";
    let id = localStorage.getItem(key);
    if (!id) {
      id = `c_${Math.random().toString(36).slice(2)}_${Date.now()}`;
      localStorage.setItem(key, id);
    }
    return id;
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function sendMessage(message: string) {
    const text = message.trim();
    if (!text || busy) return;
    setLastError(false);
    setMessages((m) => [...m, { role: "user", text }]);
    setBusy(true);
    try {
      const res = await fetch("/api/rahyar/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, client_id: clientId }),
      });
      const data = await res.json().catch(() => ({}));
      const reply =
        data.reply ||
        data.error ||
        data.detail ||
        (res.ok
          ? "پاسخی دریافت نشد. اتصال به ربات را بررسی کنید."
          : `خطای سرور (${res.status}). دوباره تلاش کنید.`);
      setMessages((m) => [...m, { role: "assistant", text: String(reply) }]);
      if (!res.ok && !data.reply) setLastError(true);
    } catch {
      setLastError(true);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "خطای شبکه. اتصال اینترنت یا آدرس RAHYAR_API_URL را بررسی کنید.",
        },
      ]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const message = String(fd.get("message") || "");
    e.currentTarget.reset();
    await sendMessage(message);
  }

  return (
    <section className="container-ay py-16">
      <SectionHeading
        eyebrow="AI Assistant"
        title="دستیار آموزشی"
        subtitle="همان Chat Assistant ربات راه‌یار — کاتالوگ، دانش آکادمی و پاسخ فارسی مینیمال."
      />

      <div className="card-ay mx-auto mt-10 flex max-w-2xl flex-col overflow-hidden">
        <div className="max-h-[28rem] space-y-3 overflow-y-auto p-5">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`rounded-2xl px-4 py-3 text-sm leading-7 ${
                m.role === "user"
                  ? "mr-8 bg-gold-500/15 text-sand-50"
                  : "ml-8 bg-white/[0.04] text-ink-300"
              }`}
            >
              {m.text}
            </div>
          ))}
          {busy ? (
            <div className="ml-8 rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-ink-500">
              <span className="inline-flex gap-1">
                <span className="animate-pulse">●</span>
                <span className="animate-pulse [animation-delay:120ms]">●</span>
                <span className="animate-pulse [animation-delay:240ms]">●</span>
              </span>
              <span className="mr-2 text-xs">در حال فکر کردن…</span>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        {messages.length <= 1 && !busy ? (
          <div className="flex flex-wrap gap-2 border-t border-white/[0.06] px-4 pt-3">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-ink-300 transition hover:border-gold-500/40 hover:text-sand-50"
                onClick={() => sendMessage(s)}
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {lastError ? (
          <div className="border-t border-white/[0.06] px-4 pt-2 text-xs text-red-400">
            اتصال به backend برقرار نشد. RAHYAR_API_URL را در env سایت چک کنید.
          </div>
        ) : null}

        <form
          onSubmit={onSubmit}
          className="flex gap-2 border-t border-white/[0.06] p-4"
        >
          <input
            ref={inputRef}
            className="input-ay flex-1"
            name="message"
            placeholder="سؤالت را بنویس..."
            disabled={busy}
            maxLength={1000}
            autoComplete="off"
          />
          <button type="submit" className="btn-primary !px-5" disabled={busy}>
            {busy ? "..." : "ارسال"}
          </button>
        </form>
      </div>
    </section>
  );
}
