"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Gauge,
  Loader2,
  Sparkles,
  Target,
  Waves,
  Zap,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

type BandAdvice = {
  band: string;
  action: "boost" | "cut" | "hold";
  db: number;
  reason: string;
};

type MixAnalysis = {
  styleSummary: string;
  descriptors: {
    tonal: string;
    stereo: string;
    dynamics: string;
    loudness: string;
  };
  matchScore: number;
  eqCurve: BandAdvice[];
  compression: {
    summary: string;
    attack: string;
    release: string;
    ratio: string;
    thresholdHint: string;
  };
  limiting: {
    targetLufs: string;
    truePeak: string;
    notes: string;
  };
  stereo: string;
  phase: string;
  mixBalance: Array<{ element: string; advice: string }>;
  roadmap: string[];
  quickFixes: string[];
  referenceTips: string;
  source: string;
};

const GENRES = [
  "Pop",
  "Persian Pop / پاپ ایرانی",
  "Hip-Hop / Trap",
  "EDM / Electronic",
  "Rock / Indie",
  "R&B / Soul",
  "Acoustic / Singer-Songwriter",
  "Orchestral / Cinematic",
];

const FOCUSES = ["فول میکس", "وکال", "درامز", "باس", "مسترینگ نهایی"];

export function MixAnalyzerLab({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [genre, setGenre] = useState(GENRES[0]);
  const [focus, setFocus] = useState(FOCUSES[0]);
  const [stage, setStage] = useState("میکس");
  const [problems, setProblems] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<MixAnalysis | null>(null);
  const [quota, setQuota] = useState({ dailyLimit: 1, used: 0, remaining: 1, pro: false });

  const refreshQuota = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (user?.id) params.set("userId", user.id);
      const res = await fetch("/api/practice/status?" + params.toString(), { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (data?.ok) setQuota({ dailyLimit: data.dailyLimit, used: data.used, remaining: data.remaining, pro: Boolean(data.pro) });
    } catch {}
  }, [user]);

  useEffect(() => { void refreshQuota(); }, [refreshQuota]);

  const run = useCallback(async () => {
    if (quota.remaining <= 0) { setError("سهمیه تحلیل رایگان امروز تمام شده است."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/practice/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          genre,
          focus,
          stage,
          problems,
          notes,
          userId: user?.id,
        }),
      });
      const data = await res.json();
      if (!data?.ok || !data.analysis) {
        if (data?.code === "daily_limit_reached") { await refreshQuota(); throw new Error("سهمیه تحلیل امروز تمام شده است. برای تحلیل بیشتر Pro لازم است."); }
        throw new Error(data?.error || "تحلیل انجام نشد");
      }
      setAnalysis(data.analysis as MixAnalysis);
      await refreshQuota();
      if (user?.id) {
        void fetch("/api/practice/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            userId: user.id,
            username: user.username,
            fullName: user.fullName,
            telegramId: user.telegramId,
            gameId: "mix-analyzer",
            score: 5,
            accuracy: 100,
            streak: 1,
            bestScore: 5,
            metadata: { genre, focus, source: data.analysis.source },
          }),
        }).catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در تحلیل");
    } finally {
      setLoading(false);
    }
  }, [genre, focus, stage, problems, notes, user]);

  return (
    <section className="mt-10">
      <button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>
        <ArrowLeft size={14} /> بازگشت
      </button>

      <div className="mt-5 overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/[.08] via-white/[.03] to-violet-400/[.06] p-6 sm:p-10">
        <p className="eyebrow text-cyan-300">MIX ANALYZER · REFERENCE-STYLE</p>
        <h1 className="mt-3 text-2xl font-semibold text-sand-50">تحلیل میکس و مسیر اصلاح</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-300">
          شبیه منطق Reference 3: تونال بالانس، EQ curve، کمپرس، لیمیت، استریو و فاز را بر اساس سبک هدف بررسی می‌کند
          و یک roadmap عملی می‌دهد تا به رفرنس حرفه‌ای نزدیک شوی.
        </p>

<div className="mt-5 flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-ink-300">Daily: <b className="text-cyan-200">{quota.remaining}/{quota.dailyLimit}</b></span><span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-ink-500">{quota.pro ? "Pro" : "Free"}</span></div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs text-ink-400">
            سبک / ژانر
            <select
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-sand-50"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
            >
              {GENRES.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-ink-400">
            تمرکز
            <select
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-sand-50"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
            >
              {FOCUSES.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-ink-400">
            مرحله
            <select
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-sand-50"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            >
              <option>تنظیم</option>
              <option>میکس</option>
              <option>مسترینگ</option>
            </select>
          </label>
          <label className="block text-xs text-ink-400">
            مشکلات فعلی (اختیاری)
            <input
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-sand-50"
              placeholder="مثلاً: وکال عقب، باس گل‌آلود، میکس کدر..."
              value={problems}
              onChange={(e) => setProblems(e.target.value)}
            />
          </label>
        </div>

        <label className="mt-4 block text-xs text-ink-400">
          توضیح بیشتر (اختیاری)
          <textarea
            className="mt-1.5 min-h-[88px] w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-sand-50"
            placeholder="مثلاً: رفرنسم فلان قطعه است، تمپو ۱۲۸، وکال اصلی زن..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <button type="button" className="btn-primary mt-6" disabled={loading || quota.remaining <= 0} onClick={() => void run()}>
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> در حال تحلیل AI…
            </>
          ) : (
            <>
              <Sparkles size={16} /> تحلیل کن و راه بده
            </>
          )}
        </button>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      </div>

      {analysis ? (
        <div className="mt-6 space-y-4">
          <div className="card-ay p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow">نتیجه تحلیل</p>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-300">{analysis.styleSummary}</p>
              </div>
              <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-5 py-3 text-center">
                <p className="text-[10px] text-cyan-200/80">Match %</p>
                <p className="text-2xl font-semibold text-cyan-100">{analysis.matchScore}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ["Tonal", analysis.descriptors.tonal, Waves],
                  ["Stereo", analysis.descriptors.stereo, BarChart3],
                  ["Dynamics", analysis.descriptors.dynamics, Zap],
                  ["Loudness", analysis.descriptors.loudness, Gauge],
                ] as const
              ).map(([label, value, Icon]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/[.03] p-4">
                  <div className="flex items-center gap-2 text-xs text-ink-500">
                    <Icon size={14} className="text-cyan-300" />
                    {label}
                  </div>
                  <p className="mt-2 text-sm text-sand-50">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card-ay p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-lg text-sand-50">
              <Target size={18} className="text-gold-300" /> EQ Curve پیشنهادی
            </h2>
            <p className="mt-1 text-xs text-ink-500">مثل Level Line در Reference — boost بالای صفر، cut زیر صفر</p>
            <div className="mt-5 space-y-3">
              {analysis.eqCurve.map((row, i) => (
                <div
                  key={`${row.band}-${i}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[.02] px-4 py-3"
                >
                  <div>
                    <p className="text-sm text-sand-50">{row.band}</p>
                    <p className="mt-1 text-xs text-ink-500">{row.reason}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      row.action === "boost"
                        ? "bg-emerald-400/15 text-emerald-200"
                        : row.action === "cut"
                          ? "bg-red-400/15 text-red-200"
                          : "bg-white/10 text-ink-300"
                    }`}
                  >
                    {row.action === "boost" ? "+" : row.action === "cut" ? "−" : "·"}
                    {Math.abs(row.db)} dB · {row.action}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card-ay p-6">
              <h3 className="text-base text-sand-50">Compression</h3>
              <p className="mt-2 text-sm leading-7 text-ink-300">{analysis.compression.summary}</p>
              <ul className="mt-4 space-y-2 text-xs text-ink-400">
                <li>Attack: {analysis.compression.attack}</li>
                <li>Release: {analysis.compression.release}</li>
                <li>Ratio: {analysis.compression.ratio}</li>
                <li>Threshold: {analysis.compression.thresholdHint}</li>
              </ul>
            </div>
            <div className="card-ay p-6">
              <h3 className="text-base text-sand-50">Limiting / Loudness</h3>
              <p className="mt-2 text-sm text-cyan-100">هدف: {analysis.limiting.targetLufs}</p>
              <p className="mt-1 text-sm text-ink-300">True Peak: {analysis.limiting.truePeak}</p>
              <p className="mt-3 text-sm leading-7 text-ink-400">{analysis.limiting.notes}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card-ay p-6">
              <h3 className="text-base text-sand-50">Stereo</h3>
              <p className="mt-2 text-sm leading-7 text-ink-300">{analysis.stereo}</p>
            </div>
            <div className="card-ay p-6">
              <h3 className="text-base text-sand-50">Phase</h3>
              <p className="mt-2 text-sm leading-7 text-ink-300">{analysis.phase}</p>
            </div>
          </div>

          <div className="card-ay p-6 sm:p-8">
            <h3 className="text-base text-sand-50">Mix Balance</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {analysis.mixBalance.map((m) => (
                <div key={m.element} className="rounded-xl border border-white/10 bg-white/[.02] p-4">
                  <p className="text-sm font-medium text-gold-200">{m.element}</p>
                  <p className="mt-1 text-xs leading-6 text-ink-400">{m.advice}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card-ay p-6 sm:p-8">
            <h3 className="flex items-center gap-2 text-base text-sand-50">
              <CheckCircle2 size={18} className="text-emerald-300" /> Roadmap — راه قدم‌به‌قدم
            </h3>
            <ol className="mt-4 space-y-3">
              {analysis.roadmap.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm leading-7 text-ink-300">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-xs text-emerald-200">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="card-ay p-6">
            <h3 className="text-base text-sand-50">Quick Fixes</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {analysis.quickFixes.map((q) => (
                <li key={q} className="rounded-lg border border-white/10 bg-white/[.02] px-3 py-2 text-xs text-ink-300">
                  {q}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-6 text-ink-500">{analysis.referenceTips}</p>
            <p className="mt-2 text-[10px] text-ink-600">source: {analysis.source}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
