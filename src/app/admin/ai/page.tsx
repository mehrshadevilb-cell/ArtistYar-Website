"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { withTimeout, isAbortError } from "@/lib/admin-ai-timeout";

type Tab = "chat" | "models" | "system";
type Message = { role: "user" | "assistant"; content: string; provider?: string | null; model?: string | null };
type Conversation = { id: string; title: string; archived: boolean; created_at: string; updated_at: string; messages?: Message[] };
type AiModel = {
  id: string;
  provider?: string;
  model?: string;
  enabled?: boolean;
  preferred?: boolean;
  priority?: number;
  status?: string;
};

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

async function modelsApi(body?: Record<string, unknown>) {
  const t = withTimeout(undefined, body ? 60000 : 25000);
  try {
    const response = await fetch("/api/admin/assistant/models", {
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

async function diagnosticsApi() {
  const t = withTimeout(undefined, 25000);
  try {
    const response = await fetch("/api/admin/diagnostics", {
      credentials: "include",
      cache: "no-store",
      signal: t.signal,
    });
    const text = await response.text();
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      throw new Error("پاسخ diagnostics نامعتبر است.");
    }
    if (response.status === 401 && typeof window !== "undefined") {
      window.location.assign(`/login?next=${encodeURIComponent("/admin/ai")}`);
    }
    if (!response.ok && !json.checks) throw new Error(json.error || json.message || `HTTP ${response.status}`);
    return json;
  } catch (e) {
    if (isAbortError(e)) throw new Error("زمان درخواست به پایان رسید. دوباره تلاش کنید.");
    throw e;
  } finally {
    t.clear();
  }
}

const TABS: { id: Tab; label: string }[] = [
  { id: "chat", label: "گفتگو" },
  { id: "models", label: "مدل‌ها" },
  { id: "system", label: "وضعیت سیستم" },
];

export default function AdminAiPage() {
  const [tab, setTab] = useState<Tab>("chat");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [models, setModels] = useState<AiModel[]>([]);
  const [modelsBusy, setModelsBusy] = useState(false);
  const [modelsError, setModelsError] = useState("");
  const [diag, setDiag] = useState<any>(null);
  const [diagError, setDiagError] = useState("");
  const [diagLoading, setDiagLoading] = useState(false);
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

  async function loadModels() {
    setModelsBusy(true);
    setModelsError("");
    try {
      const json = await modelsApi();
      setModels(json.models || []);
    } catch (e) {
      setModelsError(e instanceof Error ? e.message : "بارگذاری مدل‌ها ناموفق بود");
    } finally {
      setModelsBusy(false);
    }
  }

  async function loadDiag() {
    setDiagLoading(true);
    setDiagError("");
    try {
      setDiag(await diagnosticsApi());
    } catch (e) {
      setDiagError(e instanceof Error ? e.message : "دریافت وضعیت ناموفق بود");
    } finally {
      setDiagLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "models") void loadModels();
    if (tab === "system") void loadDiag();
  }, [tab]);

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

  async function syncModels() {
    setModelsBusy(true);
    setModelsError("");
    try {
      const json = await modelsApi({ action: "sync" });
      setModels(json.models || []);
    } catch (e) {
      setModelsError(e instanceof Error ? e.message : "همگام‌سازی ناموفق بود");
    } finally {
      setModelsBusy(false);
    }
  }

  async function toggleModel(model: AiModel, enabled: boolean) {
    setModelsBusy(true);
    setModelsError("");
    try {
      await modelsApi({ id: model.id, enabled });
      await loadModels();
    } catch (e) {
      setModelsError(e instanceof Error ? e.message : "به‌روزرسانی مدل ناموفق بود");
      setModelsBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-6xl flex-col gap-4 p-3 sm:p-4" dir="rtl">
      <header>
        <p className="text-[11px] uppercase tracking-wide text-ink-500">Admin AI</p>
        <h1 className="mt-1 text-lg font-medium text-sand-50">دستیار ادمین</h1>
        <p className="mt-1 text-xs text-ink-500">گفتگو · مدل‌ها · تشخیص سیستم</p>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1.5 text-xs transition ${
              tab === t.id ? "border border-gold-400/30 bg-gold-400/20 text-gold-300" : "border border-white/10 text-ink-400 hover:text-sand-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "chat" ? (
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
                    message.role === "user" ? "mr-auto bg-white/10 text-sand-50" : "ml-auto border border-white/10 bg-black/10 text-ink-200"
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
              {error ? <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-300">{error}</div> : null}
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
      ) : null}

      {tab === "models" ? (
        <section className="space-y-4 rounded-2xl border border-white/10 bg-black/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-sand-50">Model Registry</h2>
              <p className="mt-1 text-[11px] text-ink-500">مدل‌های فعال برای مسیریابی دستیار ادمین</p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-ghost !py-2 text-xs" onClick={() => void loadModels()} disabled={modelsBusy}>
                تازه‌سازی
              </button>
              <button type="button" className="btn-primary !py-2 text-xs" onClick={() => void syncModels()} disabled={modelsBusy}>
                Sync از env
              </button>
            </div>
          </div>
          {modelsError ? <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300">{modelsError}</p> : null}
          {modelsBusy && !models.length ? <p className="text-sm text-ink-500">در حال بارگذاری…</p> : null}
          <div className="space-y-2">
            {models.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-3 text-xs">
                <div className="min-w-0">
                  <p className="truncate font-medium text-sand-50" dir="ltr">
                    {m.provider || "?"} / {m.model || m.id}
                  </p>
                  <p className="mt-1 text-ink-500">
                    priority {m.priority ?? "—"} · {m.status || "—"}
                    {m.preferred ? " · preferred" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className={`btn-ghost !py-1.5 !px-3 text-[11px] ${m.enabled ? "!text-emerald-300" : "!text-ink-500"}`}
                  disabled={modelsBusy}
                  onClick={() => void toggleModel(m, !m.enabled)}
                >
                  {m.enabled ? "فعال" : "غیرفعال"}
                </button>
              </div>
            ))}
            {!modelsBusy && !models.length ? <p className="text-sm text-ink-500">مدلی ثبت نشده. Sync از env را بزن.</p> : null}
          </div>
        </section>
      ) : null}

      {tab === "system" ? (
        <section className="space-y-4 rounded-2xl border border-white/10 bg-black/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-sand-50">تشخیص سیستم</h2>
              <p className="mt-1 text-[11px] text-ink-500">همان چک‌های /admin/system — برای رفع سریع env</p>
            </div>
            <button type="button" className="btn-ghost !py-2 text-xs" onClick={() => void loadDiag()} disabled={diagLoading}>
              بررسی دوباره
            </button>
          </div>
          {diagError ? <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300">{diagError}</p> : null}
          {diagLoading && !diag ? <p className="text-sm text-ink-500">در حال بررسی…</p> : null}
          {diag ? (
            <div className={`rounded-xl border p-3 text-xs ${diag.ok ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-200" : "border-amber-400/20 bg-amber-400/5 text-amber-200"}`}>
              {diag.ok ? "همه چک‌ها سبز هستند." : "یک یا چند اتصال ناقص است."}
              {diag.backend ? <p className="mt-1 text-ink-500">backend: {diag.backend}</p> : null}
            </div>
          ) : null}
          <div className="space-y-2">
            {(diag?.checks || []).map((check: any) => (
              <div key={check.id} className="rounded-xl border border-white/10 p-3 text-xs">
                <p className={check.ok ? "text-emerald-300" : "text-red-300"}>
                  {check.ok ? "✓" : "✗"} {check.label}
                </p>
                <p className="mt-1 text-ink-400">{check.detail}</p>
              </div>
            ))}
          </div>
          <a href="/admin/system" className="btn-ghost inline-flex !py-2 text-xs">
            صفحه کامل وضعیت سیستم
          </a>
        </section>
      ) : null}
    </main>
  );
}
