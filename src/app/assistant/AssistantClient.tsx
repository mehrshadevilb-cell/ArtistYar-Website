"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Check,
  CheckCircle2,
  Clipboard,
  Lightbulb,
  MessageCircle,
  Music2,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";
import { MarkdownContent } from "@/components/MarkdownContent";

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
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
            text: typeof data.error === "string" && !data.error.includes("<!DOCTYPE") ? `اتصال راه‌یار خطا داد: ${data.error}` : "در حال حاضر اتصال راه‌یار به مدل هوش مصنوعی آماده نیست. می‌توانی چند لحظه دیگر دوباره امتحان کنی.",
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
    connection === "ready"
      ? "آنلاین"
      : connection === "loading"
        ? "در حال بررسی"
        : "آماده‌سازی اتصال";

  return (
    <section className="assistant-stage container-ay relative py-10 sm:py-16">
      <div className="assistant-stage-lines" aria-hidden="true">
        <i /><i /><i /><i /><i />
      </div>
      <div className="mx-auto max-w-6xl">
        <div className="assistant-intro mb-8 flex flex-col gap-6 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-500/20 bg-gold-500/[0.08] px-3 py-1.5 text-xs text-gold-300">
              <Music2 size={14} aria-hidden="true" />
              <span>دستیار آموزشی آرتیست‌یار</span>
            </div>
            <h1 className="text-3xl font-semibold leading-[1.45] tracking-tight text-sand-50 sm:text-5xl">
              سؤالت را بپرس؛
              <span className="gold-shimmer block">با هم حلش می‌کنیم.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-8 text-ink-300 sm:text-base">
              از تنظیم و میکس تا مسترینگ و مسیر یادگیری، راه‌یار کمک می‌کند سؤال بعدی‌ات را به یک قدم عملی تبدیل کنی.
            </p>
          </div>
          <div className="hidden items-center gap-2 text-xs text-ink-500 sm:flex">
            <ShieldCheck size={15} className="text-gold-500" aria-hidden="true" />
            پاسخ‌ها با تمرکز روی مسیر یادگیری تو
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <div className="assistant-console overflow-hidden rounded-[1.75rem] border border-white/[0.09] bg-[#11110f]/90 shadow-[0_30px_80px_-45px_rgba(0,0,0,.9)] backdrop-blur-xl">
            <div className="assistant-console-header flex items-center justify-between border-b border-white/[0.07] px-4 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold-500 text-ink-950 shadow-[0_10px_25px_-12px_rgba(201,162,39,.9)]">
                  <Bot size={22} aria-hidden="true" />
                  <span className={`absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full border-2 border-[#11110f] ${connection === "ready" ? "bg-emerald-400" : connection === "loading" ? "bg-gold-300" : "bg-ink-500"}`} aria-label={statusLabel} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-semibold text-sand-50">راه‌یار AI</h2>
                    <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-ink-400">BETA</span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-500">
                    {connection === "ready" ? <Wifi size={12} aria-hidden="true" /> : <WifiOff size={12} aria-hidden="true" />}
                    {connectionNote || statusLabel}
                  </p>
                </div>
              </div>
              <div className="assistant-audio-meter hidden items-end gap-0.5 sm:flex" aria-hidden="true">
                <i /><i /><i /><i /><i /><i /><i />
              </div>
              <button type="button" onClick={resetChat} disabled={busy} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-ink-300 transition hover:border-gold-500/40 hover:text-gold-300 disabled:cursor-not-allowed disabled:opacity-40">
                <Plus size={15} aria-hidden="true" />
                <span className="hidden sm:inline">گفت‌وگوی جدید</span>
                <span className="sm:hidden">جدید</span>
              </button>
            </div>

            <div className="assistant-chat-scroll assistant-console-scroll min-h-[22rem] max-h-[38rem] space-y-6 overflow-y-auto px-4 py-6 sm:px-6" aria-live="polite" aria-busy={busy}>
              {messages.map((message) => (
                <div key={message.id} className={`group flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${message.role === "user" ? "bg-white/[0.08] text-ink-300" : message.error ? "bg-red-400/10 text-red-300" : "bg-gold-500/15 text-gold-400"}`}>
                    {message.role === "user" ? <MessageCircle size={15} aria-hidden="true" /> : <Bot size={15} aria-hidden="true" />}
                  </div>
                  <div className={`max-w-[88%] sm:max-w-[78%] ${message.role === "user" ? "items-start" : "items-end"}`}>
                    <div className={`rounded-2xl px-4 py-3.5 text-sm leading-7 ${message.role === "user" ? "rounded-tr-md bg-gold-500/[0.14] text-sand-50" : message.error ? "rounded-tl-md border border-red-400/20 bg-red-400/[0.06] text-sand-100" : "rounded-tl-md bg-white/[0.045] text-ink-200"}`}>
                      {message.role === "assistant" && !message.error ? (
                        <MarkdownContent text={message.text} />
                      ) : (
                        <p className="leading-7">{message.text}</p>
                      )}
                    </div>
                    <div className={`mt-1.5 flex items-center gap-2 px-1 text-[10px] text-ink-600 ${message.role === "user" ? "justify-start" : "justify-end"}`}>
                      <span>{message.role === "user" ? "شما" : "راه‌یار"}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatTime()}</span>
                      {message.role === "assistant" && !message.error ? (
                        <button type="button" onClick={() => copyMessage(message)} className="inline-flex items-center gap-1 text-ink-500 opacity-0 transition hover:text-gold-300 group-hover:opacity-100 focus:opacity-100" aria-label="کپی پاسخ">
                          {copiedId === message.id ? <Check size={12} aria-hidden="true" /> : <Clipboard size={12} aria-hidden="true" />}
                          {copiedId === message.id ? "کپی شد" : "کپی"}
                        </button>
                      ) : null}
                    </div>
                    {message.error && message.retryText ? (
                      <button type="button" onClick={() => sendMessage(message.retryText || "")} disabled={busy} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-red-400/20 px-2.5 py-1.5 text-xs text-red-300 transition hover:border-red-300/40 hover:bg-red-400/[0.06] disabled:opacity-40">
                        <RotateCcw size={13} aria-hidden="true" />
                        تلاش دوباره
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}

              {busy ? (
                <div className="flex gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gold-500/15 text-gold-400"><Bot size={15} aria-hidden="true" /></div>
                  <div className="rounded-2xl rounded-tl-md bg-white/[0.045] px-4 py-3 text-sm text-ink-400">
                    <span className="inline-flex items-center gap-1" aria-label="راه‌یار در حال فکر کردن است">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-400" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-400 [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-400 [animation-delay:240ms]" />
                    </span>
                    <span className="mr-2 text-xs">راه‌یار در حال فکر کردن است…</span>
                  </div>
                </div>
              ) : null}
              <div ref={bottomRef} />
            </div>

            {messages.length === 1 && !busy ? (
              <div className="border-t border-white/[0.07] px-4 py-4 sm:px-6">
                <div className="mb-3 flex items-center gap-2 text-xs text-ink-500">
                  <Lightbulb size={14} className="text-gold-500" aria-hidden="true" />
                  از اینجا شروع کن
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button key={suggestion.text} type="button" onClick={() => sendMessage(suggestion.text)} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3 text-right text-xs text-ink-300 transition hover:border-gold-500/35 hover:bg-gold-500/[0.06] hover:text-sand-50">
                      <span>{suggestion.text}</span>
                      <span className="shrink-0 text-[10px] text-gold-500">{suggestion.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="border-t border-white/[0.07] p-3 sm:p-4">
              <div className="rounded-2xl border border-white/[0.1] bg-white/[0.03] transition focus-within:border-gold-500/50 focus-within:bg-gold-500/[0.035] focus-within:shadow-[0_0_0_4px_rgba(201,162,39,.08)]">
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
                  className="min-h-[3.25rem] w-full resize-none bg-transparent px-4 pt-3 text-sm leading-7 text-sand-50 outline-none placeholder:text-ink-600"
                  name="message"
                  placeholder="مثلاً: چرا میکسم کدر شده؟"
                  disabled={busy}
                  maxLength={1000}
                  rows={2}
                  aria-label="پیام شما برای راه‌یار"
                  autoComplete="off"
                />
                <div className="flex items-center justify-between gap-3 px-3 pb-3">
                  <span className="text-[10px] text-ink-600">Enter برای ارسال · Shift + Enter برای خط جدید</span>
                  <button type="submit" className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-gold-500 px-3.5 text-xs font-medium text-ink-950 transition hover:bg-gold-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40" disabled={busy || !draft.trim()}>
                    {busy ? "در حال ارسال" : "ارسال"}
                    <Send size={14} className="rotate-180" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </form>
          </div>

          <aside className="space-y-3 lg:sticky lg:top-28">
            <div className="card-ay p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-sand-50">
                <Sparkles size={16} className="text-gold-400" aria-hidden="true" />
                راه‌یار چه کمکی می‌کند؟
              </div>
              <ul className="space-y-3 text-xs leading-6 text-ink-300">
                {[
                  "عیب‌یابی میکس و مسترینگ",
                  "توضیح مفاهیم با زبان ساده",
                  "پیشنهاد قدم بعدی برای تمرین",
                  "راهنمای انتخاب مسیر آموزشی",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="mt-1 shrink-0 text-gold-500" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-sand-100">حریم خصوصی</p>
                  <p className="mt-2 text-[11px] leading-6 text-ink-500">پیام‌های این گفت‌وگو فقط برای ادامه همین مسیر استفاده می‌شوند.</p>
                </div>
                <ShieldCheck size={17} className="shrink-0 text-ink-500" aria-hidden="true" />
              </div>
            </div>
            {connection === "offline" ? (
              <div className="flex items-start gap-2 rounded-2xl border border-gold-500/20 bg-gold-500/[0.06] p-4 text-[11px] leading-6 text-ink-300">
                <WifiOff size={15} className="mt-0.5 shrink-0 text-gold-400" aria-hidden="true" />
                <span>اتصال هوش مصنوعی در حال آماده‌سازی است؛ رابط کاربری آماده است و می‌توانی بعداً دوباره امتحان کنی.</span>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </section>
  );
}
