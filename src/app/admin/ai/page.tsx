"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { withTimeout, isAbortError } from "@/lib/admin-ai-timeout";

type Message = { role: "user" | "assistant"; content: string; provider?: string | null; model?: string | null };
type Conversation = { id: string; title: string; archived: boolean; created_at: string; updated_at: string; messages?: Message[] };

async function readApiResponse(response: Response) {
  const text = await response.text();
  let json: Record<string, any> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  if (response.status === 401 && typeof window !== "undefined") {
    const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.assign(`/login?next=${encodeURIComponent(next)}`);
  }
  if (!response.ok || !json.ok) {
    throw new Error(json.error || (text && text.slice(0, 180)) || `خطای سرور (${response.status})`);
  }
  return json;
}

async function chatApi(body?: Record<string, unknown>, signal?: AbortSignal) {
  const t = withTimeout(signal, body ? 90000 : 25000);
  try {
    const response = await fetch("/api/admin/assistant", {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      credentials: "include",
      cache: "no-store",
      signal: t.signal,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return await readApiResponse(response);
  } catch (e) {
    if (isAbortError(e)) throw new Error("زمان درخواست به پایان رسید. دوباره تلاش کنید.");
    throw e;
  } finally {
    t.clear();
  }
}

export default function AdminAiPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  async function open(id: string) {
    if (sending) return;
    try {
      const json = await chatApi({ action: "get", conversationId: id });
      setActive(json.conversation);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    }
  }

  const loadChat = useCallback(async () => {
    try {
      setLoading(true);
      const json = await chatApi();
      setConversations(json.conversations || []);
      if (json.conversations?.[0]) await open(json.conversations[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChat();
  }, [loadChat]);

  async function create() {
    if (creating) return;
    try {
      setCreating(true);
      const json = await chatApi({ action: "create" });
      setConversations((items) => [json.conversation, ...items]);
      setActive({ ...json.conversation, messages: [] });
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    } finally {
      setCreating(false);
    }
  }

  async function send(event?: FormEvent) {
    event?.preventDefault();
    if (!active || !input.trim() || sending) return;
    const content = input.trim();
    const optimistic: Message = { role: "user", content };
    setActive((c) => (c ? { ...c, messages: [...(c.messages || []), optimistic] } : c));
    setInput("");
    setSending(true);
    setError("");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const json = await chatApi({ action: "message", conversationId: active.id, content }, controller.signal);
      setActive((c) => {
        if (!c || c.id !== active.id) return c;
        return { ...c, messages: [...(c.messages || []).filter((m) => m !== optimistic), optimistic, json.message] };
      });
    } catch (e) {
      setActive((c) => (c ? { ...c, messages: (c.messages || []).filter((m) => m !== optimistic) } : c));
      setInput(content);
      if (controller.signal.aborted) setError("ارسال لغو شد.");
      else setError(e instanceof Error ? e.message : "خطا");
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-6xl flex-col gap-4 p-3 sm:p-4" dir="rtl">
      <header>
        <p className="text-[11px] uppercase tracking-wide text-ink-500">Admin AI</p>
        <h1 className="mt-1 text-lg font-medium text-sand-50">دستیار ادمین</h1>
        <p className="mt-1 text-xs text-ink-500">گفتگو با timeout و بازیابی خطا</p>
      </header>

      <div className="grid min-h-[58vh] gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-2 rounded-2xl border border-white/10 bg-black/10 p-3">
          <button type="button" onClick={create} disabled={creating} className="btn-ghost w-full !py-2 text-xs">
            گفتگوی جدید
          </button>
          <div className="max-h-[50vh] space-y-1 overflow-y-auto">
            {conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => void open(c.id)}
                className={`block w-full rounded-xl px-3 py-2 text-right text-xs ${
                  active?.id === c.id ? "bg-white/10 text-sand-50" : "text-ink-400 hover:bg-white/5"
                }`}
              >
                {c.title || "گفتگو"}
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-h-[58vh] flex-col rounded-2xl border border-white/10 bg-black/10">
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {loading ? <p className="text-sm text-ink-500">در حال بارگذاری…</p> : null}
            {!loading && !(active?.messages || []).length ? (
              <div className="py-14 text-center">
                <h2 className="text-xl font-medium text-sand-50">چه کاری برایت انجام بدهم؟</h2>
                <button type="button" onClick={create} className="btn-primary mt-5">
                  شروع گفتگو
                </button>
              </div>
            ) : null}
            {(active?.messages || []).map((message, index) => (
              <div
                key={index}
                className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-7 ${
                  message.role === "user"
                    ? "mr-auto bg-white/10 text-sand-50"
                    : "ml-auto border border-white/10 bg-black/10 text-ink-200"
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.provider ? (
                  <div className="mt-2 text-[10px] text-ink-600">
                    {message.provider} · {message.model}
                  </div>
                ) : null}
              </div>
            ))}
            {error ? (
              <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-300">{error}</div>
            ) : null}
          </div>
          <form onSubmit={send} className="border-t border-white/10 p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/20 p-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={!active || sending}
                rows={2}
                placeholder={active ? "پیام خود را بنویس…" : "اول یک گفتگو بساز"}
                className="min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-sand-50 outline-none placeholder:text-ink-600"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              {sending ? (
                <button type="button" className="btn-ghost !py-2 text-xs" onClick={() => abortRef.current?.abort()}>
                  توقف
                </button>
              ) : (
                <button type="submit" disabled={!active || !input.trim()} className="btn-primary !py-2 text-xs">
                  ارسال
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
