"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, AudioWaveform, BarChart3, CheckCircle2, Gauge, Loader2,
  LockKeyhole, Sparkles, Target, Upload, Waves, Zap,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

type Metrics = {
  durationSec: number; sampleRate: number; channels: number;
  peakDbfs: number; truePeakDbfs: number | null; rmsDbfs: number; crestFactorDb: number;
  stereoCorrelation: number | null; stereoWidth: number | null;
  spectralCentroidHz: number | null;
  lowEnergyPct: number | null; midEnergyPct: number | null; highEnergyPct: number | null;
  clipPct: number | null;
  bandEnergy: { sub: number; low: number; lowMid: number; mid: number; presence: number; high: number; air: number } | null;
  approxLufs: number | null; loudnessRangeProxy: number | null;
};

type Analysis = {
  fileSummary: string; matchScore?: number;
  descriptors?: { tonal: string; stereo: string; dynamics: string; loudness: string };
  loudness: { peak: string; rms: string; crest: string; targetLufs?: string; truePeak?: string };
  tonal: { summary: string; low: number | null; mid: number | null; high: number | null; centroid: number | null };
  stereo: { correlation: number | null; advice: string };
  dynamics: string; clipping: string;
  compression?: { summary: string; attack: string; release: string; ratio: string; thresholdHint: string };
  eq: string[]; mixBalance?: Array<{ element: string; advice: string }>;
  arrangement?: string[]; // پیشنهادهای تنظیم (نه فقط میکس/مستر)
  roadmap: string[]; quickFixes?: string[]; referenceTips?: string; source?: string;
};

const GENRES = ["Pop", "Persian Pop / پاپ ایرانی", "Hip-Hop / Trap", "EDM / Electronic", "Rock / Indie", "R&B / Soul", "Acoustic", "Cinematic"];
const FOCUSES = ["فول میکس", "تنظیم / Arrangement", "وکال", "درامز", "باس", "مسترینگ نهایی"];
const toDb = (v: number) => 20 * Math.log10(Math.max(v, 1e-12));

function fftMag(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wlenRe = Math.cos(ang), wlenIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wRe = 1, wIm = 0;
      for (let j = 0; j < len / 2; j++) {
        const uRe = re[i + j], uIm = im[i + j];
        const vRe = re[i + j + len / 2] * wRe - im[i + j + len / 2] * wIm;
        const vIm = re[i + j + len / 2] * wIm + im[i + j + len / 2] * wRe;
        re[i + j] = uRe + vRe; im[i + j] = uIm + vIm;
        re[i + j + len / 2] = uRe - vRe; im[i + j + len / 2] = uIm - vIm;
        const nwRe = wRe * wlenRe - wIm * wlenIm;
        wIm = wRe * wlenIm + wIm * wlenRe; wRe = nwRe;
      }
    }
  }
  const mag = new Float64Array(n / 2);
  for (let k = 0; k < n / 2; k++) mag[k] = re[k] * re[k] + im[k] * im[k];
  return mag;
}

/** استخراج متریک واقعی — RMS متراکم‌تر + تقریب LUFS نزدیک به BS.1770 (K-weight سبک) */
async function measureAudio(file: File): Promise<Metrics> {
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) throw new Error("Web Audio API در این مرورگر فعال نیست.");
  const ctx = new AC();
  try {
    const ab = await file.arrayBuffer();
    if (!ab || ab.byteLength < 100) throw new Error("فایل صوتی خالی یا خراب است.");
    const buffer = await ctx.decodeAudioData(ab.slice(0));
    if (!buffer || buffer.length < 64) throw new Error("دیکود فایل ناموفق بود.");
    const sr = buffer.sampleRate;
    const nCh = buffer.numberOfChannels;
    const left = buffer.getChannelData(0);
    const right = nCh > 1 ? buffer.getChannelData(1) : left;
    const totalLen = buffer.length;

    // --- Peak: dense sampling (miss almost no peak) ---
    const peakStride = Math.max(1, Math.floor(totalLen / 3_000_000));
    let peak = 0, truePeak = 0, clipCount = 0, peakCount = 0;
    for (let i = 0; i < totalLen; i += peakStride) {
      const l = left[i] ?? 0, r = right[i] ?? l;
      const al = Math.abs(l), ar = Math.abs(r);
      if (al > peak) peak = al;
      if (ar > peak) peak = ar;
      if (i + peakStride < totalLen) {
        const l2 = left[i + peakStride] ?? 0, r2 = right[i + peakStride] ?? l2;
        const ml = Math.abs((l + l2) * 0.5), mr = Math.abs((r + r2) * 0.5);
        if (ml > truePeak) truePeak = ml;
        if (mr > truePeak) truePeak = mr;
        if (Math.abs(l2) > truePeak) truePeak = Math.abs(l2);
        if (Math.abs(r2) > truePeak) truePeak = Math.abs(r2);
      }
      if (al > truePeak) truePeak = al;
      if (ar > truePeak) truePeak = ar;
      if (al >= 0.99 || ar >= 0.99) clipCount++;
      peakCount++;
    }
    if (truePeak < peak) truePeak = peak;

    // --- RMS denser + K-weight proxy for ≈LUFS ---
    const rmsStride = Math.max(1, Math.floor(totalLen / 1_800_000));
    const hpR = Math.exp((-2 * Math.PI * 38) / sr);
    const shelfG = 1.585;
    let sumSq = 0, sumSqK = 0, sumL = 0, sumR = 0, sumLR = 0, sumMid = 0, sumSide = 0;
    let rmsCount = 0;
    let prevX = 0, prevHp = 0;
    for (let i = 0; i < totalLen; i += rmsStride) {
      const l = left[i] ?? 0, r = right[i] ?? l;
      const mid = (l + r) * 0.5;
      const side = (l - r) * 0.5;
      sumSq += mid * mid;
      sumMid += mid * mid;
      sumSide += side * side;
      if (nCh > 1) { sumL += l * l; sumR += r * r; sumLR += l * r; }
      const hp = mid - prevX + hpR * prevHp;
      prevX = mid; prevHp = hp;
      const kSample = hp + (hp - mid * 0.15) * (shelfG - 1) * 0.35;
      sumSqK += kSample * kSample;
      rmsCount++;
    }
    if (rmsCount < 10) throw new Error("نمونه‌برداری کافی از فایل انجام نشد.");

    const rms = Math.sqrt(sumSq / rmsCount);
    const rmsK = Math.sqrt(sumSqK / rmsCount);
    const corr = nCh > 1 ? sumLR / Math.sqrt(Math.max(1e-18, sumL * sumR)) : null;
    const stereoWidth = nCh > 1 ? sumSide / Math.max(1e-18, sumMid + sumSide) : null;
    const clipPct = peakCount ? (clipCount / peakCount) * 100 : 0;
    const peakDbfs = toDb(peak);
    const truePeakDbfs = toDb(truePeak);
    const rmsDbfs = toDb(rms);
    const crestFactorDb = Math.max(0, peakDbfs - rmsDbfs);
    let approxLufs = toDb(rmsK) - 0.691;
    if (!Number.isFinite(approxLufs)) approxLufs = rmsDbfs - 0.691;
    approxLufs = Math.max(-70, Math.min(0, approxLufs));

    // --- Spectral: multiple frames across whole file ---
    const N = 2048;
    const bands = { sub: 0, low: 0, lowMid: 0, mid: 0, presence: 0, high: 0, air: 0 };
    let weighted = 0, energy = 0;
    if (totalLen >= N) {
      const frameCount = Math.min(20, Math.max(8, Math.floor(totalLen / (N * 4))));
      const re = new Float64Array(N);
      const im = new Float64Array(N);
      for (let f = 0; f < frameCount; f++) {
        if (f > 0 && f % 4 === 0) await new Promise((r) => setTimeout(r, 0));
        const start = Math.floor((totalLen - N) * (f / Math.max(1, frameCount - 1)));
        for (let n = 0; n < N; n++) {
          const x = ((left[start + n] ?? 0) + (right[start + n] ?? 0)) * 0.5;
          const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (N - 1));
          re[n] = x * w; im[n] = 0;
        }
        const mag = fftMag(re, im);
        for (let k = 1; k < N / 2; k++) {
          const hz = (k * sr) / N;
          if (hz < 20 || hz > 18000) continue;
          const m2 = mag[k];
          if (!(m2 > 0)) continue;
          weighted += hz * m2; energy += m2;
          if (hz < 60) bands.sub += m2;
          else if (hz < 250) bands.low += m2;
          else if (hz < 500) bands.lowMid += m2;
          else if (hz < 2000) bands.mid += m2;
          else if (hz < 5000) bands.presence += m2;
          else if (hz < 10000) bands.high += m2;
          else bands.air += m2;
        }
      }
    }
    const bandTotal = bands.sub + bands.low + bands.lowMid + bands.mid + bands.presence + bands.high + bands.air || 1;
    const pct = (v: number) => (v / bandTotal) * 100;

    return {
      durationSec: buffer.duration, sampleRate: sr, channels: nCh,
      peakDbfs, truePeakDbfs, rmsDbfs, crestFactorDb,
      stereoCorrelation: corr == null ? null : Math.max(-1, Math.min(1, corr)),
      stereoWidth: stereoWidth == null ? null : Math.max(0, Math.min(1, stereoWidth)),
      spectralCentroidHz: energy > 0 ? weighted / energy : null,
      lowEnergyPct: pct(bands.sub + bands.low),
      midEnergyPct: pct(bands.lowMid + bands.mid + bands.presence),
      highEnergyPct: pct(bands.high + bands.air),
      clipPct,
      bandEnergy: { sub: pct(bands.sub), low: pct(bands.low), lowMid: pct(bands.lowMid), mid: pct(bands.mid), presence: pct(bands.presence), high: pct(bands.high), air: pct(bands.air) },
      approxLufs, loudnessRangeProxy: null,
    };
  } finally {
    try { await ctx.close(); } catch { /* ignore */ }
  }
}

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

export default function MusicAnalyzerLab() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const inputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [genre, setGenre] = useState(GENRES[0]);
  const [focus, setFocus] = useState(FOCUSES[0]);
  const [notes, setNotes] = useState("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [refFile, setRefFile] = useState<File | null>(null);
  const [refMetrics, setRefMetrics] = useState<Metrics | null>(null);
  const [measuringRef, setMeasuringRef] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [quota, setQuota] = useState({ limit: 1, used: 0, remaining: 1, pro: false, course: false, admin: false, tier: "free" as string });
  const [loading, setLoading] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [error, setError] = useState("");

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
    setError(""); setAnalysis(null); setMetrics(null); setFile(next); setMeasuring(true);
    try { setMetrics(await measureAudio(next)); }
    catch (e) { setError(e instanceof Error ? e.message : "خواندن فایل صوتی ناموفق بود."); setFile(null); }
    finally { setMeasuring(false); }
  };

  const chooseRefFile = async (next: File | null) => {
    if (!next) { setRefFile(null); setRefMetrics(null); return; }
    if (next.size > 50 * 1024 * 1024) { setError("حداکثر حجم رفرنس 50MB است."); return; }
    setError(""); setAnalysis(null); setRefFile(next); setMeasuringRef(true);
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
      if (refMetrics) form.set("refMetrics", JSON.stringify(refMetrics));
      if (refFile) form.set("refName", refFile.name.slice(0, 120));
      form.set("userId", user.id);
      if (user.telegramId) form.set("telegramId", String(user.telegramId));
      if (isAdmin) form.set("role", "admin");
      form.set("genre", genre); form.set("focus", focus); form.set("notes", notes);
      const res = await fetch("/api/practice/music-analyzer", { method: "POST", body: form, credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (data.code === "daily_limit_reached") await refreshQuota();
        throw new Error(data.code === "daily_limit_reached"
          ? "سهمیه تحلیل امروز تمام شده. رایگان ۱، هنرجوی آموزش ۵، Pro نامحدود."
          : data.error || "تحلیل انجام نشد.");
      }
      setMetrics(data.metrics || metrics);
      setAnalysis(data.analysis);
      if (data.quota) setQuota({ limit: data.quota.limit, used: data.quota.used, remaining: data.quota.remaining, pro: Boolean(data.quota.pro), course: Boolean(data.quota.course), admin: Boolean(data.quota.admin), tier: String(data.quota.tier || "free") });
      else await refreshQuota();
    } catch (e) { setError(e instanceof Error ? e.message : "خطا در تحلیل"); }
    finally { setLoading(false); }
  };

  const canAnalyze = Boolean(file && metrics && !measuring && !measuringRef && !loading && (isAdmin || quota.pro || quota.remaining > 0));

  return (
    <section className="mt-2">
      <Link href="/practice" className="btn-ghost !px-4 !py-2 text-xs"><ArrowLeft size={14} /> بازگشت به موتور تمرین</Link>
      <div className="mt-5 overflow-hidden rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-cyan-400/[.1] via-white/[.03] to-violet-400/[.08] p-6 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-cyan-300">AI AUDIO · REFERENCE-STYLE · سخت‌گیرانه</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-sand-50">تحلیلگر موسیقی</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-300">فایل خودت را آپلود کن. می‌توانی رفرنس هم بگذاری تا AI ترک را با همان رفرنس مقایسه کند. تحلیل شامل میکس + تنظیم است.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-right">
            <div className="text-[10px] uppercase tracking-[.2em] text-ink-500">تحلیل روزانه</div>
            <div className="mt-1 text-lg font-semibold text-cyan-100">{isAdmin || quota.admin || quota.pro ? "∞" : `${quota.remaining} / ${quota.limit}`}</div>
            <div className="text-[11px] text-ink-500">{isAdmin || quota.admin ? "ادمین · بدون محدودیت" : quota.pro ? "Pro · تا پایان اشتراک" : quota.course ? "هنرجوی آموزش · ۵ بار در روز" : "رایگان · ۱ بار در روز"}</div>
          </div>
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <button type="button" onClick={() => inputRef.current?.click()} className="group flex min-h-56 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-300/35 bg-black/20 p-6 text-center transition hover:border-cyan-200/70 hover:bg-cyan-400/[.06]">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200"><Upload size={25} /></span>
              <strong className="mt-4 text-base text-sand-50">{file ? file.name : "آپلود فایل موسیقی"}</strong>
              <span className="mt-2 text-xs text-ink-500">MP3 · WAV · M4A · FLAC · OGG · حداکثر 50MB</span>
              {measuring ? (<span className="mt-4 flex items-center gap-2 text-xs text-cyan-200"><Loader2 size={14} className="animate-spin" /> در حال استخراج متریک‌های دقیق (چند ثانیه)…</span>)
                : file && metrics ? (<span className="mt-4 flex items-center gap-2 text-xs text-emerald-200"><CheckCircle2 size={14} /> آماده · {metrics.durationSec.toFixed(1)}s · Peak {metrics.peakDbfs.toFixed(1)}</span>) : null}
            </button>
            <input ref={inputRef} className="hidden" type="file" accept="audio/*,.flac,.m4a" onChange={(e) => void chooseFile(e.target.files?.[0] || null)} />
            <div className="mt-3">
              <button type="button" onClick={() => refInputRef.current?.click()} className="flex w-full items-center gap-3 rounded-xl border border-dashed border-violet-300/30 bg-black/15 px-4 py-3 text-right transition hover:border-violet-200/50 hover:bg-violet-400/[.06]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-200"><Target size={18} /></span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm text-sand-50">{refFile ? refFile.name : "رفرنس (اختیاری)"}</strong>
                  <span className="text-[11px] text-ink-500">آپلود رفرنس برای مقایسه دقیق با ترک خودت</span>
                  {measuringRef ? (<span className="mt-1 flex items-center gap-1 text-[11px] text-violet-200"><Loader2 size={12} className="animate-spin" /> استخراج متریک رفرنس…</span>)
                    : refFile && refMetrics ? (<span className="mt-1 block text-[11px] text-emerald-200">آماده · Peak {refMetrics.peakDbfs.toFixed(1)} · RMS {refMetrics.rmsDbfs.toFixed(1)} · ≈LUFS {refMetrics.approxLufs?.toFixed(1) ?? "—"}</span>) : null}
                </span>
                {refFile ? <button type="button" className="text-xs text-ink-500 hover:text-sand-50" onClick={(e) => { e.stopPropagation(); void chooseRefFile(null); }}>حذف</button> : null}
              </button>
              <input ref={refInputRef} className="hidden" type="file" accept="audio/*,.flac,.m4a" onChange={(e) => void chooseRefFile(e.target.files?.[0] || null)} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs text-ink-500">ژانر</span>
                <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-sand-50">
                  {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-ink-500">تمرکز تحلیل</span>
                <select value={focus} onChange={(e) => setFocus(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-sand-50">
                  {FOCUSES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </label>
            </div>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-xs text-ink-500">توضیح / مشکل (اختیاری)</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="مثلاً: وکال گم می‌شود، بیس گل‌آلود است، تنظیم خلوت است..." className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-sand-50 placeholder:text-ink-600" />
            </label>
            <button type="button" disabled={!canAnalyze} onClick={() => void analyze()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400/90 px-5 py-3.5 text-sm font-medium text-black transition hover:bg-cyan-300 disabled:opacity-40">
              {loading ? <><Loader2 size={16} className="animate-spin" /> در حال تحلیل…</> : <><Sparkles size={16} /> تحلیل میکس + تنظیم</>}
            </button>
            {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
          </div>
          <div className="space-y-4">
            {metrics ? (
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs text-ink-500"><Gauge size={14} /> متریک‌های واقعی فایل</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-white/[.03] px-3 py-2"><div className="text-[10px] text-ink-500">Peak</div><div className="font-medium text-sand-50">{metrics.peakDbfs.toFixed(1)} dBFS</div></div>
                  <div className="rounded-lg bg-white/[.03] px-3 py-2"><div className="text-[10px] text-ink-500">True Peak</div><div className="font-medium text-sand-50">{metrics.truePeakDbfs?.toFixed(1) ?? "—"} dBTP</div></div>
                  <div className="rounded-lg bg-white/[.03] px-3 py-2"><div className="text-[10px] text-ink-500">RMS</div><div className="font-medium text-sand-50">{metrics.rmsDbfs.toFixed(1)} dBFS</div></div>
                  <div className="rounded-lg bg-white/[.03] px-3 py-2"><div className="text-[10px] text-ink-500">Crest</div><div className="font-medium text-sand-50">{metrics.crestFactorDb.toFixed(1)} dB</div></div>
                  <div className="rounded-lg bg-white/[.03] px-3 py-2"><div className="text-[10px] text-ink-500">≈LUFS</div><div className="font-medium text-sand-50">{metrics.approxLufs?.toFixed(1) ?? "—"}</div></div>
                  <div className="rounded-lg bg-white/[.03] px-3 py-2"><div className="text-[10px] text-ink-500">Clip %</div><div className="font-medium text-sand-50">{metrics.clipPct?.toFixed(2) ?? "0"}%</div></div>
                </div>
                <div className="mt-4 space-y-2">
                  <EnergyBar label="Low" value={metrics.lowEnergyPct} color="bg-cyan-400" />
                  <EnergyBar label="Mid" value={metrics.midEnergyPct} color="bg-violet-400" />
                  <EnergyBar label="High" value={metrics.highEnergyPct} color="bg-amber-400" />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 p-8 text-center text-sm text-ink-500">
                بعد از آپلود، متریک‌های دقیق اینجا نمایش داده می‌شود.
              </div>
            )}
          </div>
        </div>
      </div>

      {analysis ? (
        <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-black/20 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">گزارش AI · تحلیلگر موسیقی</p>
              <h2 className="mt-2 text-xl text-sand-50">نتیجه تحلیل (میکس + تنظیم)</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-300">{analysis.fileSummary}</p>
            </div>
            {analysis.matchScore != null ? (
              <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-center">
                <div className="text-[10px] uppercase tracking-widest text-cyan-200/80">Match Score</div>
                <div className="mt-1 text-3xl font-semibold text-cyan-100">{analysis.matchScore}</div>
              </div>
            ) : null}
          </div>
          {analysis.descriptors ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {Object.entries(analysis.descriptors).map(([k, v]) => (
                <span key={k} className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-xs text-ink-300">{k}: {v}</span>
              ))}
            </div>
          ) : null}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/8 bg-white/[.02] p-4">
              <div className="text-xs text-ink-500 mb-2">لودنس</div>
              <div className="space-y-1 text-sm text-ink-300">
                <div>Peak: {analysis.loudness?.peak}</div>
                <div>RMS: {analysis.loudness?.rms}</div>
                <div>Crest: {analysis.loudness?.crest}</div>
                {analysis.loudness?.targetLufs ? <div>هدف: {analysis.loudness.targetLufs}</div> : null}
              </div>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[.02] p-4">
              <div className="text-xs text-ink-500 mb-2">تونال / استریو</div>
              <div className="space-y-1 text-sm text-ink-300">
                <div>{analysis.tonal?.summary}</div>
                <div>{analysis.stereo?.advice}</div>
                <div>{analysis.dynamics}</div>
                <div>{analysis.clipping}</div>
              </div>
            </div>
          </div>
          {analysis.eq?.length ? (
            <div className="mt-4"><div className="text-xs text-ink-500 mb-2">پیشنهاد EQ</div><ul className="space-y-2 text-sm text-ink-300">{analysis.eq.map((x, i) => <li key={i} className="rounded-lg border border-white/10 bg-white/[.02] px-3 py-2">{x}</li>)}</ul></div>
          ) : null}
          {analysis.mixBalance?.length ? (
            <div className="mt-4"><div className="text-xs text-ink-500 mb-2">تعادل میکس</div><ul className="space-y-2 text-sm text-ink-300">{analysis.mixBalance.map((x, i) => <li key={i} className="rounded-lg border border-white/10 bg-white/[.02] px-3 py-2"><b className="text-sand-50">{x.element}:</b> {x.advice}</li>)}</ul></div>
          ) : null}
          {analysis.arrangement?.length ? (
            <div className="mt-4"><div className="text-xs text-ink-500 mb-2">پیشنهاد تنظیم (Arrangement)</div><ul className="space-y-2 text-sm text-ink-300">{analysis.arrangement.map((x, i) => <li key={i} className="rounded-lg border border-violet-400/20 bg-violet-400/[.06] px-3 py-2">{x}</li>)}</ul></div>
          ) : null}
          {analysis.roadmap?.length ? (
            <div className="mt-4"><div className="text-xs text-ink-500 mb-2">نقشه قدم‌به‌قدم</div><ol className="list-decimal list-inside space-y-2 text-sm text-ink-300">{analysis.roadmap.map((x, i) => <li key={i}>{x}</li>)}</ol></div>
          ) : null}
          {analysis.quickFixes?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">{analysis.quickFixes.map((x, i) => <span key={i} className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">{x}</span>)}</div>
          ) : null}
          {analysis.referenceTips ? <p className="mt-4 text-xs leading-6 text-ink-500">{analysis.referenceTips}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
