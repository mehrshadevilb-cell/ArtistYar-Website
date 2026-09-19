"use client";

import { FormEvent, useMemo, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

export default function AdminAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const conversationId = useMemo(() => `admin-${Math.random().toString(36).slice(2, 14)}`, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next); setDraft(""); setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/assistant", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "x-rahyar-admin-conversation": conversationId }, body: JSON.stringify({ messages: next }) });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || "پاسخ آماده نشد.");
      setMessages((current) => [...current, { role: "assistant", content: String(data.reply || "پاسخی دریافت نشد.") }]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "خطا در ارتباط با دستیار."); }
    finally { setBusy(false); }
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl flex-col gap-5 p-4 sm:p-8" dir="rtl">
      <header className="rounded-3xl border border-gold-400/20 bg-black/20 p-6">
        <p className="eyebrow text-gold-400">RAHYAR ADMIN AI</p>
        <h1 className="mt-2 text-2xl font-semibold text-sand-50">دستیار مدیریتی راه‌یار</h1>
        <p className="mt-2 text-sm leading-7 text-ink-400">گفت‌وگوی مستقیم برای خلاصه‌سازی، بازنویسی، گزارش‌نویسی و تصمیم‌سازی عمومی. این فضا فقط برای Owner و Admin است.</p>
      </header>
      <main className="flex-1 space-y-3 rounded-3xl border border-white/10 bg-black/15 p-4 sm:p-6" aria-live="polite">
        {!messages.length ? <div className="grid min-h-64 place-items-center text-center text-sm text-ink-500">درخواست مدیریتی خود را بنویسید؛ مثلاً: «این متن را برای ارائه خلاصه کن.»</div> : messages.map((message, index) => <article key={`${message.role}-${index}`} className={`max-w-3xl rounded-2xl p-4 text-sm leading-7 ${message.role === "user" ? "mr-auto bg-gold-400/10 text-sand-50" : "ml-auto border border-white/10 bg-white/[.04] text-ink-200"}`}><div className="mb-1 text-[10px] text-ink-500">{message.role === "user" ? "شما" : "RahYar Admin AI"}</div>{message.content}</article>)}
        {busy ? <div className="text-xs text-ink-500">در حال آماده‌سازی پاسخ…</div> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </main>
      <form onSubmit={submit} className="flex gap-2 rounded-2xl border border-white/10 bg-black/20 p-2">
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} rows={2} maxLength={12000} placeholder="پیام مدیریتی خود را بنویسید…" className="min-w-0 flex-1 resize-none bg-transparent p-3 text-sm text-sand-50 outline-none placeholder:text-ink-600" aria-label="پیام دستیار مدیریتی" />
        <button disabled={busy || !draft.trim()} className="self-end rounded-xl bg-gold-400 px-4 py-3 text-sm font-medium text-ink-950 disabled:opacity-40">ارسال</button>
      </form>
    </section>
  );
}
