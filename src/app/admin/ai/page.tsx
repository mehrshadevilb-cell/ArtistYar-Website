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

function ControlEditor({title,fields,onSave}:{title:string;id:string;fields:string[];onSave:(data:Record<string,string>)=>Promise<void>}) {
  const [data,setData]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState(false);
  return <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
    <h3 className="mb-3 text-sm font-medium text-sand-50">{title}</h3>
    <div className="grid gap-2 sm:grid-cols-2">
      {fields.map((field)=><input key={field} value={data[field]||""} onChange={e=>setData(v=>({...v,[field]:e.target.value}))} placeholder={field} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-sand-50" />)}
    </div>
    <button type="button" disabled={busy || !data.id || !data.name} onClick={async()=>{setBusy(true);try{await onSave(data);setData({});}finally{setBusy(false);}}} className="btn-primary mt-3 !py-2 text-xs">{busy?"در حال ذخیره…":"ذخیره"}</button>
  </div>;
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
  const [promptDraft, setPromptDraft] = useState({agent_id:"admin-assistant",task_id:"chat",version:"1",system_prompt:"",developer_instructions:"",user_template:"",changelog:""});
  const [playground, setPlayground] = useState({agentId:"admin-assistant",taskId:"chat",message:"",running:false,result:null as any});
  const hashSynced = useRef(false);
  const sectionRequestRef = useRef(0);

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
            setControlData(Object.entries(value as Record<string, unknown>).map(([period, data]) => ({
              period,
              ...(data && typeof data === "object" ? data as Record<string, unknown> : {})
            })));
          } else {
            setControlData(Array.isArray(value) ? value as ControlRecord[] : []);
          }
        }
      }
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

  async function createControlPrompt() {
    if (!promptDraft.system_prompt.trim()) return;
    setControlBusy(true);
    try {
      await control(undefined, { action:"prompt_create", ...promptDraft, version:Number(promptDraft.version||1), author:"admin" });
      setPromptDraft((p)=>({...p,version:String(Number(p.version||1)+1),system_prompt:"",developer_instructions:"",user_template:"",changelog:""}));
      await loadSection("control");
    } catch(e) { setPlatformError(e instanceof Error ? e.message : "خطا"); }
    finally { setControlBusy(false); }
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
              <select value={devSkill} onChange={(e) => setDevSkill(e.target.value)} disabled={devRunning} className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sand-50">
                {(skills.length ? skills : [{ id: "bugfix", name: "Bug Fix" }, { id: "feature", name: "Feature" }, { id: "code-review", name: "Review" }]).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
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
            placeholder="مثلاً: باگ X را در src/lib پیدا و fix کن…"
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
            {devRunning ? <span className="text-[11px] text-ink-500">خواندن repo · فراخوانی مدل · پیشنهاد فایل / PR</span> : <span className="text-[11px] text-ink-600">Ctrl/⌘ + Enter</span>}
          </div>
          {devResult ? (
            <div className={`space-y-3 rounded-2xl border p-4 text-xs leading-6 ${devResult.ok ? "border-emerald-400/20 bg-emerald-400/5 text-ink-300" : "border-red-400/20 bg-red-400/5 text-red-200"}`}>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`font-medium ${devResult.ok ? "text-emerald-300" : "text-red-300"}`}>{devResult.ok ? "نتیجه آماده" : "اجرا ناموفق"}</span>
                {devResult.pullRequest?.url ? (
                  <a href={devResult.pullRequest.url} target="_blank" rel="noreferrer" className="text-emerald-400 underline">
                    Draft PR #{devResult.pullRequest.number}{devResult.pullRequest.draft ? " (draft)" : ""}
                  </a>
                ) : null}
              </div>
              {devResult.filesRead?.length ? <p><span className="text-ink-500">خوانده‌شده: </span>{devResult.filesRead.map((f: any) => f.path).join(" · ")}</p> : null}
              {devResult.proposedFiles?.length ? <p><span className="text-ink-500">پیشنهادی: </span>{devResult.proposedFiles.map((f: any) => f.path).join(" · ")}</p> : null}
              {devResult.analysis ? <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-black/20 p-3 text-[11px]">{devResult.analysis}</pre> : null}
              {devResult.plan ? <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-black/20 p-3 text-[11px]">{devResult.plan}</pre> : null}
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
              <p className="mt-2 text-[10px] text-ink-600">v{s.version} · {(s.tools || []).join(", ")}</p>
            </div>
          ))}
        </section>
      ) : null}

      {tab === "models" ? (
        <section className="space-y-3">
          <button type="button" onClick={syncModels} className="btn-ghost !py-2 text-xs">Sync + فعال‌سازی خودکار</button>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {models.map((m: any) => (
              <div key={m.id} className="rounded-xl border border-white/10 bg-black/10 p-3 text-xs">
                <p className="text-sand-50">{m.provider_id} / {m.model_id}</p>
                <p className="mt-1 text-ink-500">{m.status} · {m.enabled ? "enabled" : "off"} · p{m.priority}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "memory" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input value={memKey} onChange={(e) => setMemKey(e.target.value)} placeholder="کلید" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-sand-50" />
            <input value={memValue} onChange={(e) => setMemValue(e.target.value)} placeholder="مقدار" className="min-w-[220px] flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-sand-50" />
            <button type="button" onClick={saveMemory} className="btn-primary !py-2 text-xs">ذخیره</button>
          </div>
          {memory.map((m: any) => (
            <div key={m.id} className="rounded-xl border border-white/10 bg-black/10 p-3 text-xs text-ink-300">
              <span className="text-sand-50">[{m.scope}] {m.key}</span>
              <div className="mt-1 whitespace-pre-wrap">{m.value}</div>
            </div>
          ))}
        </section>
      ) : null}

      {tab === "connectors" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-medium text-sand-50">اتصال‌ها</h2>
              <p className="mt-1 text-xs leading-6 text-ink-500">
                وضعیت سرویس‌های متصل به Admin AI. کلیدها فقط در Cloudflare Worker Secrets تنظیم می‌شوند.
              </p>
            </div>
            <button type="button" onClick={() => void loadSection("connectors")} disabled={sectionLoading} className="btn-ghost !py-2 text-xs">
              {sectionLoading ? "در حال بررسی…" : "بروزرسانی وضعیت"}
            </button>
          </div>
          {sectionLoading && !connectors.length ? <p className="text-sm text-ink-500">در حال خواندن وضعیت اتصال‌ها…</p> : null}
          {!sectionLoading && !connectors.length ? (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs leading-6 text-amber-100/90">
              هیچ اتصالی برنگشت. API پلتفرم را چک کن یا صفحه را رفرش کن.
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {connectors.map((c: any) => {
              const status = String(c.status || "unknown");
              const statusLabel = status === "connected" ? "متصل" : status === "optional" ? "اختیاری" : status === "missing" ? "تنظیم نشده" : status === "error" ? "خطا" : status;
              const statusClass = status === "connected" ? "text-emerald-400" : status === "optional" ? "text-ink-400" : status === "error" ? "text-red-300" : "text-amber-400";
              const borderClass = status === "connected" ? "border-emerald-400/20" : status === "error" ? "border-red-400/20" : "border-white/10";
              return (
                <div key={c.id} className={`rounded-2xl border ${borderClass} bg-black/10 p-4`}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-medium text-sand-50">{c.name}</h3>
                    <span className={`shrink-0 text-[10px] font-medium ${statusClass}`}>{statusLabel}</span>
                  </div>
                  {c.hint ? <p className="mt-2 text-[11px] leading-5 text-ink-500">{c.hint}</p> : null}
                  {c.detail?.login ? (
                    <p className="mt-2 text-xs text-ink-400">
                      @{c.detail.login}
                      {c.detail.owner && c.detail.repo ? ` · ${c.detail.owner}/${c.detail.repo}` : ""}
                      {c.detail.baseBranch ? ` · ${c.detail.baseBranch}` : ""}
                    </p>
                  ) : null}
                  {c.detail?.error ? <p className="mt-2 text-xs text-red-300">{c.detail.error}</p> : null}
                  {c.envKeys?.length ? <p className="mt-2 text-[10px] text-ink-600">env: {(c.envKeys as string[]).join(" · ")}</p> : null}
                </div>
              );
            })}
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-[11px] leading-6 text-ink-500">
            <p className="font-medium text-ink-300">نکته Dev Agent</p>
            <p className="mt-1">
              برای کار کردن تب Dev Agent باید <code className="text-sand-50">GITHUB_TOKEN</code> فقط به‌عنوان Secret روی Cloudflare Worker تنظیم شود (هرگز در کد commit نشود). بدون توکن، وضعیت GitHub = «تنظیم نشده» می‌ماند.
            </p>
          </div>
        </section>
      ) : null}

      {tab === "control" ? (
        <section className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-medium text-sand-50">کنترل و Observability</h2>
                <p className="mt-1 text-xs leading-6 text-ink-500">Provider · Task · Agent · Prompt · Tool · Execution Log · Health</p>
              </div>
              <button type="button" onClick={() => void loadSection("control")} disabled={sectionLoading} className="btn-ghost !py-2 text-xs">
                {sectionLoading ? "در حال بررسی…" : "بروزرسانی"}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                ["providers","Providerها"],["tasks","Taskها"],["agents","Agentها"],["prompts","Promptها"],
                ["tools","Toolها"],["executions","Execution Logs"],["usage","Health / Usage"]
              ].map(([id,label]) => (
                <button key={id} type="button" onClick={() => setControlSection(id)}
                  className={`rounded-full border px-3 py-1.5 text-xs ${controlSection === id ? "border-gold-400/30 bg-gold-400/15 text-gold-300" : "border-white/10 text-ink-400"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {controlSection === "playground" ? (
            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
              <div className="space-y-3 rounded-2xl border border-white/10 bg-black/10 p-4">
                <div>
                  <h3 className="text-sm font-medium text-sand-50">Admin AI Playground</h3>
                  <p className="mt-1 text-[11px] leading-5 text-ink-500">اجرای تستی با Agent و Task واقعی. هیچ Tool یا side effect در Playground اجرا نمی‌شود.</p>
                </div>
                <input value={playground.agentId} onChange={e=>setPlayground(p=>({...p,agentId:e.target.value}))} placeholder="Agent ID" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-sand-50" />
                <input value={playground.taskId} onChange={e=>setPlayground(p=>({...p,taskId:e.target.value}))} placeholder="Task ID" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-sand-50" />
                <p className="text-[10px] leading-5 text-ink-600">Prompt فعال، Provider/Model اصلی و fallback از Registry خوانده می‌شوند.</p>
              </div>
              <div className="space-y-3 rounded-2xl border border-white/10 bg-black/10 p-4">
                <textarea value={playground.message} onChange={e=>setPlayground(p=>({...p,message:e.target.value}))} rows={7} placeholder="پیام تست را اینجا بنویس…" className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-sand-50 placeholder:text-ink-600" />
                <button type="button" disabled={playground.running || !playground.message.trim()} onClick={async()=>{
                  setPlayground(p=>({...p,running:true,result:null}));
                  try {
                    const r=await control(undefined,{action:"playground_run",agentId:playground.agentId,taskId:playground.taskId,message:playground.message});
                    setPlayground(p=>({...p,running:false,result:r.result}));
                  } catch(e) {
                    setPlayground(p=>({...p,running:false,result:{error:e instanceof Error?e.message:"خطا"}}));
                  }
                }} className="btn-primary !py-2 text-xs">{playground.running?"در حال اجرا…":"اجرای تست"}</button>
                {playground.result ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-xs">
                    {playground.result.error ? <p className="text-red-300">{playground.result.error}</p> : (
                      <>
                        <div className="flex flex-wrap gap-3 text-[10px] text-ink-500">
                          <span>Request: <b className="text-sand-50">{playground.result.request_id}</b></span>
                          <span>{playground.result.provider}/{playground.result.model}</span>
                          <span>{playground.result.latency_ms}ms</span>
                          <span>Prompt v{playground.result.prompt_version || "—"}</span>
                          {playground.result.fallback_used ? <span className="text-amber-300">Fallback</span> : null}
                        </div>
                        <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap leading-6 text-ink-200">{playground.result.reply}</pre>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          {controlSection === "providers" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {controlData.map((p) => {
                const id=String(p.id||""); const status=String(p.status||"unknown");
                const cls=status==="healthy" ? "text-emerald-400" : status==="degraded" ? "text-amber-300" : "text-red-300";
                return <div key={id} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="flex items-center justify-between"><h3 className="text-sm text-sand-50">{String(p.name||id)}</h3><span className={`text-[10px] ${cls}`}>{status}</span></div>
                  <p className="mt-2 text-xs text-ink-500">مدل‌های قابل کشف: {String(p.modelCount||0)}</p>
                  <button type="button" onClick={async()=>{setControlBusy(true);try{await control(undefined,{action:"test_provider",providerId:id});await loadSection("control")}catch(e){setPlatformError(e instanceof Error?e.message:"خطا")}finally{setControlBusy(false)}}} disabled={controlBusy} className="btn-ghost mt-3 !py-2 text-xs">Test Connection</button>
                </div>
              })}
            </div>
          ) : null}
          {controlSection === "tasks" ? (
            <ControlEditor title="Task Registry" id="task" fields={["id","name","description","capability","primary_provider","primary_model","fallback_provider","fallback_model"]} onSave={async (data)=>{await control(undefined,{action:"task_upsert",...data,max_retries:Number(data.max_retries||2),timeout_ms:Number(data.timeout_ms||45000),enabled:true});await loadSection("control");}} />
          ) : null}
          {controlSection === "agents" ? (
            <ControlEditor title="Agent Registry" id="agent" fields={["id","name","description","purpose","task_id","primary_provider","primary_model","fallback_provider","fallback_model","system_prompt"]} onSave={async (data)=>{await control(undefined,{action:"agent_upsert",...data,enabled:true,version:1});await loadSection("control");}} />
          ) : null}
          {controlSection === "tools" ? (
            <ControlEditor title="Tool Registry" id="tool" fields={["id","name","description","permission_level","timeout_ms"]} onSave={async (data)=>{await control(undefined,{action:"tool_upsert",...data,enabled:false,timeout_ms:Number(data.timeout_ms||10000)});await loadSection("control");}} />
          ) : null}
          {controlSection === "prompts" ? (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-black/10 p-4">
              <h3 className="text-sm font-medium text-sand-50">نسخه جدید Prompt</h3>
              <div className="grid gap-2 sm:grid-cols-3">
                <input value={promptDraft.agent_id} onChange={e=>setPromptDraft(p=>({...p,agent_id:e.target.value}))} placeholder="Agent ID" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-sand-50" />
                <input value={promptDraft.task_id} onChange={e=>setPromptDraft(p=>({...p,task_id:e.target.value}))} placeholder="Task ID" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-sand-50" />
                <input value={promptDraft.version} onChange={e=>setPromptDraft(p=>({...p,version:e.target.value}))} placeholder="Version" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-sand-50" />
              </div>
              <textarea value={promptDraft.system_prompt} onChange={e=>setPromptDraft(p=>({...p,system_prompt:e.target.value}))} placeholder="System prompt" rows={5} className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-sand-50" />
              <textarea value={promptDraft.developer_instructions} onChange={e=>setPromptDraft(p=>({...p,developer_instructions:e.target.value}))} placeholder="Developer instructions" rows={3} className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-sand-50" />
              <textarea value={promptDraft.user_template} onChange={e=>setPromptDraft(p=>({...p,user_template:e.target.value}))} placeholder="User template (optional)" rows={2} className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-sand-50" />
              <div className="flex items-center gap-2">
                <input value={promptDraft.changelog} onChange={e=>setPromptDraft(p=>({...p,changelog:e.target.value}))} placeholder="Changelog" className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-sand-50" />
                <button type="button" onClick={createControlPrompt} disabled={controlBusy || !promptDraft.system_prompt.trim()} className="btn-primary !py-2 text-xs">ثبت نسخه</button>
              </div>
              <p className="text-[10px] text-ink-600">نسخه جدید ابتدا غیرفعال است؛ فعال‌سازی باید صریح انجام شود.</p>
            </div>
          ) : null}
          {controlSection === "tasks" || controlSection === "agents" || controlSection === "prompts" || controlSection === "tools" || controlSection === "executions" ? (
            <div className="space-y-2">
              {controlData.length ? controlData.map((row,index)=>(
                <div key={String(row.id||index)} className="rounded-xl border border-white/10 bg-black/10 p-3">
                  <pre className="overflow-auto text-[11px] leading-5 text-ink-300">{JSON.stringify(row,null,2)}</pre>
                  {controlSection === "prompts" && row.id ? (
                    <button type="button" onClick={async()=>{setControlBusy(true);try{await control(undefined,{action:"prompt_activate",id:String(row.id)});await loadSection("control")}catch(e){setPlatformError(e instanceof Error?e.message:"خطا")}finally{setControlBusy(false)}}} disabled={controlBusy || row.active === true} className="btn-ghost mt-3 !py-2 text-xs">
                      {row.active === true ? "نسخه فعال" : "فعال‌سازی این نسخه"}
                    </button>
                  ) : null}
                  {controlSection === "agents" && row.id ? (
                    <button type="button" onClick={async()=>{setControlBusy(true);try{await control(undefined,{action:"agent_upsert",id:String(row.id),enabled:row.enabled===false});await loadSection("control")}catch(e){setPlatformError(e instanceof Error?e.message:"خطا")}finally{setControlBusy(false)}}} disabled={controlBusy} className="btn-ghost mt-3 ml-2 !py-2 text-xs">
                      {row.enabled === false ? "فعال‌سازی Agent" : "غیرفعال‌سازی Agent"}
                    </button>
                  ) : null}
                </div>
              )) : <div className="rounded-xl border border-white/10 p-4 text-xs text-ink-500">داده‌ای وجود ندارد یا migration هنوز اجرا نشده است.</div>}
            </div>
          ) : null}
          {controlSection === "usage" ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {controlData.length ? controlData.map((row,index)=><div key={index} className="rounded-2xl border border-white/10 bg-black/10 p-4 text-xs"><p className="text-ink-500">{String(row.label||row.period||"usage")}</p><p className="mt-2 text-lg text-sand-50">{String(row.requests||row.estimatedCost||"—")}</p></div>) : <div className="rounded-xl border border-white/10 p-4 text-xs text-ink-500">Usage هنوز ثبت نشده است.</div>}
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "cost" ? (
        <section className="space-y-3 rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-ink-300">
          {usage ? (
            <>
              <p>۳۰ روز · درخواست‌ها: <b className="text-sand-50">{usage.count}</b></p>
              <p>توکن in/out: <b className="text-sand-50">{usage.totalIn}</b> / <b className="text-sand-50">{usage.totalOut}</b></p>
              <p>برآورد هزینه: <b className="text-gold-300">${Number(usage.totalCost || 0).toFixed(4)}</b></p>
            </>
          ) : (
            <p className="text-ink-500">هنوز usage ثبت نشده.</p>
          )}
        </section>
      ) : null}
    </main>
  );
}
