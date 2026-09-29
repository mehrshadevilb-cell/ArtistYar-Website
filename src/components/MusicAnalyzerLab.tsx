"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft, BarChart3, CheckCircle2, Gauge, Loader2,
  LockKeyhole, Music2, Sparkles, Target, Upload, Waves, Layers,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  measureAudio,
  extractArrangementFeatures,
  type AudioMetrics,
  type ArrangementFeatures,
} from "@/lib/audio-metrics";

type AnalyzerMode = "mix" | "arrangement";

type MixAnalysis = {
  fileSummary: string;
  matchScore?: number;
  descriptors?: { tonal: string; stereo: string; dynamics: string; loudness: string };
  loudness: { peak: string; rms: string; crest: string; targetLufs?: string; truePeak?: string };
  tonal: { summary: string; low: number | null; mid: number | null; high: number | null; centroid: number | null };
  stereo: { correlation: number | null; advice: string };
  dynamics: string;
  clipping: string;
  compression?: { summary: string; attack: string; release: string; ratio: string; thresholdHint: string };
  eq: string[];
  mixBalance?: Array<{ element: string; advice: string }>;
  arrangement?: string[];
  roadmap: string[];
  quickFixes?: string[];
  referenceTips?: string;
  source?: string;
  learnCards?: Array<{ what: string; where?: string; why: string; learn: string; practice?: string; confidence?: number }>;
};

type ArrangementAnalysis = {
  fileSummary: string;
  structure: string;
  energy: string;
  rhythm: string;
  tips: string[];
  roadmap: string[];
  source?: string;
};

const GENRES = ["پاپ", "هیپ‌هاپ", "الکترونیک", "راک", "کلاسیک", "سنتی/فولک", "سایر"];
const MIX_FOCUSES = ["بالانس کلی", "وکال", "بیس و درام", "استریو و فضا", "دینامیک و کمپرس", "EQ و تونال"];
const ARR_FOCUSES = ["ساختار و فرم", "انرژی و دینامیک", "ریتم و گروو", "لایه‌بندی و بافت", "انتقال‌ها"];

export default function MusicAnalyzerLab() {
  const { user, ready } = useAuth();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<AnalyzerMode>("mix");
  const [file, setFile] = useState<File | null>(null);
  const [genre, setGenre] = useState(GENRES[0]);
  const [mixFocus, setMixFocus] = useState(MIX_FOCUSES[0]);
  const [arrFocus, setArrFocus] = useState(ARR_FOCUSES[0]);
  const [notes, setNotes] = useState("");
  const [metrics, setMetrics] = useState<AudioMetrics | null>(null);
  const [arrFeatures, setArrFeatures] = useState<ArrangementFeatures | null>(null);
  const [refFile, setRefFile] = useState<File | null>(null);
  const [refMetrics, setRefMetrics] = useState<AudioMetrics | null>(null);
  const [measuringRef, setMeasuringRef] = useState(false);
  const [mixAnalysis, setMixAnalysis] = useState<MixAnalysis | null>(null);
  const [arrAnalysis, setArrAnalysis] = useState<ArrangementAnalysis | null>(null);
  const [quota, setQuota] = useState({ limit: 1, used: 0, remaining: 1, pro: false, course: false, admin: false, tier: "free" as string });
  const [loading, setLoading] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [error, setError] = useState("");
  const [mixNav, setMixNav] = useState<"overview" | "loudness" | "spectrum" | "advice" | "stereo" | "reference">("overview");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [arrNav, setArrNav] = useState<"overview" | "structure" | "energy" | "rhythm" | "tips">("overview");

  const isAdmin = Boolean(user?.role === "admin" || quota.admin);

  useEffect(() => {
    const m = searchParams.get("mode");
    if (m === "arrangement" || m === "mix") setMode(m);
  }, [searchParams]);

  useEffect(() => {
    if (!ready || !user) return;
    void (async () => {
      try {
        const res = await fetch("/api/music-analyzer/quota");
        if (res.ok) {
          const data = await res.json();
          setQuota({
            limit: data.limit ?? 1,
            used: data.used ?? 0,
            remaining: data.remaining ?? 1,
            pro: Boolean(data.pro),
            course: Boolean(data.course),
            admin: Boolean(data.admin),
            tier: data.tier ?? "free",
          });
        }
      } catch { /* ignore */ }
    })();
  }, [ready, user]);

  const chooseFile = useCallback(async (next: File | null) => {
    if (!next) return;
    if (next.size > 50 * 1024 * 1024) { setError("حداکثر حجم فایل 50MB است."); return; }
    setError(""); setMixAnalysis(null); setArrAnalysis(null); setMetrics(null); setArrFeatures(null); setFile(next); setMeasuring(true);
    try {
      const m = await measureAudio(next);
      setMetrics(m);
      if (mode === "arrangement") {
        const f = await extractArrangementFeatures(next);
        setArrFeatures(f);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "خواندن فایل صوتی ناموفق بود.");
      setFile(null); setMetrics(null); setArrFeatures(null);
    } finally {
      setMeasuring(false);
    }
  }, [mode]);

  const chooseRefFile = useCallback(async (next: File | null) => {
    if (!next) return;
    if (next.size > 50 * 1024 * 1024) { setError("حداکثر حجم رفرنس 50MB است."); return; }
    setError(""); setMixAnalysis(null); setRefFile(next); setMeasuringRef(true);
    try { setRefMetrics(await measureAudio(next)); }
    catch (e) { setError(e instanceof Error ? e.message : "خواندن فایل رفرنس ناموفق بود."); setRefFile(null); setRefMetrics(null); }
    finally { setMeasuringRef(false); }
  }, []);

  const analyze = useCallback(async () => {
    if (!file || !metrics) return;
    if (!user) { setError("برای استفاده از تحلیلگر موسیقی ابتدا وارد حساب کاربری شو."); return; }
    if (!isAdmin && !quota.pro && quota.remaining <= 0) { setError("سهمیه تحلیل امروز تمام شده است."); return; }
    setLoading(true); setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("mode", mode);
      form.append("genre", genre);
      form.append("notes", notes);
      if (mode === "mix") {
        form.append("focus", mixFocus);
        if (refFile) form.append("reference", refFile);
      } else {
        form.append("focus", arrFocus);
      }
      form.append("metrics", JSON.stringify(metrics));
      if (arrFeatures) form.append("arrFeatures", JSON.stringify(arrFeatures));
      if (refMetrics) form.append("refMetrics", JSON.stringify(refMetrics));

      const res = await fetch("/api/music-analyzer", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : data.error || "تحلیل انجام نشد."
        );
      }
      if (mode === "mix") {
        setMixAnalysis(data.analysis as MixAnalysis);
        setArrAnalysis(null);
      } else {
        setArrAnalysis(data.analysis as ArrangementAnalysis);
        setMixAnalysis(null);
      }
      if (data.quota) {
        setQuota((q) => ({
          ...q,
          used: data.quota.used ?? q.used,
          remaining: data.quota.remaining ?? q.remaining,
          limit: data.quota.limit ?? q.limit,
        }));
      }
    } catch (e) { setError(e instanceof Error ? e.message : "خطا در تحلیل"); }
    finally { setLoading(false); }
  }, [file, metrics, user, isAdmin, quota, mode, genre, notes, mixFocus, arrFocus, refFile, arrFeatures, refMetrics]);

  const canAnalyze = Boolean(file && metrics && !measuring && !measuringRef && !loading && (isAdmin || quota.pro || quota.remaining > 0));

  return (
    <section className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setMode("mix")} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              mode === "mix" ? "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/40" : "bg-white/5 text-ink-400 hover:text-sand-50"
            }`}><Waves size={14} className="ml-1 inline" /> میکس و مسترینگ</button>
            <button type="button" onClick={() => setMode("arrangement")} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              mode === "arrangement" ? "bg-violet-400/20 text-violet-100 ring-1 ring-violet-300/40" : "bg-white/5 text-ink-400 hover:text-sand-50"
            }`}><Layers size={14} className="ml-1 inline" /> تنظیم / آرنژ</button>
          </div>

          <div className="mt-4">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex w-full items-center gap-3 rounded-xl border border-dashed border-white/20 bg-black/20 px-4 py-4 text-right transition hover:border-cyan-300/40 hover:bg-cyan-400/[.06]">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-200"><Upload size={20} /></span>
              <span className="min-w-0 flex-1">
                <strong className="block text-sm text-sand-50">{file ? file.name : "آپلود فایل صوتی"}</strong>
                <span className="text-[11px] text-ink-500">MP3 · WAV · FLAC · M4A · تا ۵۰ مگابایت</span>
                {measuring ? (<span className="mt-1 flex items-center gap-1 text-[11px] text-cyan-200"><Loader2 size={12} className="animate-spin" /> در حال خواندن…</span>)
                  : metrics ? (<span className="mt-1 text-[11px] text-emerald-200">Peak {metrics.peakDbfs.toFixed(1)} · RMS {metrics.rmsDbfs.toFixed(1)}</span>) : null}
              </span>
            </button>
            <input ref={fileInputRef} className="hidden" type="file" accept="audio/*,.flac,.m4a" onChange={(e) => void chooseFile(e.target.files?.[0] || null)} />
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-ink-300 transition hover:border-white/20 hover:text-sand-50"
              aria-expanded={showAdvanced}
            >
              <span className="font-medium">تنظیمات پیشرفته</span>
              <span className="text-xs text-ink-500">{showAdvanced ? "بستن" : "ژانر · فوکوس · رفرنس · یادداشت"}</span>
            </button>
            {showAdvanced ? (
              <div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                {mode === "mix" ? (
                  <div>
                    <button type="button" onClick={() => refInputRef.current?.click()} className="flex w-full items-center gap-3 rounded-xl border border-dashed border-violet-300/30 bg-black/15 px-4 py-3 text-right transition hover:border-violet-200/50 hover:bg-violet-400/[.06]">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-200"><Target size={18} /></span>
                      <span className="min-w-0 flex-1">
                        <strong className="block text-sm text-sand-50">{refFile ? refFile.name : "رفرنس (اختیاری)"}</strong>
                        <span className="text-[11px] text-ink-500">فقط برای میکس و مسترینگ · مقایسه با ترک مرجع</span>
                        {measuringRef ? (<span className="mt-1 flex items-center gap-1 text-[11px] text-violet-200"><Loader2 size={12} className="animate-spin" /> در حال خواندن…</span>)
                          : refMetrics ? (<span className="mt-1 text-[11px] text-emerald-200">Peak {refMetrics.peakDbfs.toFixed(1)} · RMS {refMetrics.rmsDbfs.toFixed(1)}</span>) : null}
                      </span>
                    </button>
                    <input ref={refInputRef} className="hidden" type="file" accept="audio/*,.flac,.m4a" onChange={(e) => void chooseRefFile(e.target.files?.[0] || null)} />
                  </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs text-ink-500">ژانر / سبک</span>
                    <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-sand-50">
                      {GENRES.map((g) => (<option key={g} value={g}>{g}</option>))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs text-ink-500">فوکوس تحلیل</span>
                    <select
                      value={mode === "mix" ? mixFocus : arrFocus}
                      onChange={(e) => (mode === "mix" ? setMixFocus(e.target.value) : setArrFocus(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-sand-50"
                    >
                      {(mode === "mix" ? MIX_FOCUSES : ARR_FOCUSES).map((f) => (<option key={f} value={f}>{f}</option>))}
                    </select>
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-xs text-ink-500">توضیح / مشکل (اختیاری)</span>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-sand-50" placeholder="مثلاً: وکال در میکس گم می‌شود…" />
                </label>
              </div>
            ) : null}
          </div>

          <button type="button" disabled={!canAnalyze} onClick={() => void analyze()} className="btn-primary mt-5 w-full disabled:opacity-40">
            {loading ? (<span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> در حال تحلیل…</span>) : !user ? "برای تحلیل وارد شو" : (!isAdmin && !quota.pro && quota.remaining <= 0) ? "سهمیه امروز تمام شده" : mode === "mix" ? "شروع تحلیل میکس و مسترینگ" : "شروع تحلیل تنظیم"}
          </button>
          {error ? (
            <div className="mt-3 rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-100" role="alert">
              <p className="font-medium">تحلیل انجام نشد</p>
              <p className="mt-1 text-red-200/90">{error}</p>
              <p className="mt-2 text-xs text-red-200/70">فایل و تنظیماتت حفظ شده‌اند — می‌توانی دوباره تلاش کنی.</p>
            </div>
          ) : null}
          {!user ? (
            <p className="mt-3 flex items-center gap-2 text-xs text-ink-400"><LockKeyhole size={14} /> برای تحلیل کامل باید وارد حساب شوی. <Link href="/login" className="text-gold-400 hover:text-gold-300">ورود</Link></p>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-sm text-sand-50"><Gauge size={16} className="text-cyan-300" /> متریک‌های فایل</div>
            {metrics ? (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-ink-300">
                <div>مدت: {metrics.durationSec.toFixed(1)}s</div>
                <div>Peak: {metrics.peakDbfs.toFixed(1)} dBFS</div>
                <div>RMS: {metrics.rmsDbfs.toFixed(1)} dBFS</div>
                <div>Crest: {metrics.crestFactorDb.toFixed(1)} dB</div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-ink-500">پس از آپلود فایل، متریک‌ها اینجا نمایش داده می‌شوند.</p>
            )}
          </div>
          {user && (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-ink-400">
              سهمیه امروز: {isAdmin || quota.pro ? "نامحدود" : `${quota.remaining} از ${quota.limit}`}
            </div>
          )}
        </div>
      </div>

      {mixAnalysis ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-semibold text-sand-50">نتیجه تحلیل میکس</h3>
          <p className="mt-2 text-sm text-ink-300">{mixAnalysis.fileSummary}</p>
          {mixAnalysis.roadmap?.length ? (
            <ul className="mt-4 list-disc space-y-1 pr-5 text-sm text-ink-300">
              {mixAnalysis.roadmap.map((r, i) => (<li key={i}>{r}</li>))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {arrAnalysis ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-semibold text-sand-50">نتیجه تحلیل تنظیم</h3>
          <p className="mt-2 text-sm text-ink-300">{arrAnalysis.fileSummary}</p>
          {arrAnalysis.tips?.length ? (
            <ul className="mt-4 list-disc space-y-1 pr-5 text-sm text-ink-300">
              {arrAnalysis.tips.map((t, i) => (<li key={i}>{t}</li>))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
