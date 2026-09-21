"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";

type JobView = {
  id: string;
  status: string;
  prompt: string;
  spec?: {
    assetType?: string;
    instrument?: string;
    bpm?: number;
    key?: string;
    bars?: number;
    role?: string;
  };
  errorMessage?: string;
  outputUrl?: string;
  outputMimeType?: string;
  outputDurationMs?: number;
  createdAt?: string;
  completedAt?: string;
};

const EXAMPLES = [
  "یک ریف گیتار پاپ ایرانی در ۱۳۰ BPM، ۸ میزان، برای ورس، اجرای طبیعی",
  "یک bassline فانک در ۱۱۰ BPM، E minor، دو میزان، tight و groovy",
  "یک fill درام یک میزان قبل از chorus، بدون crash زیاد",
  "یک arpeggio سینتی برای intro، ۱۲۸ BPM، فضای dark electronic",
  "یک melody روی Am، ۸ میزان، مناسب vocal topline",
];

const TERMINAL = new Set(["completed", "failed", "cancelled", "expired"]);

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    queued: "در صف",
    planning: "برنامه‌ریزی",
    generating: "در حال تولید",
    validating: "اعتبارسنجی",
    completed: "آماده",
    failed: "ناموفق",
    cancelled: "لغو شده",
    expired: "منقضی",
  };
  return map[s] || s;
}

export function MusicGeneratorClient() {
  const promptId = useId();
  const [prompt, setPrompt] = useState("");
  const [bpm, setBpm] = useState("");
  const [key, setKey] = useState("");
  const [bars, setBars] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [job, setJob] = useState<JobView | null>(null);
  const [library, setLibrary] = useState<JobView[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const loadLibrary = useCallback(async () => {
    try {
      const res = await fetch("/api/music/library?limit=20", { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setNeedsLogin(true);
        return;
      }
      if (res.ok && data.ok && Array.isArray(data.items)) {
        setNeedsLogin(false);
        setLibrary(data.items);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadLibrary();
    return () => stopPolling();
  }, [loadLibrary, stopPolling]);

  const pollJob = useCallback(
    (jobId: string) => {
      stopPolling();
      let ticks = 0;
      pollRef.current = setInterval(async () => {
        ticks += 1;
        if (ticks > 90) {
          stopPolling();
          setBusy(false);
          setError("زمان انتظار تمام شد. وضعیت را از کتابخانه بررسی کنید.");
          return;
        }
        try {
          const res = await fetch(`/api/music/generations/${jobId}`, {
            credentials: "include",
            cache: "no-store",
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.ok || !data.job) return;
          const next = data.job as JobView;
          setJob(next);
          if (TERMINAL.has(next.status)) {
            stopPolling();
            setBusy(false);
            if (next.status === "failed") {
              setError(next.errorMessage || "تولید ناموفق بود.");
            }
            void loadLibrary();
          }
        } catch {
          /* keep polling */
        }
      }, 2000);
    },
    [loadLibrary, stopPolling],
  );

  async function onGenerate() {
    setError(null);
    setBusy(true);
    setJob(null);
    stopPolling();
    try {
      const body: Record<string, unknown> = { prompt: prompt.trim() };
      if (bpm) body.bpm = Number(bpm);
      if (key.trim()) body.key = key.trim();
      if (bars) body.bars = Number(bars);
      body.idempotencyKey = `ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const res = await fetch("/api/music/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setNeedsLogin(true);
        setError(data.error || "برای تولید وارد شوید.");
        setBusy(false);
        return;
      }

      if (data.job) {
        const created = data.job as JobView;
        setJob(created);
        void loadLibrary();

        if (created.status === "completed") {
          setBusy(false);
          return;
        }
        if (TERMINAL.has(created.status)) {
          setError(data.error || created.errorMessage || "تولید ناموفق بود.");
          setBusy(false);
          return;
        }
        pollJob(created.id);
        return;
      }

      if (!res.ok || !data.ok) {
        setError(
          data.error ||
            (res.status === 402
              ? "اعتبار کافی نیست. ۳ تولید رایگان تمام شده یا نیاز به خرید اعتبار دارید."
              : "خطا در تولید"),
        );
        setBusy(false);
        return;
      }

      setBusy(false);
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {needsLogin && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm leading-7 text-amber-100">
          برای استفاده از تولید موسیقی باید وارد شوید.{" "}
          <Link href="/login" className="font-semibold text-gold-400 underline underline-offset-2">
            ورود / ثبت‌نام
          </Link>
        </div>
      )}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:p-6">
        <label htmlFor={promptId} className="mb-2 block text-sm font-medium">
          چه قطعه‌ای می‌خواهید بسازید؟
        </label>
        <textarea
          id={promptId}
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="مثال: یه ریف گیتار پاپ ایرانی توی ۱۳۰ BPM برای ورس، ۸ میزان، طبیعی…"
          className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm leading-relaxed outline-none ring-[var(--accent)] focus:ring-2"
          disabled={busy}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.slice(0, 3).map((ex) => (
            <button
              key={ex.slice(0, 24)}
              type="button"
              onClick={() => setPrompt(ex)}
              className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
            >
              {ex.length > 42 ? ex.slice(0, 40) + "…" : ex}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="mt-4 text-xs text-[var(--accent)] underline-offset-2 hover:underline"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? "مخفی کردن جزئیات" : "جزئیات اختیاری (BPM، کلید، میزان)"}
        </button>

        {showAdvanced && (
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">BPM</label>
              <input
                type="number"
                min={40}
                max={240}
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm"
                placeholder="مثلاً ۱۳۰"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">کلید</label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm"
                placeholder="Am / E"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">تعداد میزان</label>
              <input
                type="number"
                min={1}
                max={64}
                value={bars}
                onChange={(e) => setBars(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm"
                placeholder="۸"
              />
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void onGenerate()}
            disabled={busy || prompt.trim().length < 3}
            className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "در حال تولید…" : "تولید کن"}
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </section>

      {job && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">نتیجه</h2>
            <span className="rounded-full bg-[var(--bg)] px-2.5 py-0.5 text-xs">{statusLabel(job.status)}</span>
          </div>
          {job.spec && (
            <p className="mb-3 text-xs text-[var(--muted)]">
              {[job.spec.assetType, job.spec.instrument, job.spec.bpm && `${job.spec.bpm} BPM`, job.spec.key, job.spec.bars && `${job.spec.bars} میزان`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {job.status === "completed" && job.outputUrl ? (
            <div className="space-y-3">
              <audio controls src={job.outputUrl} className="w-full" preload="metadata" />
              <div className="flex flex-wrap gap-2">
                <a
                  href={job.outputUrl}
                  download
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs hover:border-[var(--accent)]"
                >
                  دانلود
                </a>
              </div>
            </div>
          ) : job.errorMessage ? (
            <p className="text-sm text-red-500">{job.errorMessage}</p>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              در حال پردازش… وضعیت هر ۲ ثانیه به‌روز می‌شود.
            </p>
          )}
        </section>
      )}

      {library.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">کتابخانهٔ اخیر</h2>
          <ul className="space-y-2">
            {library.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{item.prompt}</p>
                  <p className="text-xs text-[var(--muted)]">{statusLabel(item.status)}</p>
                </div>
                {item.outputUrl && item.status === "completed" && (
                  <audio controls src={item.outputUrl} className="h-8 w-full max-w-xs" preload="none" />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-center text-xs text-[var(--muted)]">
        این ابزار قطعهٔ موسیقی هدفمند تولید می‌کند، نه کلون آهنگ کامل. برای کیفیت نهایی به مدل واقعی نیاز است.
      </p>
    </div>
  );
}
