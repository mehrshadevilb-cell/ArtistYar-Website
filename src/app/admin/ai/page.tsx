"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type Tab = "chat" | "project" | "plugins" | "models" | "monitor" | "control";
type Message = { role: "user" | "assistant"; content: string; provider?: string | null; model?: string | null };
type Conversation = { id: string; title: string; archived: boolean; created_at: string; updated_at: string; messages?: Message[] };

async function readApiResponse(response: Response) {
  const text = await response.text();
  let json: Record<string, any> = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = {}; }
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
  const response = await fetch("/api/admin/assistant", {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    credentials: "include",
    cache: "no-store",
    signal,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return readApiResponse(response);
}

async function control(section?: string, body?: Record<string, unknown>) {
  const url = section && !body ? `/api/admin/ai-control?section=${encodeURIComponent(section)}` : "/api/admin/ai-control";
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    credentials: "include",
    cache: "no-store",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return readApiResponse(response);
}

async function platform(section?: string, body?: Record<string, unknown>) {
  const url = section && !body ? `/api/admin/ai-platform?section=${section}` : "/api/admin/ai-platform";
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    credentials: "include",
    cache: "no-store",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return readApiResponse(response);
}

const TABS: { id: Tab; label: string; hashes: string[] }[] = [
  { id: "chat", label: "Chat", hashes: ["chat", "workspace", "assistant", "dev", "agent"] },
  { id: "project", label: "Project", hashes: ["project", "memory"] },
  { id: "plugins", label: "Plugins", hashes: ["plugins", "skills", "connectors"] },
  { id: "models", label: "Models", hashes: ["models"] },
  { id: "monitor", label: "Monitor", hashes: ["monitor", "cost", "usage"] },
  { id: "control", label: "Control", hashes: ["control"] },
];

function tabFromHash(hash: string): Tab | null {
  const key = hash.replace(/^#/, "").toLowerCase();
  if (!key) return null;
  return TABS.find((t) => t.hashes.includes(key) || t.id === key)?.id || null;
}

export default function AdminAiPlatformPage() {
  const [tab, setTab] = useState<Tab>("chat");
  const [chatMode, setChatMode] = useState<"chat" | "agent">("chat");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [platformError, setPlatformError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const [devTask, setDevTask] = useState("");
  const [devSkill, setDevSkill] = useState("bugfix");
  const [devParallel, setDevParallel] = useState(false);
  const [devApply, setDevApply] = useState(false);
  const [devRunning, setDevRunning] = useState(false);
  const [devResult, setDevResult] = useState<any>(null);
  const [skills, setSkills] = useState<any[]>([]);
  const [connectors, setConnectors] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [memory, setMemory] = useState<any[]>([]);
  const [activity, setActivity] = useState<Array<{ id: string; at: string; kind: string; message: string; detail?: string }>>([]);
  const [usage, setUsage] = useState<any>(null);
  const [controlData, setControlData] = useState<any[]>([]);
  const [skillUrl, setSkillUrl] = useState("");
  const [skillInstalling, setSkillInstalling] = useState(false);
  const [memKey, setMemKey] = useState("");
  const [memValue, setMemValue] = useState("");
  const [sectionLoading, setSectionLoading] = useState(false);
  const hashSynced = useRef(false);
  const activityPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sectionRequestRef = useRef(0);

  useEffect(() => {
    const apply = () => { const fromHash = tabFromHash(window.location.hash); if (fromHash) setTab(fromHash); };
    apply();
    hashSynced.current = true;
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  useEffect(() => {
    if (!hashSynced.current) return;
    const next = `#${tab}`;
    if (window.location.hash !== next) window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${next}`);
  }, [tab]);

  async function open(id: string) {
    if (sending) return;
    try {
      const json = await chatApi({ action: "get", conversationId: id });
      setActive(json.conversation);
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "خطا"); }
  }

  async function loadChat() {
    try {
      setLoading(true);
      const json = await chatApi();
      setConversations(json.conversations || []);
      if (json.conversations?.[0]) await open(json.conversations[0].id);
    } catch (e) { setError(e instanceof Error ? e.message : "خطا"); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadChat(); }, []);

  async function refreshActivity() {
    try { setActivity((await platform("activity")).activity || []); } catch { /* */ }
  }

  const loadSection = useCallback(async (id: Tab) => {
    const requestId = ++sectionRequestRef.current;
    setSectionLoading(true);
    setPlatformError("");
    try {
      if (id === "plugins") {
        const [sk, cn] = await Promise.all([platform("skills"), platform("connectors")]);
        if (requestId === sectionRequestRef.current) { setSkills(sk.skills || []); setConnectors(cn.connectors || []); }
      } else if (id === "project") {
        const [mem, act] = await Promise.all([platform("memory"), platform("activity")]);
        if (requestId === sectionRequestRef.current) { setMemory(mem.memory || []); setActivity(act.activity || []); }
      } else if (id === "models") {
        const result = await platform("models");
        if (requestId === sectionRequestRef.current) setModels(result.models || []);
      } else if (id === "monitor") {
        const result = await platform("cost");
        if (requestId === sectionRequestRef.current) setUsage(result.usage || result);
      } else if (id === "control") {
        const result = await control("providers");
        if (requestId === sectionRequestRef.current) setControlData(result.items || result.providers || []);
      } else if (id === "chat") {
        const result = await platform("skills");
        if (requestId === sectionRequestRef.current) setSkills(result.skills || []);
      }
    } catch (e) {
      if (requestId === sectionRequestRef.current) setPlatformError(e instanceof Error ? e.message : "خطا");
    } finally {
      if (requestId === sectionRequestRef.current) setSectionLoading(false);
    }
  }, []);

  useEffect(() => { void loadSection(tab); }, [tab, loadSection]);

  async function create() {
    if (creating) return;
    try {
      setCreating(true);
      const json = await chatApi({ action: "create" });
      setConversations((items) => [json.conversation, ...items]);
      setActive({ ...json.conversation, messages: [] });
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "خطا"); }
    finally { setCreating(false); }
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
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "خطا");
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }

  async function runAgent() {
    const task = devTask.trim();
    if (!task || devRunning) return;
    setDevRunning(true);
    setDevResult(null);
    setPlatformError("");
    if (activityPollRef.current) clearInterval(activityPollRef.current);
    activityPollRef.current = setInterval(() => { void refreshActivity(); }, 1500);
    try {
      const json = await platform(undefined, { action: "dev_run", task, skillId: devSkill, parallel: devParallel, apply: devApply });
      setDevResult(json.result);
      if (json.error) setPlatformError(json.error);
      if (json.result && !json.result.ok && json.result.error) setPlatformError(json.result.error);
      await refreshActivity();
    } catch (e) { setPlatformError(e instanceof Error ? e.message : "خطا"); }
    finally {
      setDevRunning(false);
      if (activityPollRef.current) { clearInterval(activityPollRef.current); activityPollRef.current = null; }
      await refreshActivity();
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
    } catch (e) { setPlatformError(e instanceof Error ? e.message : "خطا"); }
    finally { setSkillInstalling(false); }
  }

  async function saveMemory() {
    if (!memKey.trim() || !memValue.trim()) return;
    try {
      await platform(undefined, { action: "memory_upsert", scope: "project", key: memKey.trim(), value: memValue.trim() });
      setMemKey(""); setMemValue("");
      setMemory((await platform("memory")).memory || []);
    } catch (e) { setPlatformError(e instanceof Error ? e.message : "خطا"); }
  }

  async function syncModels() {
    try { setModels((await platform(undefined, { action: "sync_models" })).models || []); }
    catch (e) { setPlatformError(e instanceof Error ? e.message : "خطا"); }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-6xl flex-col gap-4 p-3 sm:p-4" dir="rtl">
      <header>
        <p className="text-[11px] uppercase tracking-wide text-ink-500">Admin AI · Grok-style</p>
        <h1 className="mt-1 text-lg font-medium text-sand-50">دستیار ادمین</h1>
        <p className="mt-1 text-xs text-ink-500">Chat عامل‌محور · Project · Plugins (Skills + Connectors){sectionLoading ? " · بارگذاری…" : ""}</p>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`rounded-full px-3 py-1.5 text-xs transition ${tab === t.id ? "border border-gold-400/30 bg-gold-400/20 text-gold-300" : "border border-white/10 text-ink-400 hover:text-sand-50"}`}>{t.label}</button>
        ))}
      </nav>

      {platformError ? <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-300">{platformError}</div> : null}

      {tab === "chat" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/10 p-2">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/[.03] p-1">
              <button type="button" onClick={() => setChatMode("chat")} className={`rounded-lg px-3 py-1.5 text-xs ${chatMode === "chat" ? "bg-gold-400/20 text-gold-300" : "text-ink-400"}`}>گفتگو</button>
              <button type="button" onClick={() => setChatMode("agent")} className={`rounded-lg px-3 py-1.5 text-xs ${chatMode === "agent" ? "bg-gold-400/20 text-gold-300" : "text-ink-400"}`}>Agent / Codex</button>
            </div>
            {chatMode === "agent" ? (
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-400">
                <select value={devSkill} onChange={(e) => setDevSkill(e.target.value)} className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sand-50">
                  {(skills.length ? skills : [{ id: "bugfix", name: "Bug Fix" }, { id: "feature", name: "Feature" }, { id: "code-review", name: "Code Review" }, { id: "docs", name: "Docs" }, { id: "refactor", name: "Refactor" }]).map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name || s.id}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1"><input type="checkbox" checked={devApply} onChange={(e) => setDevApply(e.target.checked)} /> اعمال روی repo</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={devParallel} onChange={(e) => setDevParallel(e.target.checked)} /> parallel</label>
              </div>
            ) : null}
          </div>

          {chatMode === "chat" ? (
            <div className="grid min-h-[58vh] gap-4 lg:grid-cols-[220px_1fr]">
              <aside className="hidden space-y-2 rounded-2xl border border-white/10 bg-black/10 p-3 lg:block">
                <button type="button" onClick={create} disabled={creating} className="btn-ghost w-full !py-2 text-xs">گفتگوی جدید</button>
                <div className="max-h-[50vh] space-y-1 overflow-y-auto">
                  {conversations.map((c) => (
                    <button key={c.id} type="button" onClick={() => open(c.id)} className={`block w-full rounded-xl px-3 py-2 text-right text-xs ${active?.id === c.id ? "bg-white/10 text-sand-50" : "text-ink-400 hover:bg-white/5"}`}>{c.title || "گفتگو"}</button>
                  ))}
                </div>
              </aside>
              <section className="flex min-h-[58vh] flex-col rounded-2xl border border-white/10 bg-black/10">
                <div className="flex-1 space-y-4 overflow-y-auto p-4">
                  {loading ? <p className="text-sm text-ink-500">در حال بارگذاری…</p> : null}
                  {!loading && !(active?.messages || []).length ? (
                    <div className="py-14 text-center">
                      <h2 className="text-xl font-medium text-sand-50">چه کاری برایت انجام بدهم؟</h2>
                      <p className="mt-2 text-sm text-ink-500">برای کدنویسی مثل Codex، حالت Agent را روشن کن</p>
                      <button type="button" onClick={create} className="btn-primary mt-5">شروع گفتگو</button>
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
                    <textarea value={input} onChange={(e) => setInput(e.target.value)} disabled={!active || sending} rows={2} placeholder={active ? "پیام خود را بنویس…" : "اول یک گفتگو بساز"} className="min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-sand-50 outline-none placeholder:text-ink-600" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} />
                    {sending ? <button type="button" className="btn-ghost !py-2 text-xs" onClick={() => abortRef.current?.abort()}>توقف</button> : <button type="submit" disabled={!active || !input.trim()} className="btn-primary !py-2 text-xs">ارسال</button>}
                  </div>
                </form>
              </section>
            </div>
          ) : (
            <section className="space-y-4 rounded-2xl border border-white/10 bg-black/10 p-4">
              <div>
                <h2 className="text-sm font-medium text-sand-50">Coding Agent · مثل Codex / Claude Code</h2>
                <p className="mt-1 text-[11px] leading-6 text-ink-500">تسک را بنویس؛ Agent با skill انتخاب‌شده روی repo کار می‌کند. برای PR واقعی «اعمال روی repo» را روشن کن (GITHUB_TOKEN روی Render).</p>
              </div>
              <textarea value={devTask} onChange={(e) => setDevTask(e.target.value)} rows={5} placeholder="مثلاً: باگ صفحه analytics را پیدا و fix کن و draft PR بساز" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-sand-50 outline-none placeholder:text-ink-600" />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={runAgent} disabled={devRunning || !devTask.trim()} className="btn-primary !py-2 text-xs">{devRunning ? "در حال اجرا…" : "اجرای Agent"}</button>
                <button type="button" onClick={() => void refreshActivity()} className="btn-ghost !py-2 text-xs">تازه‌سازی Activity</button>
              </div>
              {devResult ? <pre className="max-h-64 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] text-ink-300 whitespace-pre-wrap">{typeof devResult === "string" ? devResult : JSON.stringify(devResult, null, 2)}</pre> : null}
              <div className="space-y-2">
                <h3 className="text-xs text-ink-400">Activity</h3>
                {activity.slice(0, 12).map((a) => (
                  <div key={a.id} className="rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-[11px]"><span className="text-gold-400">{a.kind}</span><span className="mx-2 text-ink-500">{a.at?.slice(11, 19)}</span><span className="text-ink-300">{a.message}</span></div>
                ))}
                {!activity.length ? <p className="text-[11px] text-ink-600">هنوز رویدادی نیست.</p> : null}
              </div>
            </section>
          )}
        </div>
      ) : null}

      {tab === "project" ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/10 p-4">
            <h2 className="text-sm font-medium text-sand-50">حافظه پروژه</h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={memKey} onChange={(e) => setMemKey(e.target.value)} placeholder="key" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-sand-50" />
              <input value={memValue} onChange={(e) => setMemValue(e.target.value)} placeholder="value" className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-sand-50" />
              <button type="button" onClick={saveMemory} className="btn-primary !py-2 text-xs">ذخیره</button>
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {memory.map((item: any) => (
                <div key={item.id || item.key} className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs"><div className="font-medium text-sand-50">{item.key}</div><div className="mt-1 text-ink-400">{item.value}</div></div>
              ))}
              {!memory.length ? <p className="text-[11px] text-ink-600">حافظه‌ای ثبت نشده.</p> : null}
            </div>
          </div>
          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/10 p-4">
            <div className="flex items-center justify-between"><h2 className="text-sm font-medium text-sand-50">Activity پروژه</h2><button type="button" onClick={() => void refreshActivity()} className="btn-ghost !px-2 !py-1 text-[11px]">تازه‌سازی</button></div>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {activity.map((a) => (
                <div key={a.id} className="rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-[11px]"><div className="flex gap-2"><span className="text-gold-400">{a.kind}</span><span className="text-ink-600">{a.at}</span></div><p className="mt-1 text-ink-300">{a.message}</p></div>
              ))}
              {!activity.length ? <p className="text-[11px] text-ink-600">رویدادی نیست.</p> : null}
            </div>
          </div>
        </section>
      ) : null}

      {tab === "plugins" ? (
        <section className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
            <h2 className="text-sm font-medium text-sand-50">نصب Skill از GitHub</h2>
            <p className="mt-1 text-[11px] leading-6 text-ink-500">لینک کامل ریپو یا raw — مثلاً <span className="text-ink-400" dir="ltr">https://github.com/nextlevelbuilder/ui-ux-pro-max-skill</span></p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input value={skillUrl} onChange={(e) => setSkillUrl(e.target.value)} placeholder="https://github.com/owner/repo" className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-sand-50" dir="ltr" />
              <button type="button" onClick={installSkill} disabled={skillInstalling || !skillUrl.trim()} className="btn-primary !py-2 text-xs">{skillInstalling ? "در حال نصب…" : "نصب Skill"}</button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {skills.map((s: any) => (
                <div key={s.id} className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs"><div className="flex items-center justify-between gap-2"><span className="font-medium text-sand-50">{s.name}</span><span className="text-[10px] text-ink-500">{s.source || "builtin"} · v{s.version}</span></div><p className="mt-1 text-ink-400">{s.description}</p></div>
              ))}
              {!skills.length ? <p className="text-[11px] text-ink-600">Skillی نیست.</p> : null}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
            <h2 className="text-sm font-medium text-sand-50">Connectors</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {connectors.map((c: any) => (
                <div key={c.id} className="rounded-xl border border-white/10 bg-black/20 p-4 text-xs"><div className="flex items-center justify-between"><h3 className="font-medium text-sand-50">{c.name || c.id}</h3><span className={c.status === "connected" || c.configured ? "text-emerald-400" : "text-ink-500"}>{c.status || (c.configured ? "connected" : "missing")}</span></div>{c.hint ? <p className="mt-2 text-ink-500">{c.hint}</p> : null}</div>
              ))}
              {!connectors.length ? <p className="text-[11px] text-ink-600">کانکتوری گزارش نشد.</p> : null}
            </div>
          </div>
        </section>
      ) : null}

      {tab === "models" ? (
        <section className="space-y-3">
          <div className="flex justify-between"><h2 className="text-sm font-medium text-sand-50">مدل‌های فعال (env رندر)</h2><button type="button" onClick={syncModels} className="btn-ghost !py-1.5 text-xs">Sync</button></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {models.map((m: any) => (
              <div key={`${m.provider_id || m.provider}-${m.model_id || m.id}`} className="rounded-xl border border-white/10 bg-black/10 p-3 text-xs"><div className="text-sand-50">{m.model_id || m.id || m.model}</div><div className="mt-1 text-ink-500">{m.provider_id || m.provider}</div></div>
            ))}
            {!models.length ? <p className="text-[11px] text-ink-600">مدلی لیست نشد — Sync بزن.</p> : null}
          </div>
        </section>
      ) : null}

      {tab === "monitor" ? (
        <section className="rounded-2xl border border-white/10 bg-black/10 p-4 text-xs text-ink-300"><h2 className="mb-3 text-sm font-medium text-sand-50">Usage / Cost</h2><pre className="max-h-96 overflow-auto whitespace-pre-wrap">{usage ? JSON.stringify(usage, null, 2) : "داده‌ای نیست"}</pre></section>
      ) : null}

      {tab === "control" ? (
        <section className="space-y-3 text-xs text-ink-400"><h2 className="text-sm font-medium text-sand-50">Control plane</h2><pre className="max-h-96 overflow-auto rounded-xl border border-white/10 bg-black/20 p-3">{JSON.stringify(controlData, null, 2)}</pre></section>
      ) : null}
    </main>
  );
}
