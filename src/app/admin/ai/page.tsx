"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type Tab = "chat" | "dev" | "skills" | "models" | "memory" | "connectors" | "cost" | "control";
type ControlRecord = Record<string, unknown>;
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

async function chatApi(body?: Record<string, unknown>, query = "", signal?: AbortSignal) {
  const response = await fetch(`/api/admin/assistant${query}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    credentials: "include",
    cache: "no-store",
    signal,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return readApiResponse(response);
}

async function control(section?: string, body?: Record<string, unknown>, signal?: AbortSignal) {
  const url = section && !body ? `/api/admin/ai-control?section=${encodeURIComponent(section)}` : "/api/admin/ai-control";
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    credentials: "include",
    cache: "no-store",
    signal,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return readApiResponse(response);
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
  return readApiResponse(response);
}

const TABS: { id: Tab; label: string; hashes: string[] }[] = [
  { id: "chat", label: "چت", hashes: ["chat", "assistant"] },
  { id: "dev", label: "Dev Agent", hashes: ["dev", "development-agent", "coding-agent"] },
  { id: "skills", label: "Skills", hashes: ["skills"] },
  { id: "models", label: "مدل‌ها", hashes: ["models"] },
  { id: "memory", label: "حافظه", hashes: ["memory"] },
  { id: "connectors", label: "اتصال‌ها", hashes: ["connectors"] },
  { id: "cost", label: "هزینه", hashes: ["cost", "usage"] },
  { id: "control", label: "کنترل AI", hashes: ["control", "control-plane", "ai-control"] },
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
  const [sectionLoading, setSectionLoading] = useState(false);
  const [controlData, setControlData] = useState<ControlRecord[]>([]);
  const [controlSection, setControlSection] = useState("providers");
  const [controlBusy, setControlBusy] = useState(false);
  const [promptDraft, setPromptDraft] = useState({ agent_id: "admin-assistant", task_id: "chat", version: "1", system_prompt: "", developer_instructions: "", user_template: "", changelog: "" });
  const [playground, setPlayground] = useState({ agentId: "admin-assistant", taskId: "chat", message: "", running: false, result: null as any });
  const [activity, setActivity] = useState<Array<{ id: string; at: string; kind: string; message: string; detail?: string }>>([]);
  const [skillUrl, setSkillUrl] = useState("");
  const [skillInstalling, setSkillInstalling] = useState(false);
  const hashSynced = useRef(false);
  const sectionRequestRef = useRef(0);
  const activityPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  async function refreshActivity() {
    try {
      const result = await platform("activity");
      setActivity(result.activity || []);
    } catch {
      /* ignore */
    }
  }

  const loadSection = useCallback(async (id: Tab) => {
    if (id === "chat") return;
    const requestId = ++sectionRequestRef.current;
    setPlatformError("");
    setSectionLoading(true);
    try {
      if (id === "skills" || id === "dev") {
        const result = await platform("skills");
        if (requestId === sectionRequestRef.current) setSkills(result.skills || []);
      }
      if (id === "models") {
        const result = await platform("models");
        if (requestId === sectionRequestRef.current) setModels(result.models || []);
      }
      if (id === "memory") {
        const result = await platform("memory");
        if (requestId === sectionRequestRef.current) setMemory(result.memory || []);
      }
      if (id === "connectors") {
        const result = await platform("connectors");
        if (requestId === sectionRequestRef.current) setConnectors(result.connectors || []);
      }
      if (id === "cost") {
        const result = await platform("cost");
        if (requestId === sectionRequestRef.current) setUsage(result.usage || null);
      }
      if (id === "control") {
        const result = await control(controlSection);
        if (requestId === sectionRequestRef.current) {
          const key = controlSection;
          const value = result[key];
          if (key === "usage" && value && typeof value === "object") {
            setControlData(
              Object.entries(value as Record<string, unknown>).map(([period, data]) => ({
                period,
                ...(data && typeof data === "object" ? (data as Record<string, unknown>) : {}),
              })),
            );
          } else {
            setControlData(Array.isArray(value) ? (value as ControlRecord[]) : []);
          }
        }
      }
      if (id === "dev") await refreshActivity();
    } catch (e) {
      if (requestId === sectionRequestRef.current) setPlatformError(e instanceof Error ? e.message : "خطا");
    } finally {
      if (requestId === sectionRequestRef.current) setSectionLoading(false);
    }
  }, [controlSection]);

  useEffect(() => {
    void loadSection(tab);
  }, [tab, loadSection, controlSection]);

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
    if (activityPollRef.current) clearInterval(activityPollRef.current);
    activityPollRef.current = setInterval(() => {
      void refreshActivity();
    }, 1500);
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
      if (json.result && !json.result.ok && json.result.error) setPlatformError(json.result.error);
      await refreshActivity();
    } catch (e) {
      setPlatformError(e instanceof Error ? e.message : "خطا");
    } finally {
      setDevRunning(false);
      if (activityPollRef.current) {
        clearInterval(activityPollRef.current);
        activityPollRef.current = null;
      }
      await refreshActivity();
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

  async function installSkill() {
    if (!skillUrl.trim() || skillInstalling) return;
    setSkillInstalling(true);
    setPlatformError("");
    try {
      const json = await platform(undefined, { action: "skill_install", url: skillUrl.trim() });
      setSkills(json.skills || []);
      setSkillUrl("");
      await refreshActivity();
    } catch (e) {
      setPlatformError(e instanceof Error ? e.message : "خطا");
    } finally {
      setSkillInstalling(false);
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
        <p className="text-xs text-ink-500">چت · Dev Agent · Skills · مدل‌ها · حافظه · اتصال‌ها · مانیتور</p>
      </header>
      <nav className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => selectTab(t.id)}
            className={`rounded-full px-3 py-1.5 text-xs transition ${
              tab === t.id ? "bg-gold-400/20 text-gold-300 border border-gold-400/30" : "border border-white/10 text-ink-400 hover:text-sand-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {platformError ? <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-300">{platformError}</div> : null}

      {tab === "chat" ? (
        <div className="grid min-h-[60vh] gap-4 lg:grid-cols-[240px_1fr]">
          <aside className="hidden space-y-2 rounded-2xl border border-white/10 bg-black/10 p-3 lg:block">
            <button onClick={create} disabled={creating} className="btn-ghost w-full !py-2 text-xs">گفتگوی جدید</button>
            <div className="max-h-[50vh] space-y-1 overflow-y-auto">
              {conversations.map((c) => (
                <button key={c.id} type="button" onClick={() => open(c.id)} className={`block w-full rounded-xl px-3 py-2 text-right text-xs ${active?.id === c.id ? "bg-white/10 text-sand-50" : "text-ink-400 hover:bg-white/5"}`}>
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
                  <button onClick={create} className="btn-primary mt-5">شروع گفتگو</button>
                </div>
              ) : null}
              {(active?.messages || []).map((message, index) => (
                <div key={index} className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-7 ${message.role === "user" ? "mr-auto bg-white/10 text-sand-50" : "ml-auto border border-white/10 bg-black/10 text-ink-200"}`}>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  {message.provider ? <div className="mt-2 text-[10px] text-ink-600">{message.provider} · {message.model}</div> : null}
                </div>
              ))}
              {error ? <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-300">{error}</div> : null}
            </div>
            <form onSubmit={send} className="border-t border-white/10 p-3">
              <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/20 p-2">
                <textarea value={input} onChange={(e) => setInput(e.target.value)} disabled={!active || sending} rows={2} placeholder="پیام مدیریتی…" className="min-h-12 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-sand-50 outline-none" />
                <button type={sending ? "button" : "submit"} onClick={sending ? () => abortRef.current?.abort() : undefined} disabled={!active || (!sending && !input.trim())} className="btn-primary shrink-0 !px-4">{sending ? "توقف" : "ارسال"}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {tab === "dev" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
          <section className="space-y-3 rounded-2xl border border-white/10 bg-black/10 p-4">
            <h2 className="text-sm font-medium text-sand-50">Dev Agent</h2>
            <textarea value={devTask} onChange={(e) => setDevTask(e.target.value)} rows={5} placeholder="تسک کدنویسی…" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-sand-50 outline-none" />
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="flex items-center gap-2 text-ink-400">
                Skill
                <select value={devSkill} onChange={(e) => setDevSkill(e.target.value)} className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sand-50">
                  {(skills.length ? skills : [{ id: "bugfix", name: "Bug Fix" }, { id: "feature", name: "Feature" }, { id: "code-review", name: "Code Review" }, { id: "docs", name: "Docs" }, { id: "refactor", name: "Refactor" }]).map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name || s.id}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-ink-400"><input type="checkbox" checked={devParallel} onChange={(e) => setDevParallel(e.target.checked)} /> parallel</label>
              <label className="flex items-center gap-2 text-ink-400"><input type="checkbox" checked={devApply} onChange={(e) => setDevApply(e.target.checked)} /> Draft PR</label>
              <button type="button" onClick={runDev} disabled={devRunning || !devTask.trim()} className="btn-primary !py-2 text-xs">{devRunning ? "در حال اجرا…" : "اجرای Dev Agent"}</button>
            </div>
            {devResult ? (
              <div className="max-h-[40vh] space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-ink-300">
                {devResult.pullRequest ? <p className="text-emerald-400">PR #{devResult.pullRequest.number}: <a className="underline" href={devResult.pullRequest.url} target="_blank" rel="noreferrer">{devResult.pullRequest.url}</a></p> : null}
                <pre className="whitespace-pre-wrap leading-6">{devResult.analysis || devResult.plan || JSON.stringify(devResult, null, 2)}</pre>
              </div>
            ) : null}
          </section>
          <aside className="flex max-h-[70vh] flex-col rounded-2xl border border-white/10 bg-black/10 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-medium text-sand-50">مانیتور زنده</h3>
              <button type="button" onClick={() => void refreshActivity()} className="text-[10px] text-ink-500 hover:text-sand-50">بروز</button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto">
              {!activity.length ? <p className="text-[11px] text-ink-600">هنوز رویدادی نیست.</p> : null}
              {activity.map((ev) => (
                <div key={ev.id} className="rounded-lg border border-white/5 bg-black/20 px-2 py-1.5 text-[10px]">
                  <div className="flex justify-between gap-1">
                    <span className={ev.kind === "error" ? "text-red-300" : ev.kind === "done" ? "text-emerald-400" : "text-gold-300"}>{ev.kind}</span>
                    <span className="text-ink-600">{ev.at?.slice(11, 19)}</span>
                  </div>
                  <p className="mt-0.5 text-ink-300">{ev.message}</p>
                  {ev.detail ? <p className="mt-0.5 truncate text-ink-600">{ev.detail}</p> : null}
                </div>
              ))}
            </div>
          </aside>
        </div>
      ) : null}

      {tab === "skills" ? (
        <section className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
            <h3 className="mb-2 text-sm font-medium text-sand-50">نصب Skill از GitHub</h3>
            <p className="mb-3 text-[11px] text-ink-500">لینک raw یا blob به SKILL.md یا skill.json</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={skillUrl} onChange={(e) => setSkillUrl(e.target.value)} placeholder="https://github.com/owner/repo/blob/main/SKILL.md" className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-sand-50" />
              <button type="button" onClick={installSkill} disabled={skillInstalling || !skillUrl.trim()} className="btn-primary !py-2 text-xs">{skillInstalling ? "در حال نصب…" : "نصب"}</button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {skills.map((s: any) => (
              <div key={s.id} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-sand-50">{s.name}</h3>
                  <span className="text-[10px] text-emerald-400">{s.enabled ? "فعال" : "خاموش"}</span>
                </div>
                <p className="mt-2 text-xs leading-6 text-ink-500">{s.description}</p>
                <p className="mt-2 text-[10px] text-ink-600">v{s.version} · {(s.tools || []).join(", ")}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "models" ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-sand-50">مدل‌ها</h2>
            <button type="button" onClick={syncModels} className="btn-ghost !py-1.5 text-xs">Sync از env</button>
          </div>
          {sectionLoading ? <p className="text-xs text-ink-500">در حال بارگذاری…</p> : null}
          <div className="grid gap-2 sm:grid-cols-2">
            {models.map((m: any) => (
              <div key={m.id} className="rounded-xl border border-white/10 bg-black/10 p-3 text-xs">
                <div className="font-medium text-sand-50">{m.display_name || m.model_id}</div>
                <div className="mt-1 text-ink-500">{m.provider_id} · priority {m.priority}</div>
                <div className="mt-1 text-ink-600">{m.enabled ? "فعال" : "خاموش"} · {m.status}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "memory" ? (
        <section className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={memKey} onChange={(e) => setMemKey(e.target.value)} placeholder="key" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-sand-50" />
            <input value={memValue} onChange={(e) => setMemValue(e.target.value)} placeholder="value" className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-sand-50" />
            <button type="button" onClick={saveMemory} className="btn-primary !py-2 text-xs">ذخیره</button>
          </div>
          <div className="space-y-2">
            {memory.map((item: any) => (
              <div key={item.id} className="rounded-xl border border-white/10 bg-black/10 p-3 text-xs">
                <div className="text-sand-50">{item.key}</div>
                <div className="mt-1 text-ink-400">{item.value}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "connectors" ? (
        <section className="grid gap-3 sm:grid-cols-2">
          {connectors.map((c: any) => (
            <div key={c.id} className="rounded-2xl border border-white/10 bg-black/10 p-4 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sand-50">{c.name}</h3>
                <span className={c.status === "connected" ? "text-emerald-400" : "text-ink-500"}>{c.status}</span>
              </div>
              {c.hint ? <p className="mt-2 text-ink-500">{c.hint}</p> : null}
            </div>
          ))}
        </section>
      ) : null}

      {tab === "cost" ? (
        <section className="rounded-2xl border border-white/10 bg-black/10 p-4 text-xs text-ink-300">
          <pre className="whitespace-pre-wrap">{usage ? JSON.stringify(usage, null, 2) : "داده‌ای نیست"}</pre>
        </section>
      ) : null}

      {tab === "control" ? (
        <section className="space-y-3 text-xs text-ink-400">
          <p>کنترل AI — بخش پیشرفته</p>
          <pre className="overflow-auto rounded-xl border border-white/10 bg-black/20 p-3">{JSON.stringify(controlData, null, 2)}</pre>
        </section>
      ) : null}
    </main>
  );
}
