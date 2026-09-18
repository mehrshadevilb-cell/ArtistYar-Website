"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AiStatus = {
  ok?: boolean;
  source?: string;
  chat_assistant_enabled?: boolean;
  self_check?: string;
  agent_status?: string;
  note?: string;
  error?: string;
};

type Agent = {
  name: string;
  role: string;
  mode: string;
  status: "recommended" | "available";
  tasks: string;
  handoff: string;
  url: string;
};

const agents: Agent[] = [
  {
    name: "Claude Code",
    role: "توسعه‌دهنده اصلی",
    mode: "کدنویسی مستقیم + بررسی کل پروژه",
    status: "recommended",
    tasks: "Feature، refactor، bug fix، تست و review معماری Next.js",
    handoff: "کد فعلی را از GitHub بخوان، ابتدا plan بده، سپس تغییرات را در یک branch جدا انجام بده و قبل از merge تست کن.",
    url: "https://claude.ai/code",
  },
  {
    name: "Manus",
    role: "Agent اجرایی و تحقیق",
    mode: "تحقیق، تحلیل محصول و اجرای workflow",
    status: "recommended",
    tasks: "تحقیق رقبا، UX، SEO، ایده Feature و اجرای کارهای چندمرحله‌ای",
    handoff: "وضعیت فعلی ArtistYar-Website را بررسی کن، task را به مراحل قابل اجرا تقسیم کن و خروجی هر مرحله را مستند کن.",
    url: "https://manus.im",
  },
  {
    name: "Codex",
    role: "مهندس کد و review",
    mode: "کدنویسی، دیباگ و تست",
    status: "recommended",
    tasks: "پیاده‌سازی Feature، رفع bug، تست، review و آماده‌سازی PR",
    handoff: "Repository را بررسی کن، وابستگی‌ها و conventionهای موجود را حفظ کن و فقط تغییرات لازم برای task را اعمال کن.",
    url: "https://chatgpt.com/codex",
  },
  {
    name: "Cursor",
    role: "توسعه داخل IDE",
    mode: "ویرایش سریع و context-aware",
    status: "available",
    tasks: "تغییرات UI، componentها، refactor و iteration سریع روی کد",
    handoff: "ساختار موجود را حفظ کن، component قابل استفاده مجدد بساز و بعد از تغییر، typecheck و lint را اجرا کن.",
    url: "https://cursor.com",
  },
  {
    name: "AI Agent / Harness",
    role: "اجرای خودکار workflow",
    mode: "task runner + automation",
    status: "available",
    tasks: "اجرای taskهای تکراری، diagnostics، تست و pipelineهای توسعه",
    handoff: "قبل از write دسترسی‌ها و branch هدف را بررسی کن؛ خروجی، خطاها و commit/PR نهایی را گزارش بده.",
    url: "https://harness.io",
  },
];

function copyText(text: string) {
  void navigator.clipboard?.writeText(text);
}

export default function AdminAiPage() {
  const [data, setData] = useState<AiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [task, setTask] = useState("");
  const [agentCount, setAgentCount] = useState(12);
  const [running, setRunning] = useState(false);
  const [agentRun, setAgentRun] = useState<any>(null);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [devRunning, setDevRunning] = useState(false);
  const [devRun, setDevRun] = useState<any>(null);
  const [devError, setDevError] = useState<string | null>(null);
  const [liveStage, setLiveStage] = useState(0);
  const [liveElapsed, setLiveElapsed] = useState(0);
  const liveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const developTask = async () => {
    if (!task.trim() || devRunning) return;
    setDevRunning(true); setDevError(null); setDevRun(null);
    try {
      const response = await fetch("/api/ai/develop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: task.trim(), maxAgents: agentCount, execute: true }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Development Agent failed");
      setDevRun(json);
    } catch (error) {
      setDevError(error instanceof Error ? error.message : "اجرای Development Agent ناموفق بود");
    } finally { setDevRunning(false); }
  };

  const runAgents = async () => {
    if (!task.trim() || running) return;
    setRunning(true); setAgentError(null); setAgentRun(null);
    try {
      const response = await fetch("/api/ai/agent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: task.trim(), maxAgents: agentCount }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Agent execution failed");
      setAgentRun(json);
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : "اجرای Multi-Agent ناموفق بود");
    } finally { setRunning(false); }
  };

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/rahyar/ai-status")
      .then((r) => r.json())
      .then((json) => {
        setData(json);
        setUpdatedAt(new Date().toLocaleTimeString("fa-IR"));
      })
      .catch(() => setData({ ok: false, error: "fetch failed — اتصال به ربات برقرار نشد" }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Live monitoring: advance stages while agents are running
  useEffect(() => {
    const active = devRunning || running;
    if (!active) {
      if (liveTimer.current) {
        clearInterval(liveTimer.current);
        liveTimer.current = null;
      }
      setLiveStage(0);
      setLiveElapsed(0);
      return;
    }
    setLiveStage(0);
    setLiveElapsed(0);
    const started = Date.now();
    liveTimer.current = setInterval(() => {
      const sec = Math.floor((Date.now() - started) / 1000);
      setLiveElapsed(sec);
      // Cycle stages every ~12s so user sees progress
      setLiveStage(Math.min(3, Math.floor(sec / 12)));
    }, 1000);
    return () => {
      if (liveTimer.current) {
        clearInterval(liveTimer.current);
        liveTimer.current = null;
      }
    };
  }, [devRunning, running]);

  const assistantOn = Boolean(data?.chat_assistant_enabled);
  const healthy = data?.ok !== false && !data?.error;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-sand-50">AI Agent · مرکز توسعه</h2>
          <p className="mt-1 text-xs leading-6 text-ink-500">
            راهنمای انتخاب Agent برای ادامه، توسعه و نگهداری ArtistYar.
          </p>
          {updatedAt ? (
            <p className="mt-1 text-[11px] text-ink-600">آخرین بروزرسانی وضعیت: {updatedAt}</p>
          ) : null}
        </div>
        <button type="button" className="btn-ghost !py-2 text-xs" onClick={load} disabled={loading}>
          {loading ? "در حال بارگذاری…" : "بروزرسانی"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card-ay p-4">
          <p className="text-xs text-ink-500">وضعیت کلی پل ربات</p>
          <p className={`mt-1 text-sm font-medium ${healthy ? "text-emerald-400" : "text-red-400"}`}>
            {loading ? "…" : healthy ? "سالم" : "مشکل"}
          </p>
        </div>
        <div className="card-ay p-4">
          <p className="text-xs text-ink-500">Chat Assistant</p>
          <p className={`mt-1 text-sm font-medium ${assistantOn ? "text-gold-400" : "text-ink-400"}`}>
            {loading ? "…" : assistantOn ? "فعال" : "خاموش / نامشخص"}
          </p>
        </div>
        <div className="card-ay p-4">
          <p className="text-xs text-ink-500">منبع وضعیت</p>
          <p className="mt-1 text-sm font-medium text-sand-50">{loading ? "…" : data?.source ?? "—"}</p>
        </div>
      </div>

      <section id="development-agent" className="card-ay space-y-5 p-5 border border-emerald-400/20 scroll-mt-24">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-medium text-sand-50">🤖 AI Development Center · Multi-Agent + Coding</h3>
            <span className="rounded-full border border-emerald-400/20 px-2 py-1 text-[10px] text-emerald-400">CODE → APPLY → PR</span>
          </div>
          <p className="mt-2 text-xs leading-6 text-ink-500">
            اینجا فقط سؤال نپرس؛ دقیقاً بگو چه تغییری می‌خواهی. تیم AI پروژه را بررسی می‌کند، plan می‌سازد،
            چند Agent شروع به کدنویسی می‌کنند، Reviewerها کد را بررسی می‌کنند، تغییرات منتخب روی branch اعمال می‌شود
            و در پایان Draft PR ساخته می‌شود.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "این سایت را از نظر UI/UX بررسی کن و مشکلات مهم را رفع کن.",
            "صفحه خرید دوره‌ها را کامل‌تر و حرفه‌ای‌تر کن.",
            "مشکلات mobile و responsive سایت را پیدا و برطرف کن.",
            "یک Feature جدید برای پنل ادمین طراحی و پیاده‌سازی کن.",
          ].map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setTask(example)}
              className="rounded-xl border border-white/10 bg-black/10 p-3 text-right text-[11px] leading-5 text-ink-400 transition hover:border-gold-400/30 hover:text-sand-50"
            >
              {example}
            </button>
          ))}
        </div>

        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="مثلاً: یک سیستم جستجوی پیشرفته برای دوره‌ها اضافه کن؛ UI، API، validation، mobile و performance را هم کامل کن."
          className="min-h-36 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-sand-50 outline-none placeholder:text-ink-600"
          dir="rtl"
        />

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-ink-400">
            تعداد Agent:
            <select
              value={agentCount}
              onChange={(e) => setAgentCount(Number(e.target.value))}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sand-50"
            >
              {[4, 8, 12, 16, 20, 24].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>

          <button
            type="button"
            onClick={developTask}
            disabled={!task.trim() || devRunning}
            className="btn-ghost !py-2.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            {devRunning ? "⏳ تیم AI در حال کدنویسی و اعمال تغییرات…" : "▶ شروع کدنویسی و اعمال تغییرات"}
          </button>
          <button
            type="button"
            onClick={runAgents}
            disabled={!task.trim() || running}
            className="btn-ghost !py-2.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? "⏳ در حال اجرای Multi-Agent…" : "🧠 تحلیل Multi-Agent"}
          </button>

          <button
            type="button"
            onClick={() => { setTask(""); setDevRun(null); setDevError(null); }}
            disabled={devRunning}
            className="btn-ghost !py-2.5 text-xs"
          >
            پاک کردن
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-4 text-[11px]">
          <div className={`rounded-xl border p-3 ${(devRunning || running) && liveStage === 0 ? "border-emerald-400/40 text-emerald-400 bg-emerald-400/5" : "border-white/10 text-ink-500"}`}><b className="text-sand-50">۱</b> تحلیل کل پروژه</div>
          <div className={`rounded-xl border p-3 ${(devRunning || running) && liveStage === 1 ? "border-emerald-400/40 text-emerald-400 bg-emerald-400/5" : "border-white/10 text-ink-500"}`}><b className="text-sand-50">۲</b> کدنویسی موازی</div>
          <div className={`rounded-xl border p-3 ${(devRunning || running) && liveStage === 2 ? "border-emerald-400/40 text-emerald-400 bg-emerald-400/5" : "border-white/10 text-ink-500"}`}><b className="text-sand-50">۳</b> Review و انتخاب</div>
          <div className={`rounded-xl border p-3 ${(devRunning || running) && liveStage === 3 ? "border-emerald-400/40 text-emerald-400 bg-emerald-400/5" : "border-white/10 text-ink-500"}`}><b className="text-sand-50">۴</b> Apply + Draft PR</div>
        </div>

        {(devRunning || running) ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
                </span>
                <div>
                  <p className="text-sm font-medium text-emerald-400">
                    {devRunning ? "تیم AI در حال کدنویسی و اعمال تغییرات" : "Multi-Agent در حال تحلیل"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-500">
                    مرحله فعال: {[
                      "تحلیل کل پروژه و ساخت plan",
                      "کدنویسی موازی توسط Agentها",
                      "Review و انتخاب بهترین پیشنهاد",
                      "اعمال روی branch + ساخت Draft PR",
                    ][liveStage]}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] tabular-nums text-ink-400">
                {Math.floor(liveElapsed / 60).toString().padStart(2, "0")}:{(liveElapsed % 60).toString().padStart(2, "0")}
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/30">
              <div
                className="h-full rounded-full bg-emerald-400/70 transition-all duration-1000"
                style={{ width: `${Math.min(95, 12 + liveStage * 22 + (liveElapsed % 12) * 1.5)}%` }}
              />
            </div>
          </div>
        ) : null}

        {devError ? <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-xs leading-6 text-red-400">{devError}</div> : null}
        {agentError ? <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-xs leading-6 text-red-400">{agentError}</div> : null}
        {agentRun ? (
          <div className="rounded-2xl border border-gold-400/20 bg-black/10 p-4">
            <div className="grid gap-2 sm:grid-cols-3 text-xs">
              <div className="rounded-xl border border-white/10 p-3 text-ink-400">Agentها: <b className="text-sand-50">{agentRun.totalAgents}</b></div>
              <div className="rounded-xl border border-white/10 p-3 text-ink-400">پاسخ موفق: <b className="text-emerald-400">{agentRun.successfulAgents}</b></div>
              <div className="rounded-xl border border-white/10 p-3 text-ink-400">Lead: <b className="text-gold-400">{agentRun.synthesis?.model || "—"}</b></div>
            </div>
            <pre className="mt-3 whitespace-pre-wrap text-xs leading-7 text-ink-300">{agentRun.synthesis?.reply || "—"}</pre>
          </div>
        ) : null}

        {devRun ? (
          <div className="space-y-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-emerald-400">✅ اجرای Development Agent تمام شد</p>
                <p className="mt-1 text-[11px] text-ink-500">
                  {devRun.appliedChanges?.length || 0} فایل تغییر کرده · Branch: {devRun.branch || "—"}
                </p>
              </div>
              {devRun.pullRequest?.url ? (
                <a href={devRun.pullRequest.url} target="_blank" rel="noreferrer" className="btn-ghost !py-2 text-[11px]">
                  باز کردن Draft PR
                </a>
              ) : null}
            </div>

            {devRun.appliedChanges?.length ? (
              <div className="rounded-xl border border-white/10 p-3 text-xs leading-6 text-ink-400">
                <span className="text-sand-50">فایل‌های اعمال‌شده:</span>{" "}
                {devRun.appliedChanges.join("، ")}
              </div>
            ) : null}

            {devRun.reviews?.length ? (
              <details className="rounded-xl border border-white/10 p-3">
                <summary className="cursor-pointer text-xs text-sand-50">مشاهده Review Agentها</summary>
                <div className="mt-3 space-y-2">
                  {devRun.reviews.map((review: string, i: number) => (
                    <pre key={i} className="whitespace-pre-wrap text-[11px] leading-6 text-ink-400">{review}</pre>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="card-ay space-y-4 p-5">
        <div>
          <h3 className="text-base font-medium text-sand-50">Agentهای پیشنهادی برای توسعه</h3>
          <p className="mt-1 text-xs leading-6 text-ink-500">
            این بخش «کدام Agent را برای چه کاری استفاده کنم؟» را مشخص می‌کند. وضعیت این Agentهای
            خارجی از داخل سایت به‌صورت زنده verify نمی‌شود؛ دسترسی GitHub و حساب هر سرویس باید جداگانه تنظیم شود.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {agents.map((agent) => (
            <article key={agent.name} className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-medium text-sand-50">{agent.name}</h4>
                  <p className="mt-1 text-xs text-gold-400">{agent.role}</p>
                </div>
                <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-ink-400">
                  {agent.status === "recommended" ? "پیشنهاد اصلی" : "قابل استفاده"}
                </span>
              </div>
              <p className="mt-3 text-xs leading-6 text-ink-400">{agent.mode}</p>
              <p className="mt-2 text-xs leading-6 text-ink-500">
                <span className="text-ink-300">مناسب برای:</span> {agent.tasks}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={agent.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost !py-2 text-[11px]"
                >
                  باز کردن Agent
                </a>
                <button
                  type="button"
                  className="btn-ghost !py-2 text-[11px]"
                  onClick={() => copyText(agent.handoff)}
                >
                  کپی دستور شروع
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card-ay space-y-4 p-5">
        <div>
          <h3 className="text-base font-medium text-sand-50">قانون ادامه توسعه</h3>
          <p className="mt-1 text-xs leading-6 text-ink-500">
            برای جلوگیری از تداخل چند Agent، هر task باید یک owner، یک branch و یک خروجی مشخص داشته باشد.
          </p>
        </div>
        <div className="grid gap-2 text-xs leading-6 text-ink-400 md:grid-cols-4">
          <div className="rounded-xl border border-white/10 p-3"><b className="text-sand-50">۱.</b> Repository را بخوان</div>
          <div className="rounded-xl border border-white/10 p-3"><b className="text-sand-50">۲.</b> Plan و impact را مشخص کن</div>
          <div className="rounded-xl border border-white/10 p-3"><b className="text-sand-50">۳.</b> روی branch جدا تغییر بده</div>
          <div className="rounded-xl border border-white/10 p-3"><b className="text-sand-50">۴.</b> Test → Review → PR</div>
        </div>
      </section>

      <div className="card-ay space-y-3 p-5 text-sm">
        {data?.note ? <p className="text-xs text-ink-500">{data.note}</p> : null}
        {data?.error ? <p className="text-xs text-red-400">{data.error}</p> : null}
      </div>

      <div className="card-ay p-5">
        <h3 className="text-sm font-medium text-sand-50">Self-Check</h3>
        <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap text-xs leading-6 text-ink-400">
          {loading ? "در حال بارگذاری…" : data?.self_check || "—"}
        </pre>
      </div>

      <div className="card-ay p-5">
        <h3 className="text-sm font-medium text-sand-50">Agent Status · Telegram Bridge</h3>
        <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap text-xs leading-6 text-ink-400">
          {loading ? "در حال بارگذاری…" : data?.agent_status || "—"}
        </pre>
      </div>

      <p className="text-xs leading-6 text-ink-500">
        Taskهای write مانند Fix / Feature / PR از مسیر امن توسعه اجرا شوند. قبل از هر تغییر مهم، branch و backup
        داشته باش و از اجرای هم‌زمان چند Agent روی یک branch جلوگیری کن.
      </p>
    </div>
  );
}
