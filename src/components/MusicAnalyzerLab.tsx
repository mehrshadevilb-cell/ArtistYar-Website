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
  matchScore?: number;
  structureSummary: string;
  sections: Array<{ label: string; startSec: number; endSec: number; note?: string; confidence?: number }>;
  rhythm: { bpm: number | null; confidence: number; advice: string };
  density: string[];
  energyNarrative: string;
  arrangementTips: string[];
  roadmap: string[];
  learnCards?: Array<{ what: string; where?: string; why: string; learn: string; practice?: string; confidence?: number }>;
  source?: string;
};

const GENRES = ["Pop", "Persian Pop / پاپ ایرانی", "Hip-Hop / Trap", "EDM / Electronic", "Rock / Indie", "R&B / Soul", "Acoustic", "Cinematic"];
const MIX_FOCUSES = ["فول میکس", "وکال", "درامز", "باس", "مسترینگ نهایی"];
const ARR_FOCUSES = ["ساختار کلی", "تراکم سازها", "انرژی و دینامیک تنظیم", "ریتم و Groove", "نقش وکال در تنظیم"];

function EnergyBar({ label, value, color }: { label: string; value: number | null; color: string }) {
  const v = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] text-ink-400">
        <span>{label}</span>
        <span>{value == null ? "—" : `${v.toFixed(0)}%`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[.06]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

function LearnCard({ card }: { card: { what: string; where?: string; why: string; learn: string; practice?: string; confidence?: number } }) {
  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-400/[.06] p-3 text-sm text-ink-300 space-y-1.5">
      <div><span className="text-[10px] uppercase tracking-wider text-amber-200/80">What · چه چیزی</span><p className="text-sand-50">{card.what}</p></div>
      {card.where ? <div><span className="text-[10px] uppercase tracking-wider text-amber-200/80">Where · کجا</span><p>{card.where}</p></div> : null}
      <div><span className="text-[10px] uppercase tracking-wider text-amber-200/80">Why · چرا مهم است</span><p>{card.why}</p></div>
      <div><span className="text-[10px] uppercase tracking-wider text-amber-200/80">Learn · یاد بگیر</span><p>{card.learn}</p></div>
      {card.practice ? <div><span className="text-[10px] uppercase tracking-wider text-amber-200/80">Practice · تمرین</span><p>{card.practice}</p></div> : null}
      {card.confidence != null ? (
        <div className="text-[11px] text-ink-500">اطمینان تشخیص: {Math.round(card.confidence * 100)}٪</div>
      ) : null}
    </div>
  );
}

function EnergySparkline({ points }: { points: ArrangementFeatures["energyTimeline"] }) {
  if (!points.length) return null;
  const w = 320;
  const h = 48;
  const min = Math.min(...points.map((p) => p.rmsDb));
  const max = Math.max(...points.map((p) => p.rmsDb));
  const span = Math.max(1, max - min);
  const d = points
    .map((p, i) => {
      const x = (i / Math.max(1, points.length - 1)) * w;
      const y = h - ((p.rmsDb - min) / span) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full max-w-full" preserveAspectRatio="none" aria-hidden>
      <path d={d} fill="none" stroke="rgb(34 211 238 / 0.85)" strokeWidth="1.5" />
    </svg>
  );
}

export default function MusicAnalyzerLab() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") || "";
  const isAdmin = user?.role === "admin";
  const inputRef = useRef<HTMLInputElement>(null);
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
  const [arrNav, setArrNav] = useState<"overview" | "structure" | "energy" | "rhythm" | "tips">("overview");

  const quotaUrl = useMemo(() => {
    const p = new URLSearchParams();
    if (user?.id) p.set("userId", user.id);
    if (user?.telegramId) p.set("telegramId", String(user.telegramId));
    if (isAdmin) p.set("role", "admin");
    return "/api/practice/music-analyzer" + (p.toString() ? "?" + p.toString() : "");
  }, [user, isAdmin]);

  const refreshQuota = useCallback(async () => {
    try {
      const res = await fetch(quotaUrl, { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (data?.ok) {
        setQuota({
          limit: data.limit, used: data.used, remaining: data.remaining,
          pro: Boolean(data.pro), course: Boolean(data.course), admin: Boolean(data.admin),
          tier: String(data.tier || (data.admin ? "admin" : data.pro ? "pro" : data.course ? "course" : "free")),
        });
      }
    } catch { /* ignore */ }
  }, [quotaUrl]);

  useEffect(() => { void refreshQuota(); }, [refreshQuota]);

  const chooseFile = async (next: File | null) => {
    if (!next) return;
    if (next.size > 50 * 1024 * 1024) { setError("حداکثر حجم فایل 50MB است."); return; }
    setError(""); setMixAnalysis(null); setArrAnalysis(null); setMetrics(null); setArrFeatures(null); setFile(next); setMeasuring(true);
    try {
      const m = await measureAudio(next);
      setMetrics(m);
      try {
        const af = await extractArrangementFeatures(next);
        setArrFeatures(af);
      } catch { /* optional */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : "خواندن فایل صوتی ناموفق بود.");
      setFile(null);
    } finally {
      setMeasuring(false);
    }
  };

  const chooseRefFile = async (next: File | null) => {
    if (!next) { setRefFile(null); setRefMetrics(null); return; }
    if (next.size > 50 * 1024 * 1024) { setError("حداکثر حجم رفرنس 50MB است."); return; }
    setError(""); setMixAnalysis(null); setRefFile(next); setMeasuringRef(true);
    try { setRefMetrics(await measureAudio(next)); }
    catch (e) { setError(e instanceof Error ? e.message : "خواندن فایل رفرنس ناموفق بود."); setRefFile(null); setRefMetrics(null); }
    finally { setMeasuringRef(false); }
  };

  const analyze = async () => {
    if (!file || !metrics) return;
    if (!user) { setError("برای استفاده از تحلیلگر موسیقی ابتدا وارد حساب کاربری شو."); return; }
    if (!isAdmin && !quota.pro && quota.remaining <= 0) { setError("سهمیه تحلیل امروز تمام شده است."); return; }
    setLoading(true); setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("metrics", JSON.stringify(metrics));
      form.set("mode", mode);
      if (arrFeatures) form.set("arrangementFeatures", JSON.stringify({
        bpmEstimate: arrFeatures.bpmEstimate,
        bpmConfidence: arrFeatures.bpmConfidence,
        sectionCandidates: arrFeatures.sectionCandidates,
        avgRmsDb: arrFeatures.avgRmsDb,
        energyVariance: arrFeatures.energyVariance,
        energySampleCount: arrFeatures.energyTimeline.length,
      }));
      if (refMetrics && mode === "mix") form.set("refMetrics", JSON.stringify(refMetrics));
      if (refFile && mode === "mix") form.set("refName", refFile.name.slice(0, 120));
      form.set("userId", user.id);
      if (user.telegramId) form.set("telegramId", String(user.telegramId));
      if (isAdmin) form.set("role", "admin");
      form.set("genre", genre);
      form.set("focus", mode === "mix" ? mixFocus : arrFocus);
      form.set("notes", notes);
      if (projectId) form.set("projectId", projectId);
      const res = await fetch("/api/practice/music-analyzer", { method: "POST", body: form, credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (data.code === "daily_limit_reached") await refreshQuota();
        throw new Error(data.code === "daily_limit_reached"
          ? "سهمیه تحلیل امروز تمام شده. رایگان ۱، هنرجوی آموزش ۵، Pro نامحدود."
          : data.error || "تحلیل انجام نشد.");
      }
      setMetrics(data.metrics || metrics);
      if (mode === "mix") {
        setMixAnalysis(data.analysis);
        setArrAnalysis(null);
      } else {
        setArrAnalysis(data.analysis);
        setMixAnalysis(null);
      }
      if (data.quota) setQuota({ limit: data.quota.limit, used: data.quota.used, remaining: data.quota.remaining, pro: Boolean(data.quota.pro), course: Boolean(data.quota.course), admin: Boolean(data.quota.admin), tier: String(data.quota.tier || "free") });
      else await refreshQuota();
    } catch (e) { setError(e instanceof Error ? e.message : "خطا در تحلیل"); }
    finally { setLoading(false); }
  };

  const canAnalyze = Boolean(file && metrics && !measuring && !measuringRef && !loading && (isAdmin || quota.pro || quota.remaining > 0));

  return (
    <section className="mt-2">
      <Link href="/practice" className="btn-ghost !px-4 !py-2 text-xs"><ArrowLeft size={14} /> بازگشت به موتور تمرین</Link>

      <div className="mt-5 overflow-hidden rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-cyan-400/[.1] via-white/[.03] to-violet-400/[.08] p-5 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-cyan-300">AI AUDIO · دو تحلیلگر مستقل · آموزشی</p>
            <h1 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-sand-50">تحلیلگر موسیقی</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-300">
              دو بخش کاملاً جدا: <strong className="text-sand-100">میکس و مسترینگ</strong> برای تکنیک صدا، و <strong className="text-sand-100">تنظیم (Arrangement)</strong> برای ساختار و جریان موسیقی.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-right">
            <div className="text-[10px] uppercase tracking-[.2em] text-ink-500">تحلیل روزانه</div>
            <div className="mt-1 text-lg font-semibold text-cyan-100">{isAdmin || quota.admin || quota.pro ? "∞" : `${quota.remaining} / ${quota.limit}`}</div>
            <div className="text-[11px] text-ink-500">{isAdmin || quota.admin ? "ادمین · بدون محدودیت" : quota.pro ? "Pro · تا پایان اشتراک" : quota.course ? "هنرجوی آموزش · ۵ بار در روز" : "رایگان · ۱ بار در روز"}</div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-black/20 p-1.5">
          <button type="button" onClick={() => setMode("mix")} className={`flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition ${mode === "mix" ? "bg-cyan-400/90 text-black" : "text-ink-300 hover:bg-white/[.04]"}`}>
            <Waves size={16} /> میکس و مسترینگ
          </button>
          <button type="button" onClick={() => setMode("arrangement")} className={`flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition ${mode === "arrangement" ? "bg-violet-400/90 text-black" : "text-ink-300 hover:bg-white/[.04]"}`}>
            <Layers size={16} /> تنظیم · Arrangement
          </button>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <button type="button" onClick={() => inputRef.current?.click()} className="group flex min-h-48 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-300/35 bg-black/20 p-6 text-center transition hover:border-cyan-200/70 hover:bg-cyan-400/[.06]">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200"><Upload size={25} /></span>
              <strong className="mt-4 text-base text-sand-50">{file ? file.name : "آپلود فایل موسیقی"}</strong>
              <span className="mt-2 text-xs text-ink-500">MP3 · WAV · M4A · FLAC · OGG · حداکثر 50MB</span>
              {measuring ? (<span className="mt-4 flex items-center gap-2 text-xs text-cyan-200"><Loader2 size={14} className="animate-spin" /> استخراج متریک و ویژگی‌های زمانی…</span>)
                : file && metrics ? (<span className="mt-4 flex items-center gap-2 text-xs text-emerald-200"><CheckCircle2 size={14} /> آماده · {metrics.durationSec.toFixed(1)}s · Peak {metrics.peakDbfs.toFixed(1)}</span>) : null}
            </button>
            <input ref={inputRef} className="hidden" type="file" accept="audio/*,.flac,.m4a" onChange={(e) => void chooseFile(e.target.files?.[0] || null)} />

            {mode === "mix" ? (
              <div className="mt-3">
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

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs text-ink-500">ژانر / سبک</span>
                <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-sand-50">
                  {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-ink-500">تمرکز تحلیل</span>
                <select
                  value={mode === "mix" ? mixFocus : arrFocus}
                  onChange={(e) => (mode === "mix" ? setMixFocus(e.target.value) : setArrFocus(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-sand-50"
                >
                  {(mode === "mix" ? MIX_FOCUSES : ARR_FOCUSES).map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </label>
            </div>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-xs text-ink-500">توضیح / مشکل (اختیاری)</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder={mode === "mix" ? "مثلاً: وکال گم می‌شود، بیس گل‌آلود است..." : "مثلاً: کورس ضعیف است، تنظیم یکنواخت است..."} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-sand-50 placeholder:text-ink-600" />
            </label>
            <button type="button" disabled={!canAnalyze} onClick={() => void analyze()} className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-medium text-black transition disabled:opacity-40 ${mode === "mix" ? "bg-cyan-400/90 hover:bg-cyan-300" : "bg-violet-400/90 hover:bg-violet-300"}`}>
              {loading ? <><Loader2 size={16} className="animate-spin" /> در حال تحلیل…</> : mode === "mix" ? <><Sparkles size={16} /> تحلیل میکس و مسترینگ</> : <><Music2 size={16} /> تحلیل تنظیم</>}
            </button>
            {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
            {!user ? (
              <p className="mt-3 flex items-center gap-2 text-xs text-ink-400"><LockKeyhole size={12} /> برای تحلیل باید وارد حساب شوی.</p>
            ) : null}
          </div>

          <div className="space-y-4">
            {metrics ? (
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs text-ink-500"><Gauge size={14} /> متریک‌های مشترک فایل</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-white/[.03] px-3 py-2"><div className="text-[10px] text-ink-500">Peak</div><div className="font-medium text-sand-50">{metrics.peakDbfs.toFixed(1)} dBFS</div></div>
                  <div className="rounded-lg bg-white/[.03] px-3 py-2"><div className="text-[10px] text-ink-500">True Peak</div><div className="font-medium text-sand-50">{metrics.truePeakDbfs?.toFixed(1) ?? "—"} dBTP</div></div>
                  <div className="rounded-lg bg-white/[.03] px-3 py-2"><div className="text-[10px] text-ink-500">RMS</div><div className="font-medium text-sand-50">{metrics.rmsDbfs.toFixed(1)} dBFS</div></div>
                  <div className="rounded-lg bg-white/[.03] px-3 py-2"><div className="text-[10px] text-ink-500">Crest</div><div className="font-medium text-sand-50">{metrics.crestFactorDb.toFixed(1)} dB</div></div>
                  <div className="rounded-lg bg-white/[.03] px-3 py-2"><div className="text-[10px] text-ink-500">≈LUFS</div><div className="font-medium text-sand-50">{metrics.approxLufs?.toFixed(1) ?? "—"}</div></div>
                  <div className="rounded-lg bg-white/[.03] px-3 py-2"><div className="text-[10px] text-ink-500">Headroom</div><div className="font-medium text-sand-50">{metrics.headroomDb?.toFixed(1) ?? "—"} dB</div></div>
                </div>
                {metrics.bandEnergy ? (
                  <div className="mt-4 space-y-2">
                    <EnergyBar label="Sub" value={metrics.bandEnergy.sub} color="bg-rose-400/80" />
                    <EnergyBar label="Low" value={metrics.bandEnergy.low} color="bg-orange-400/80" />
                    <EnergyBar label="Mid" value={metrics.bandEnergy.mid} color="bg-cyan-400/80" />
                    <EnergyBar label="High / Air" value={(metrics.bandEnergy.high ?? 0) + (metrics.bandEnergy.air ?? 0)} color="bg-violet-400/80" />
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center text-sm text-ink-500">
                پس از آپلود، متریک‌های واقعی اینجا نمایش داده می‌شود.
              </div>
            )}

            {mode === "arrangement" && arrFeatures ? (
              <div className="rounded-2xl border border-violet-400/20 bg-violet-400/[.06] p-4">
                <div className="mb-2 flex items-center gap-2 text-xs text-violet-200/80"><BarChart3 size={14} /> منحنی انرژی (تنظیم)</div>
                <EnergySparkline points={arrFeatures.energyTimeline} />
                <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-ink-400">
                  <span>BPM تخمینی: {arrFeatures.bpmEstimate ?? "—"} {arrFeatures.bpmEstimate != null ? `(اطمینان ${Math.round(arrFeatures.bpmConfidence * 100)}٪)` : ""}</span>
                  <span>بخش‌های کاندید: {arrFeatures.sectionCandidates.length}</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {mode === "mix" && mixAnalysis ? (
        <div className="mt-6 rounded-3xl border border-cyan-400/20 bg-black/30 p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-sand-50 flex items-center gap-2"><Waves size={18} /> نتیجه میکس و مسترینگ</h2>
            {mixAnalysis.matchScore != null ? (
              <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-sm text-cyan-100">امتیاز: {mixAnalysis.matchScore}</div>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-ink-300">{mixAnalysis.fileSummary}</p>

          <div className="mt-4 flex flex-wrap gap-2 overflow-x-auto pb-1">
            {(["overview", "loudness", "spectrum", "advice", "stereo", "reference"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setMixNav(k)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${mixNav === k ? "bg-cyan-400/90 text-black" : "border border-white/10 text-ink-400"}`}>
                {{ overview: "Overview", loudness: "Loudness", spectrum: "Spectrum", advice: "EQ / Advice", stereo: "Stereo", reference: "Reference" }[k]}
              </button>
            ))}
          </div>

          {(mixNav === "overview" || mixNav === "loudness") ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/8 bg-white/[.02] p-4 text-sm text-ink-300 space-y-1">
                <div className="text-xs text-ink-500 mb-1">Loudness</div>
                <div>Peak: {mixAnalysis.loudness?.peak}</div>
                <div>RMS: {mixAnalysis.loudness?.rms}</div>
                <div>Crest: {mixAnalysis.loudness?.crest}</div>
                {mixAnalysis.loudness?.truePeak ? <div>True Peak: {mixAnalysis.loudness.truePeak}</div> : null}
                {mixAnalysis.loudness?.targetLufs ? <div>هدف: {mixAnalysis.loudness.targetLufs}</div> : null}
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[.02] p-4 text-sm text-ink-300 space-y-1">
                <div className="text-xs text-ink-500 mb-1">Dynamics / Clip</div>
                <div>{mixAnalysis.dynamics}</div>
                <div>{mixAnalysis.clipping}</div>
              </div>
            </div>
          ) : null}

          {(mixNav === "spectrum" || mixNav === "overview") ? (
            <div className="mt-4 rounded-xl border border-white/8 bg-white/[.02] p-4 text-sm text-ink-300">
              <div className="text-xs text-ink-500 mb-1">تونال</div>
              <div>{mixAnalysis.tonal?.summary}</div>
            </div>
          ) : null}

          {(mixNav === "stereo" || mixNav === "overview") ? (
            <div className="mt-4 rounded-xl border border-white/8 bg-white/[.02] p-4 text-sm text-ink-300">
              <div className="text-xs text-ink-500 mb-1">استریو / فاز</div>
              <div>{mixAnalysis.stereo?.advice}</div>
              {mixAnalysis.stereo?.correlation != null ? <div className="text-xs text-ink-500 mt-1">Correlation: {mixAnalysis.stereo.correlation.toFixed(2)}</div> : null}
            </div>
          ) : null}

          {(mixNav === "advice" || mixNav === "overview") && mixAnalysis.eq?.length ? (
            <div className="mt-4"><div className="text-xs text-ink-500 mb-2">پیشنهاد EQ</div><ul className="space-y-2 text-sm text-ink-300">{mixAnalysis.eq.map((x, i) => <li key={i} className="rounded-lg border border-white/10 bg-white/[.02] px-3 py-2">{x}</li>)}</ul></div>
          ) : null}

          {mixAnalysis.mixBalance?.length && (mixNav === "advice" || mixNav === "overview") ? (
            <div className="mt-4"><div className="text-xs text-ink-500 mb-2">تعادل میکس</div><ul className="space-y-2 text-sm text-ink-300">{mixAnalysis.mixBalance.map((x, i) => <li key={i} className="rounded-lg border border-white/10 bg-white/[.02] px-3 py-2"><b className="text-sand-50">{x.element}:</b> {x.advice}</li>)}</ul></div>
          ) : null}

          {mixAnalysis.roadmap?.length ? (
            <div className="mt-4"><div className="text-xs text-ink-500 mb-2">نقشه قدم‌به‌قدم</div><ol className="list-decimal list-inside space-y-2 text-sm text-ink-300">{mixAnalysis.roadmap.map((x, i) => <li key={i}>{x}</li>)}</ol></div>
          ) : null}

          {mixAnalysis.learnCards?.length ? (
            <div className="mt-4 space-y-3">
              <div className="text-xs text-ink-500">لایه آموزشی</div>
              {mixAnalysis.learnCards.map((c, i) => <LearnCard key={i} card={c} />)}
            </div>
          ) : null}

          {mixAnalysis.quickFixes?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">{mixAnalysis.quickFixes.map((x, i) => <span key={i} className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">{x}</span>)}</div>
          ) : null}
          {mixAnalysis.referenceTips ? <p className="mt-4 text-xs leading-6 text-ink-500">{mixAnalysis.referenceTips}</p> : null}
        </div>
      ) : null}

      {mode === "arrangement" && arrAnalysis ? (
        <div className="mt-6 rounded-3xl border border-violet-400/20 bg-black/30 p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-sand-50 flex items-center gap-2"><Layers size={18} /> نتیجه تنظیم (Arrangement)</h2>
            {arrAnalysis.matchScore != null ? (
              <div className="rounded-full border border-violet-400/30 bg-violet-400/10 px-4 py-1 text-sm text-violet-100">امتیاز ساختار: {arrAnalysis.matchScore}</div>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-ink-300">{arrAnalysis.fileSummary}</p>

          <div className="mt-4 flex flex-wrap gap-2 overflow-x-auto pb-1">
            {(["overview", "structure", "energy", "rhythm", "tips"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setArrNav(k)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${arrNav === k ? "bg-violet-400/90 text-black" : "border border-white/10 text-ink-400"}`}>
                {{ overview: "Overview", structure: "Structure", energy: "Energy", rhythm: "Rhythm", tips: "Tips" }[k]}
              </button>
            ))}
          </div>

          {(arrNav === "overview" || arrNav === "structure") ? (
            <div className="mt-4 rounded-xl border border-white/8 bg-white/[.02] p-4 text-sm text-ink-300">
              <div className="text-xs text-ink-500 mb-2">ساختار</div>
              <p>{arrAnalysis.structureSummary}</p>
              {arrAnalysis.sections?.length ? (
                <ul className="mt-3 space-y-2">
                  {arrAnalysis.sections.map((s, i) => (
                    <li key={i} className="rounded-lg border border-violet-400/15 bg-violet-400/[.05] px-3 py-2">
                      <b className="text-sand-50">{s.label}</b>
                      <span className="text-ink-500 text-xs mr-2"> · {s.startSec.toFixed(1)}s – {s.endSec.toFixed(1)}s</span>
                      {s.note ? <div className="text-xs mt-1">{s.note}</div> : null}
                      {s.confidence != null ? <div className="text-[11px] text-ink-500">اطمینان: {Math.round(s.confidence * 100)}٪</div> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {(arrNav === "rhythm" || arrNav === "overview") ? (
            <div className="mt-4 rounded-xl border border-white/8 bg-white/[.02] p-4 text-sm text-ink-300">
              <div className="text-xs text-ink-500 mb-1">ریتم</div>
              <div>BPM: {arrAnalysis.rhythm?.bpm ?? "نامشخص"} {arrAnalysis.rhythm?.confidence != null ? `(اطمینان ${Math.round(arrAnalysis.rhythm.confidence * 100)}٪)` : ""}</div>
              <div className="mt-1">{arrAnalysis.rhythm?.advice}</div>
            </div>
          ) : null}

          {(arrNav === "energy" || arrNav === "overview") ? (
            <div className="mt-4 rounded-xl border border-white/8 bg-white/[.02] p-4 text-sm text-ink-300">
              <div className="text-xs text-ink-500 mb-1">انرژی و تراکم</div>
              <p>{arrAnalysis.energyNarrative}</p>
              {arrAnalysis.density?.length ? (
                <ul className="mt-2 space-y-1 list-disc list-inside">{arrAnalysis.density.map((d, i) => <li key={i}>{d}</li>)}</ul>
              ) : null}
            </div>
          ) : null}

          {(arrNav === "tips" || arrNav === "overview") && arrAnalysis.arrangementTips?.length ? (
            <div className="mt-4"><div className="text-xs text-ink-500 mb-2">پیشنهاد تنظیم</div><ul className="space-y-2 text-sm text-ink-300">{arrAnalysis.arrangementTips.map((x, i) => <li key={i} className="rounded-lg border border-violet-400/20 bg-violet-400/[.06] px-3 py-2">{x}</li>)}</ul></div>
          ) : null}

          {arrAnalysis.roadmap?.length ? (
            <div className="mt-4"><div className="text-xs text-ink-500 mb-2">نقشه تنظیم</div><ol className="list-decimal list-inside space-y-2 text-sm text-ink-300">{arrAnalysis.roadmap.map((x, i) => <li key={i}>{x}</li>)}</ol></div>
          ) : null}

          {arrAnalysis.learnCards?.length ? (
            <div className="mt-4 space-y-3">
              <div className="text-xs text-ink-500">لایه آموزشی</div>
              {arrAnalysis.learnCards.map((c, i) => <LearnCard key={i} card={c} />)}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
