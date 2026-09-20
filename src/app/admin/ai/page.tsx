"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type Tab = "chat" | "dev" | "skills" | "models" | "memory" | "connectors" | "cost";
type Message = { role: "user" | "assistant"; content: string; provider?: string | null; model?: string | null };
type Conversation = { id: string; title: string; archived: boolean; created_at: string; updated_at: string; messages?: Message[] };

async function chatApi(body?: Record<string, unknown>, query = "", signal?: AbortSignal) {
  const response = await fetch(`/api/admin/assistant${query}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    credentials: "include",
    cache: "no-store",
    signal,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.ok) throw new Error(json.error || "خطا");
  return json;
}

async function platform(section?: string, body?: Record<string, unknown>, signal?: AbortSignal) {
  const url = section && !body ? `/api/admin/ai-platform?section=${section}` : "/api/admin/ai-platform";
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    credentials: "include",
    cache: "no-store",
    signal,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.ok) throw new Error(json.error || "خطا");
  return json;
}

const TABS: { id: Tab; label: string; hashes: string[] }[] = [
  { id: "chat", label: "چت", hashes: ["chat", "assistant"] },
  { id: "dev", label: "Dev Agent", hashes: ["dev", "development-agent", "coding-agent"] },
  { id: "skills", label: "Skills", hashes: ["skills"] },
  { id: "models", label: "مدل‌ها", hashes: ["models"] },
  { id: "memory", label: "حافظه", hashes: ["memory"] },
  { id: "connectors", label: "اتصال‌ها", hashes: ["connectors"] },
  { id: "cost", label: "هزینه", hashes: ["cost", "usage"] },
];

function tabFromHash(hash: string): Tab | null {
  const key = hash.replace(/^#/, "").trim().toLowerCase();
  if (!key) return null;
  const found = TABS.find((t) => t.hashes.includes(key) || t.id === key);
  return found?.id ?? null;
}

function hashForTab(id: Tab): string {
  if (id === "dev") return "#development-agent";
  return `#${id}`;
}

export default function AdminAiPlatformPage() {
  const [tab, setTab] = useState<Tab>("chat");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [skills, setSkills] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [memory, setMemory] = useState<any[]>([]);
  const [connectors, setConnectors] = useState<any[]>([]);
  const [usage, setUsage] = useState<any>(null);
  const [devTask, setDevTask] = useState("");
  const [devSkill, setDevSkill] = useState("bugfix");
  const [devParallel, setDevParallel] = useState(false);
  const [devApply, setDevApply] = useState(false);
  const [devRunning, setDevRunning] = useState(false);
  const [devResult, setDevResult] = useState<any>(null);
  const [memKey, setMemKey] = useState("");
  const [memValue, setMemValue] = useState("");
  const [platformError, setPlatformError] = useState("");
  const hashSynced = useRef(false);

  useEffect(() => {
    const apply = () => {
      const fromHash = tabFromHash(window.location.hash);
      if (fromHash) setTab(fromHash);
    };
    apply();
    hashSynced.current = true;
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  useEffect(() => {
    if (!hashSynced.current) return;
    const next = hashForTab(tab);
    if (window.location.hash !== next) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${next}`);
    }
  }, [tab]);

  function selectTab(id: Tab) {
    setTab(id);
  }

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

  async function loadChat() {
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
  }

  useEffect(() => {
    void loadChat();
  }, []);

  const loadSection = useCallback(async (id: Tab) => {
    if (id === "chat") return;
    setPlatformError("");
    try {
      if (id === "skills" || id === "dev") setSkills((await platform("skills")).skills || []);
      if (id === "models") setModels((await platform("models")).models || []);
      if (id === "memory") setMemory((await platform("memory")).memory || []);
      if (id === "connectors") setConnectors((await platform("connectors")).connectors || []);
      if (id === "cost") setUsage((await platform("cost")).usage || null);
    } catch (e) {
      setPlatformError(e instanceof Error ? e.message : "خطا");
    }
  }, []);

  useEffect(() => {
    void loadSection(tab);
  }, [tab, loadSection]);

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
      const json = await chatApi({ action: "message", conversationId: active.id, content }, "", controller.signal);
      setActive((c) => {
        if (!c || c.id !== active.id) return c;
        return { ...c, messages: [...(c.messages || []).filter((m) => m !== optimistic), optimistic, json.message] };
      });
    } catch (e) {
      setActive((c) => (c ? { ...c, messages: (c.messages || []).filter((m) => m !== optimistic) } : c));
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "خطا");
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }

  async function runDev() {
    if (!devTask.trim() || devRunning) return;
    setDevRunning(true);
    setDevResult(null);
    setPlatformError("");
    try {
      const json = await platform(undefined, {
        action: "dev_run",
        task: devTask.trim(),
        skillId: devSkill,
        parallel: devParallel,
        apply: devApply,
      });
      setDevResult(json.result);
      if (json.error) setPlatformError(json.error);
      if (json.result && !json.result.ok && json.result.error) {
        setPlatformError(json.result.error);
      }
    } catch (e) {
      setPlatformError(e instanceof Error ? e.message : "خطا");
    } finally {
      setDevRunning(false);
    }
  }

  async function syncModels() {
    try {
      setPlatformError("");
      setModels((await platform(undefined, { action: "sync_models" })).models || []);
    } catch (e) {
      setPlatformError(e instanceof Error ? e.message : "خطا");
    }
  }

  async function saveMemory() {
    if (!memKey.trim() || !memValue.trim()) return;
    try {
      await platform(undefined, { action: "memory_upsert", scope: "project", key: memKey.trim(), value: memValue.trim() });
      setMemKey("");
      setMemValue("");
      setMemory((await platform("memory")).memory || []);
    } catch (e) {
      setPlatformError(e instanceof Error ? e.message : "خطا");
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-6xl flex-col gap-4 p-3 sm:p-4">
      <header>
        <h1 className="text-lg font-medium text-sand-50">Admin AI Platform</h1>
        <p className="text-xs text-ink-500">چت · Dev Agent · Skills · مدل‌ها · حافظه · اتصال‌ها · هزینه</p>
      </header>
      <nav className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => selectTab(t.id)}
            className={`rounded-full px-3 py-1.5 text-xs transition ${
              tab === t.id
                ? "bg-gold-400/20 text-gold-300 border border-gold-400/30"
                : "border border-white/10 text-ink-400 hover:text-sand-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {platformError ? (
        <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-300">{platformError}</div>
      ) : null}

      {tab === "chat" ? (
        <div className="grid min-h-[60vh] gap-4 lg:grid-cols-[240px_1fr]">
          <aside className="hidden space-y-2 rounded-2xl border border-white/10 bg-black/10 p-3 lg:block">
            <button onClick={create} disabled={creating} className="btn-ghost w-full !py-2 text-xs">
              گفتگوی جدید
            </button>
            <div className="max-h-[50vh] space-y-1 overflow-y-auto">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => open(c.id)}
                  className={`block w-full rounded-xl px-3 py-2 text-right text-xs ${
                    active?.id === c.id ? "bg-white/10 text-sand-50" : "text-ink-400 hover:bg-white/5"
                  }`}
                >
                  {c.title || "گفتگو"}
                </button>
              ))}
            </div>
          </aside>
          <section className="flex min-h-[60vh] flex-col rounded-2xl border border-white/10 bg-black/10">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {loading ? <p className="text-sm text-ink-500">در حال بارگذاری…</p> : null}
              {!loading && !(active?.messages || []).length ? (
                <div className="py-16 text-center">
                  <h2 className="text-xl font-medium text-sand-50">چه کاری برایت انجام بدهم؟</h2>
                  <p className="mt-2 text-sm text-ink-500">برای کدنویسی برو تب Dev Agent</p>
                  <button onClick={create} className="btn-primary mt-5">
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
                  placeholder="پیام مدیریتی…"
                  className="min-h-12 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-sand-50 outline-none"
                />
                <button
                  type={sending ? "button" : "submit"}
                  onClick={sending ? () => abortRef.current?.abort() : undefined}
                  disabled={!active || (!sending && !input.trim())}
                  className="btn-primary shrink-0 !px-4"
                >
                  {sending ? "توقف" : "ارسال"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {tab === "dev" ? (
        <section className="space-y-4 rounded-2xl border border-white/10 bg-black/10 p-4">
          <div>
            <h2 className="text-base font-medium text-sand-50">Dev Agent · Bugfix / Feature / PR</h2>
            <p className="mt-1 text-xs leading-6 text-ink-500">
              کد را می‌خواند، تحلیل می‌کند و در صورت تأیید Draft PR می‌سازد. مستقیم روی main نمی‌نویسد.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-xs">
            <label className="flex items-center gap-2 text-ink-400">
              Skill
              <select
                value={devSkill}
                onChange={(e) => setDevSkill(e.target.value)}
                disabled={devRunning}
                className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sand-50"
              >
                {(skills.length
                  ? skills
                  : [
                      { id: "bugfix", name: "Bug Fix" },
                      { id: "feature", name: "Feature" },
                      { id: "code-review", name: "Review" },
                    ]
                ).map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-ink-400">
              <input type="checkbox" checked={devParallel} onChange={(e) => setDevParallel(e.target.checked)} disabled={devRunning} />
              Parallel (تا ۳ مدل)
            </label>
            <label className="flex items-center gap-2 text-ink-400" title="فقط Draft PR روی branch جدا">
              <input type="checkbox" checked={devApply} onChange={(e) => setDevApply(e.target.checked)} disabled={devRunning} />
              اعمال روی Draft PR
            </label>
          </div>

          {devApply ? (
            <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[11px] leading-5 text-amber-200/90">
              با فعال بودن «اعمال»، اگر مدل فایل‌هایی با فرمت file:path پیشنهاد دهد، یک branch جدا و Draft PR ساخته می‌شود.
            </p>
          ) : null}

          <textarea
            value={devTask}
            onChange={(e) => setDevTask(e.target.value)}
            disabled={devRunning}
            rows={5}
            placeholder="مثلاً: باگ X را در src/lib پیدا و fix کن… یا یک feature کوچک برای …"
            className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-sand-50 outline-none placeholder:text-ink-600"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void runDev();
              }
            }}
          />

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={runDev} disabled={devRunning || !devTask.trim()} className="btn-primary">
              {devRunning ? "در حال اجرا…" : "▶ اجرای Dev Agent"}
            </button>
            {devRunning ? (
              <span className="text-[11px] text-ink-500">خواندن repo · فراخوانی مدل · پیشنهاد فایل / PR</span>
            ) : (
              <span className="text-[11px] text-ink-600">Ctrl/⌘ + Enter</span>
            )}
          </div>

          {devResult ? (
            <div
              className={`space-y-3 rounded-2xl border p-4 text-xs leading-6 ${
                devResult.ok
                  ? "border-emerald-400/20 bg-emerald-400/5 text-ink-300"
                  : "border-red-400/20 bg-red-400/5 text-red-200"
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className={`font-medium ${devResult.ok ? "text-emerald-300" : "text-red-300"}`}>
                  {devResult.ok ? "نتیجه آماده" : "اجرا ناموفق"}
                </span>
                {devResult.pullRequest?.url ? (
                  <a href={devResult.pullRequest.url} target="_blank" rel="noreferrer" className="text-emerald-400 underline">
                    Draft PR #{devResult.pullRequest.number}
                    {devResult.pullRequest.draft ? " (draft)" : ""}
                  </a>
                ) : null}
              </div>

              {devResult.filesRead?.length ? (
                <p>
                  <span className="text-ink-500">خوانده‌شده: </span>
                  {devResult.filesRead.map((f: any) => f.path).join(" · ")}
                </p>
              ) : null}

              {devResult.proposedFiles?.length ? (
                <p>
                  <span className="text-ink-500">پیشنهادی: </span>
                  {devResult.proposedFiles.map((f: any) => f.path).join(" · ")}
                </p>
              ) : null}

              {devResult.parallel?.length ? (
                <div className="space-y-1">
                  <p className="text-ink-500">Parallel summaries:</p>
                  {devResult.parallel.map((p: any, i: number) => (
                    <p key={i} className="text-[11px] text-ink-400">
                      {p.provider}/{p.model}: {String(p.summary || "").slice(0, 180)}
                      {String(p.summary || "").length > 180 ? "…" : ""}
                    </p>
                  ))}
                </div>
              ) : null}

              {devResult.error ? <p className="text-red-300">{devResult.error}</p> : null}

              {devResult.analysis ? (
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-3 text-[11px] text-ink-300">
                  {devResult.analysis}
                </pre>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "skills" ? (
        <section className="grid gap-3 sm:grid-cols-2">
          {skills.map((s: any) => (
            <div key={s.id} className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-sand-50">{s.name}</h3>
                <span className="text-[10px] text-emerald-400">{s.enabled ? "فعال" : "خاموش"}</span>
              </div>
              <p className="mt-2 text-xs leading-6 text-ink-500">{s.description}</p>
              <p className="mt-2 text-[10px] text-ink-600">
                v{s.version} · {(s.tools || []).join(", ")}
              </p>
            </div>
          ))}
        </section>
      ) : null}

      {tab === "models" ? (
        <section className="space-y-3">
          <button type="button" onClick={syncModels} className="btn-ghost !py-2 text-xs">
            Sync + فعال‌سازی خودکار
          </button>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {models.map((m: any) => (
              <div key={m.id} className="rounded-xl border border-white/10 bg-black/10 p-3 text-xs">
                <p className="text-sand-50">
                  {m.provider_id} / {m.model_id}
                </p>
                <p className="mt-1 text-ink-500">
                  {m.status} · {m.enabled ? "enabled" : "off"} · p{m.priority}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "memory" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              value={memKey}
              onChange={(e) => setMemKey(e.target.value)}
              placeholder="کلید"
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-sand-50"
            />
            <input
              value={memValue}
              onChange={(e) => setMemValue(e.target.value)}
              placeholder="مقدار"
              className="min-w-[220px] flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-sand-50"
            />
            <button type="button" onClick={saveMemory} className="btn-primary !py-2 text-xs">
              ذخیره
            </button>
          </div>
          {memory.map((m: any) => (
            <div key={m.id} className="rounded-xl border border-white/10 bg-black/10 p-3 text-xs text-ink-300">
              <span className="text-sand-50">
                [{m.scope}] {m.key}
              </span>
              <div className="mt-1 whitespace-pre-wrap">{m.value}</div>
            </div>
          ))}
        </section>
      ) : null}

      {tab === "connectors" ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {connectors.map((c: any) => (
            <div key={c.id} className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm text-sand-50">{c.name}</h3>
                <span className={`text-[10px] ${c.status === "connected" ? "text-emerald-400" : "text-amber-400"}`}>
                  {c.status}
                </span>
              </div>
              {c.detail?.login ? (
                <p className="mt-2 text-xs text-ink-500">
                  @{c.detail.login} · {c.detail.owner}/{c.detail.repo}
                </p>
              ) : null}
              {c.detail?.error ? <p className="mt-2 text-xs text-red-300">{c.detail.error}</p> : null}
            </div>
          ))}
        </section>
      ) : null}

      {tab === "cost" ? (
        <section className="space-y-3 rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-ink-300">
          {usage ? (
            <>
              <p>
                ۳۰ روز · درخواست‌ها: <b className="text-sand-50">{usage.count}</b>
              </p>
              <p>
                توکن in/out: <b className="text-sand-50">{usage.totalIn}</b> /{" "}
                <b className="text-sand-50">{usage.totalOut}</b>
              </p>
              <p>
                برآورد هزینه: <b className="text-gold-300">${Number(usage.totalCost || 0).toFixed(4)}</b>
              </p>
            </>
          ) : (
            <p className="text-ink-500">هنوز usage ثبت نشده.</p>
          )}
        </section>
      ) : null}
    </main>
  );
}
