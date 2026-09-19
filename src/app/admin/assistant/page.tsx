"use client";

import { FormEvent, useEffect, useState } from "react";

type Message = { role: "user" | "assistant"; content: string; provider?: string | null; model?: string | null };
type Conversation = { id: string; title: string; archived: boolean; created_at: string; updated_at: string; messages?: Message[] };

async function api(body?: Record<string, unknown>, query = "") {
  const response = await fetch(`/api/admin/assistant${query}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    credentials: "include",
    cache: "no-store",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.ok) throw new Error(json.error || "خطا");
  return json;
}

export default function AdminAssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function open(id: string) {
    try {
      const json = await api({ action: "get", conversationId: id });
      setActive(json.conversation);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    }
  }

  async function load() {
    try {
      setLoading(true);
      const json = await api();
      setConversations(json.conversations || []);
      if (json.conversations?.[0]) await open(json.conversations[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function create() {
    try {
      const json = await api({ action: "create" });
      setConversations((items) => [json.conversation, ...items]);
      setActive({ ...json.conversation, messages: [] });
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    }
  }

  async function send(event?: FormEvent) {
    event?.preventDefault();
    if (!input.trim() || !active || sending) return;

    const text = input.trim();
    setInput("");
    setSending(true);
    setError("");
    setActive((current) => current ? { ...current, messages: [...(current.messages || []), { role: "user", content: text }] } : current);

    try {
      const json = await api({ action: "message", conversationId: active.id, content: text });
      setActive((current) => current ? { ...current, messages: [...(current.messages || []), json.message] } : current);
      setConversations((items) => items.map((item) => item.id === active.id ? { ...item, updated_at: new Date().toISOString() } : item));
    } catch (e) {
      setError(e instanceof Error ? e.message : "ارسال پیام ناموفق بود");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-7rem)] overflow-hidden rounded-2xl border border-white/10 bg-black/20" dir="rtl">
      <aside className="hidden w-72 shrink-0 border-l border-white/10 bg-black/20 p-3 md:block">
        <button onClick={create} className="btn-primary mb-3 w-full">+ گفتگوی جدید</button>
        <div className="space-y-1 overflow-y-auto">
          {conversations.filter((item) => !item.archived).map((item) => (
            <button key={item.id} onClick={() => open(item.id)} className={`w-full rounded-xl px-3 py-3 text-right text-xs transition ${active?.id === item.id ? "bg-white/10 text-sand-50" : "text-ink-400 hover:bg-white/5"}`}>
              {item.title}
            </button>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h1 className="text-sm font-medium text-sand-50">RahYar Admin AI Assistant</h1>
            <p className="text-[11px] text-ink-500">دستیار مدیریتی · فقط Admin</p>
          </div>
          <button onClick={create} className="btn-ghost !py-2 text-xs md:hidden">گفتگوی جدید</button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {loading ? <p className="text-sm text-ink-500">در حال بارگذاری…</p> : !active ? (
            <div className="mx-auto max-w-xl py-16 text-center">
              <h2 className="text-xl font-medium text-sand-50">چه کاری برایت انجام بدهم؟</h2>
              <p className="mt-2 text-sm leading-7 text-ink-500">خلاصه‌سازی، بازنویسی، گزارش و کمک عمومی مدیریتی.</p>
              <button onClick={create} className="btn-primary mt-5">شروع گفتگو</button>
            </div>
          ) : (active.messages || []).length === 0 ? (
            <div className="mx-auto max-w-xl py-16 text-center">
              <h2 className="text-xl font-medium text-sand-50">چه کاری برایت انجام بدهم؟</h2>
              <p className="mt-2 text-sm leading-7 text-ink-500">این دستیار از User Chat Bot و ابزارهای تخصصی جداست.</p>
            </div>
          ) : (active.messages || []).map((message, index) => (
            <div key={index} className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-7 ${message.role === "user" ? "mr-auto bg-white/10 text-sand-50" : "ml-auto border border-white/10 bg-black/10 text-ink-200"}`}>
              <div className="whitespace-pre-wrap">{message.content}</div>
              {message.provider ? <div className="mt-2 text-[10px] text-ink-600">{message.provider} · {message.model}</div> : null}
            </div>
          ))}
          {error ? <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-300">{error}</div> : null}
        </div>

        <form onSubmit={send} className="border-t border-white/10 p-3 sm:p-4">
          <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/20 p-2">
            <textarea value={input} onChange={(event) => setInput(event.target.value)} disabled={!active || sending} rows={2} placeholder="پیامت را برای دستیار مدیریتی بنویس…" className="min-h-12 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-sand-50 outline-none placeholder:text-ink-600" />
            <button disabled={!active || sending || !input.trim()} className="btn-primary shrink-0 !px-4">{sending ? "…" : "ارسال"}</button>
          </div>
        </form>
      </section>
    </main>
  );
}