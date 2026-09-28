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
            <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-sand-50">تحلیلگر موسیقی</h2>
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
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-sand-50" placeholder="مثلاً: وکال در میکس گم می‌شود…" />
            </label>

            <button type="button" disabled={!canAnalyze} onClick={() => void analyze()} className="btn-primary mt-5 w-full disabled:opacity-40">
              {loading ? (<span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> در حال تحلیل…</span>) : !user ? "برای تحلیل وارد شو" : (!isAdmin && !quota.pro && quota.remaining <= 0) ? "سهمیه امروز تمام شده" : mode === "mix" ? "شروع تحلیل میکس و مسترینگ" : "شروع تحلیل تنظیم"}
            </button>
            {error ? <p className="mt-3 text-sm text-red-300" role="alert">{error}</p> : null}
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
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2 text-sm text-sand-50"><Sparkles size={16} className="text-violet-300" /> راهنما</div>
              <p className="mt-2 text-xs leading-6 text-ink-400">تحلیل آموزشی است و جایگزین گوش حرفه‌ای نیست. برای پروژهٔ واقعی، نتایج را با مرجع و تمرین روی فایل خودت ترکیب کن.</p>
            </div>
          </div>
        </div>
      </div>

      {mixAnalysis ? (
        <div className="mt-8 space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["overview", "loudness", "spectrum", "advice", "stereo", "reference"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setMixNav(k)} className={`rounded-full px-3 py-1.5 text-xs ${mixNav === k ? "bg-cyan-400/90 text-black" : "border border-white/10 text-ink-400"}`}>
                {k === "overview" ? "خلاصه" : k === "loudness" ? "لودنس" : k === "spectrum" ? "طیف" : k === "advice" ? "پیشنهادها" : k === "stereo" ? "استریو" : "رفرنس"}
              </button>
            ))}
          </div>
          <div className="card-ay p-5 sm:p-6">
            {mixNav === "overview" ? (
              <div className="space-y-3 text-sm leading-7 text-ink-300">
                <p className="text-sand-50">{mixAnalysis.fileSummary}</p>
                {mixAnalysis.matchScore != null ? <p>امتیاز تطبیق: {mixAnalysis.matchScore}</p> : null}
                <p>{mixAnalysis.dynamics}</p>
                <p>{mixAnalysis.clipping}</p>
              </div>
            ) : null}
            {mixNav === "loudness" ? (
              <div className="space-y-2 text-sm text-ink-300">
                <p>Peak: {mixAnalysis.loudness.peak}</p>
                <p>RMS: {mixAnalysis.loudness.rms}</p>
                <p>Crest: {mixAnalysis.loudness.crest}</p>
                {mixAnalysis.loudness.targetLufs ? <p>هدف LUFS: {mixAnalysis.loudness.targetLufs}</p> : null}
              </div>
            ) : null}
            {mixNav === "spectrum" ? (
              <div className="space-y-3">
                <p className="text-sm text-ink-300">{mixAnalysis.tonal.summary}</p>
                <EnergyBar label="Low" value={mixAnalysis.tonal.low} color="bg-cyan-400" />
                <EnergyBar label="Mid" value={mixAnalysis.tonal.mid} color="bg-gold-400" />
                <EnergyBar label="High" value={mixAnalysis.tonal.high} color="bg-violet-400" />
              </div>
            ) : null}
            {mixNav === "advice" ? (
              <ul className="space-y-2 text-sm leading-7 text-ink-300">
                {(mixAnalysis.quickFixes || mixAnalysis.eq || []).map((item, i) => <li key={i}>• {item}</li>)}
                {(mixAnalysis.roadmap || []).map((item, i) => <li key={`r-${i}`}>→ {item}</li>)}
              </ul>
            ) : null}
            {mixNav === "stereo" ? (
              <p className="text-sm leading-7 text-ink-300">{mixAnalysis.stereo.advice}</p>
            ) : null}
            {mixNav === "reference" ? (
              <p className="text-sm leading-7 text-ink-300">{mixAnalysis.referenceTips || "رفرنس بارگذاری نشده است."}</p>
            ) : null}
          </div>
          {mixAnalysis.learnCards?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {mixAnalysis.learnCards.map((c, i) => <LearnCard key={i} card={c} />)}
            </div>
          ) : null}
        </div>
      ) : null}

      {arrAnalysis ? (
        <div className="mt-8 space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["overview", "structure", "energy", "rhythm", "tips"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setArrNav(k)} className={`rounded-full px-3 py-1.5 text-xs ${arrNav === k ? "bg-violet-400/90 text-black" : "border border-white/10 text-ink-400"}`}>
                {k === "overview" ? "خلاصه" : k === "structure" ? "ساختار" : k === "energy" ? "انرژی" : k === "rhythm" ? "ریتم" : "نکات"}
              </button>
            ))}
          </div>
          <div className="card-ay p-5 sm:p-6 text-sm leading-7 text-ink-300">
            {arrNav === "overview" ? <p className="text-sand-50">{arrAnalysis.fileSummary}</p> : null}
            {arrNav === "structure" ? <p>{arrAnalysis.structureSummary}</p> : null}
            {arrNav === "energy" ? <p>{arrAnalysis.energyNarrative}</p> : null}
            {arrNav === "rhythm" ? <p>{arrAnalysis.rhythm.advice}</p> : null}
            {arrNav === "tips" ? (
              <ul className="space-y-2">{(arrAnalysis.arrangementTips || []).map((t, i) => <li key={i}>• {t}</li>)}</ul>
            ) : null}
          </div>
          {arrAnalysis.learnCards?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {arrAnalysis.learnCards.map((c, i) => <LearnCard key={i} card={c} />)}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
