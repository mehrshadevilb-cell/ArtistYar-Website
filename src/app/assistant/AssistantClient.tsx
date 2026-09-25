"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import * as Lucide from "lucide-react";
import { MarkdownContent } from "@/components/MarkdownContent";

function SafeIcon({
  name,
  size = 16,
  className,
  ...props
}: {
  name: keyof typeof Lucide;
  size?: number;
  className?: string;
  [key: string]: unknown;
}) {
  const Icon = Lucide[name] as ComponentType<{ size?: number; className?: string; [key: string]: unknown }> | undefined;
  return Icon ? <Icon size={size} className={className} {...props} /> : <span aria-hidden="true" className={className} />;
}

const WELCOME_MESSAGE =
  "سلام، من راه‌یارم. درباره تنظیم، میکس، مسترینگ، ملودی و دوره‌های آرتیست‌یار هر سؤالی داری بپرس؛ با هم قدم‌به‌قدم جلو می‌ریم.";

const SUGGESTIONS = [
  { label: "شروع میکس", text: "برای شروع میکس از کجا برم؟" },
  { label: "تنظیم یا میکس؟", text: "تفاوت تنظیم و میکس دقیقاً چیه؟" },
  { label: "وکال تمیز", text: "چطور وکال تمیزتری داشته باشم؟" },
  { label: "مفاهیم پایه", text: "بیت‌دپت و سمپل‌ریت یعنی چی؟" },
];

type Msg = {
  id: number;
  role: "user" | "assistant";
  text: string;
  error?: boolean;
  retryText?: string;
};

type ConnectionState = "loading" | "ready" | "offline";

function formatTime() {
  return new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: 1, role: "assistant", text: WELCOME_MESSAGE },
  ]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("ready");
  const [connectionNote, setConnectionNote] = useState("آماده پاسخ‌گویی");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

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
    const preferSmooth =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px) and (prefers-reduced-motion: no-preference)").matches;
    bottomRef.current?.scrollIntoView({
      behavior: preferSmooth ? "smooth" : "auto",
      block: "nearest",
    });
  }, [messages, busy]);

  function resetChat() {
    if (busy) return;
    setMessages([{ id: Date.now(), role: "assistant", text: WELCOME_MESSAGE }]);
    setDraft("");
    setCopiedId(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function copyMessage(message: Msg) {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setCopiedId(null);
    }
  }

  async function sendMessage(message: string) {
    const text = message.trim();
    if (!text || busy) return;
    setDraft("");
    const userMessage: Msg = { id: Date.now(), role: "user", text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setBusy(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          client_id: clientId,
          messages: nextMessages
            .filter((item) => !item.error)
            .map((item) => ({ role: item.role, content: item.text })),
        }),
      });
      const contentType = res.headers.get("content-type") || "";
      const raw = await res.text();
      let data: { reply?: unknown; error?: unknown } = {};
      if (contentType.includes("application/json")) {
        try {
          data = JSON.parse(raw) as typeof data;
        } catch {
          data = {};
        }
      } else if (raw) {
        data = { error: raw.slice(0, 300) };
      }
      const reply = typeof data.reply === "string" ? data.reply : "";

      if (res.ok && reply) {
        setConnection("ready");
        setConnectionNote("آماده پاسخ‌گویی");
        setMessages((current) => [
          ...current,
          { id: Date.now() + 1, role: "assistant", text: reply },
        ]);
      } else {
        setConnection("offline");
        setConnectionNote("اتصال در حال آماده‌سازی است");
        setMessages((current) => [
          ...current,
          {
            id: Date.now() + 1,
            role: "assistant",
            error: true,
            retryText: text,
            text:
              typeof data.error === "string" && !data.error.includes("<!DOCTYPE")
                ? `اتصال راه‌یار خطا داد: ${data.error}`
                : "در حال حاضر اتصال راه‌یار به مدل هوش مصنوعی آماده نیست. می‌توانی چند لحظه دیگر دوباره امتحان کنی.",
          },
        ]);
      }
    } catch {
      setConnection("offline");
      setConnectionNote("اتصال در دسترس نیست");
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          error: true,
          retryText: text,
          text: "ارتباط با راه‌یار برقرار نشد. اتصال اینترنت را بررسی کن و دوباره تلاش کن.",
        },
      ]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessage(draft);
  }

  const statusLabel =
    connection === "ready" ? "آنلاین" : connection === "loading" ? "در حال بررسی" : "آماده‌سازی اتصال";

  const isEmpty = messages.length === 1 && !busy;

  return (
    <section className="assistant-shell relative mx-auto flex w-full max-w-3xl flex-col px-4 pb-6 pt-6 sm:px-6 sm:pb-10 sm:pt-10">
      <header className="mb-5 flex items-center justify-between gap-3 sm:mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gold-500 text-ink-950">
              <SafeIcon name="Bot" size={20} aria-hidden="true" />
              <span
                className={`absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg,#0b0b0a)] ${
                  connection === "ready"
                    ? "bg-emerald-400"
                    : connection === "loading"
                      ? "bg-gold-300"
                      : "bg-ink-500"
                }`}
                aria-label={statusLabel}
              />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight text-sand-50 sm:text-lg">
                راه‌یار AI
              </h1>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-500">
                {connection === "ready" ? (
                  <SafeIcon name="Wifi" size={12} aria-hidden="true" />
                ) : (
                  <SafeIcon name="WifiOff" size={12} aria-hidden="true" />
                )}
                {connectionNote || statusLabel}
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={resetChat}
          disabled={busy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-ink-300 transition hover:border-gold-500/35 hover:text-gold-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SafeIcon name="Plus" size={14} aria-hidden="true" />
          <span className="hidden sm:inline">گفت‌وگوی جدید</span>
          <span className="sm:hidden">جدید</span>
        </button>
      </header>

      <div className="flex min-h-[min(70dvh,36rem)] flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#11110f]/92 shadow-[0_24px_64px_-40px_rgba(0,0,0,.85)] backdrop-blur-md sm:min-h-[min(72dvh,40rem)]">
        <div
          ref={scrollRef}
          className="assistant-chat-scroll flex-1 space-y-5 overflow-y-auto overscroll-contain px-3.5 py-5 sm:px-5 sm:py-6"
          aria-live="polite"
          aria-busy={busy}
        >
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center gap-5 px-2 py-8 text-center sm:py-12">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gold-500/12 text-gold-400">
                <SafeIcon name="Music2" size={26} aria-hidden="true" />
              </div>
              <div className="max-w-sm">
                <p className="text-base font-medium leading-7 text-sand-50">
                  سؤالت را بپرس؛ با هم حلش می‌کنیم.
                </p>
                <p className="mt-2 text-sm leading-7 text-ink-400">
                  از تنظیم و میکس تا مسترینگ و مسیر یادگیری — قدم بعدی را پیدا کن.
                </p>
              </div>
              <div className="grid w-full max-w-md gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion.text}
                    type="button"
                    onClick={() => sendMessage(suggestion.text)}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3 text-right text-xs leading-6 text-ink-300 transition hover:border-gold-500/30 hover:bg-gold-500/[0.06] hover:text-sand-50"
                  >
                    <span className="block text-[10px] text-gold-500/90">{suggestion.label}</span>
                    <span className="mt-0.5 block">{suggestion.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`assistant-msg group flex gap-2.5 ${
                  message.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                    message.role === "user"
                      ? "bg-white/[0.08] text-ink-300"
                      : message.error
                        ? "bg-red-400/10 text-red-300"
                        : "bg-gold-500/15 text-gold-400"
                  }`}
                >
                  {message.role === "user" ? (
                    <SafeIcon name="MessageCircle" size={14} aria-hidden="true" />
                  ) : (
                    <SafeIcon name="Bot" size={14} aria-hidden="true" />
                  )}
                </div>
                <div className={`max-w-[90%] sm:max-w-[82%]`}>
                  <div
                    className={`rounded-2xl px-3.5 py-3 text-sm leading-7 ${
                      message.role === "user"
                        ? "rounded-tr-md bg-gold-500/[0.14] text-sand-50"
                        : message.error
                          ? "rounded-tl-md border border-red-400/20 bg-red-400/[0.06] text-sand-100"
                          : "rounded-tl-md bg-white/[0.04] text-ink-200"
                    }`}
                  >
                    {message.role === "assistant" && !message.error ? (
                      <MarkdownContent text={message.text} />
                    ) : (
                      <p className="leading-7">{message.text}</p>
                    )}
                  </div>
                  <div
                    className={`mt-1.5 flex items-center gap-2 px-1 text-[10px] text-ink-600 ${
                      message.role === "user" ? "justify-start" : "justify-end"
                    }`}
                  >
                    <span>{message.role === "user" ? "شما" : "راه‌یار"}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatTime()}</span>
                    {message.role === "assistant" && !message.error ? (
                      <button
                        type="button"
                        onClick={() => copyMessage(message)}
                        className="inline-flex items-center gap-1 text-ink-500 opacity-0 transition hover:text-gold-300 group-hover:opacity-100 focus:opacity-100"
                        aria-label="کپی پاسخ"
                      >
                        {copiedId === message.id ? (
                          <SafeIcon name="Check" size={12} aria-hidden="true" />
                        ) : (
                          <SafeIcon name="Clipboard" size={12} aria-hidden="true" />
                        )}
                        {copiedId === message.id ? "کپی شد" : "کپی"}
                      </button>
                    ) : null}
                  </div>
                  {message.error && message.retryText ? (
                    <button
                      type="button"
                      onClick={() => sendMessage(message.retryText || "")}
                      disabled={busy}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-red-400/20 px-2.5 py-1.5 text-xs text-red-300 transition hover:border-red-300/40 hover:bg-red-400/[0.06] disabled:opacity-40"
                    >
                      <SafeIcon name="RotateCcw" size={13} aria-hidden="true" />
                      تلاش دوباره
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}

          {busy ? (
            <div className="assistant-msg flex gap-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gold-500/15 text-gold-400">
                <SafeIcon name="Bot" size={14} aria-hidden="true" />
              </div>
              <div className="rounded-2xl rounded-tl-md bg-white/[0.04] px-3.5 py-3 text-sm text-ink-400">
                <span className="inline-flex items-center gap-1" aria-label="راه‌یار در حال فکر کردن است">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-400" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-400 [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-400 [animation-delay:240ms]" />
                </span>
                <span className="mr-2 text-xs">در حال فکر کردن…</span>
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onSubmit} className="border-t border-white/[0.07] p-3 sm:p-4">
          <div className="rounded-2xl border border-white/[0.1] bg-white/[0.03] transition focus-within:border-gold-500/45 focus-within:bg-gold-500/[0.03] focus-within:shadow-[0_0_0_3px_rgba(201,162,39,.08)]">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              className="min-h-[3rem] w-full resize-none bg-transparent px-3.5 pt-3 text-sm leading-7 text-sand-50 outline-none placeholder:text-ink-600 sm:px-4"
              name="message"
              placeholder="مثلاً: چرا میکسم کدر شده؟"
              disabled={busy}
              maxLength={1000}
              rows={2}
              aria-label="پیام به راه‌یار"
            />
            <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5 sm:px-3 sm:pb-3">
              <span className="text-[10px] text-ink-600 tabular-nums">{draft.length}/1000</span>
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gold-500 px-3.5 py-2 text-xs font-medium text-ink-950 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "در حال ارسال" : "ارسال"}
                <SafeIcon name="Send" size={14} className="rotate-180" aria-hidden="true" />
              </button>
            </div>
          </div>
          <p className="mt-2 px-1 text-center text-[10px] leading-5 text-ink-600">
            راه‌یار راهنمای آموزشی است؛ برای تصمیم‌های حرفه‌ای پروژه خودت را هم بررسی کن.
          </p>
        </form>
      </div>
    </section>
  );
}
