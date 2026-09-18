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
  roadmap: string[]; quickFixes?: string[]; referenceTips?: string; source?: string;
};

const GENRES = ["Pop", "Persian Pop / پاپ ایرانی", "Hip-Hop / Trap", "EDM / Electronic", "Rock / Indie", "R&B / Soul", "Acoustic", "Cinematic"];
const FOCUSES = ["فول میکس", "وکال", "درامز", "باس", "مسترینگ نهایی"];
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

async function measureAudio(file: File): Promise<Metrics> {
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) throw new Error("Web Audio API در این مرورگر فعال نیست.");
  const ctx = new AC();
  try {
    const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
    const sr = buffer.sampleRate, nCh = buffer.numberOfChannels;
    const left = buffer.getChannelData(0);
    const right = nCh > 1 ? buffer.getChannelData(1) : left;
    const maxSamples = Math.min(buffer.length, Math.floor(sr * 210));
    const len = maxSamples;
    const stride = Math.max(1, Math.floor(len / 900_000));
    let peak = 0, truePeak = 0, sumSq = 0, sumL = 0, sumR = 0, sumLR = 0, sumMid = 0, sumSide = 0;
    let count = 0, clipCount = 0;
    for (let i = 0; i < len; i += stride) {
      const l = left[i] || 0, r = right[i] || l;
      const al = Math.abs(l), ar = Math.abs(r);
      peak = Math.max(peak, al, ar);
      const next = Math.min(i + stride, len - 1);
      const l2 = left[next] || 0, r2 = right[next] || l2;
      truePeak = Math.max(truePeak, al, ar, Math.abs((l + l2) * 0.5), Math.abs((r + r2) * 0.5));
      const m = (l + r) * 0.5, s = (l - r) * 0.5;
      sumSq += m * m; sumMid += m * m; sumSide += s * s;
      if (nCh > 1) { sumL += l * l; sumR += r * r; sumLR += l * r; }
      if (al > 0.99 || ar > 0.99) clipCount++;
      count++;
    }
    truePeak = Math.max(truePeak, peak);
    const rms = Math.sqrt(sumSq / Math.max(1, count));
    const corr = nCh > 1 ? sumLR / Math.sqrt(Math.max(1e-18, sumL * sumR)) : null;
    const stereoWidth = nCh > 1 ? sumSide / Math.max(1e-18, sumMid + sumSide) : null;
    const clipPct = count ? (clipCount / count) * 100 : 0;
    const peakDbfs = toDb(peak), truePeakDbfs = toDb(truePeak), rmsDbfs = toDb(rms);
    const N = 2048;
    if (len < N) {
      return {
        durationSec: buffer.duration, sampleRate: sr, channels: nCh,
        peakDbfs, truePeakDbfs, rmsDbfs, crestFactorDb: Math.max(0, peakDbfs - rmsDbfs),
        stereoCorrelation: corr == null ? null : Math.max(-1, Math.min(1, corr)),
        stereoWidth: stereoWidth == null ? null : Math.max(0, Math.min(1, stereoWidth)),
        spectralCentroidHz: null, lowEnergyPct: null, midEnergyPct: null, highEnergyPct: null,
        clipPct, bandEnergy: null, approxLufs: rmsDbfs - 0.691, loudnessRangeProxy: null,
      };
    }
    const frameCount = Math.min(12, Math.max(6, Math.floor(len / (N * 6))));
    const bands = { sub: 0, low: 0, lowMid: 0, mid: 0, presence: 0, high: 0, air: 0 };
    let weighted = 0, energy = 0, kWeightedSumSq = 0;
    const re = new Float64Array(N), im = new Float64Array(N);
    const framePowers: number[] = [];
    for (let f = 0; f < frameCount; f++) {
      if (f > 0 && f % 3 === 0) await new Promise((r) => setTimeout(r, 0));
      const start = Math.floor((len - N) * (f / Math.max(1, frameCount - 1)));
      let framePower = 0;
      for (let n = 0; n < N; n++) {
        const x = ((left[start + n] || 0) + (right[start + n] || 0)) * 0.5;
        const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (N - 1));
        re[n] = x * w; im[n] = 0; framePower += x * x;
      }
      framePowers.push(framePower / N);
      const mag = fftMag(re, im);
      for (let k = 1; k < N / 2; k++) {
        const hz = (k * sr) / N;
        if (hz < 20 || hz > 16000) continue;
        const m2 = mag[k];
        weighted += hz * m2; energy += m2;
        let kw = 1;
        if (hz < 60) kw = 0.15; else if (hz < 100) kw = 0.4; else if (hz > 2000) kw = 1.2;
        kWeightedSumSq += m2 * kw;
        if (hz < 60) bands.sub += m2;
        else if (hz < 250) bands.low += m2;
        else if (hz < 500) bands.lowMid += m2;
        else if (hz < 2000) bands.mid += m2;
        else if (hz < 5000) bands.presence += m2;
        else if (hz < 10000) bands.high += m2;
        else bands.air += m2;
      }
    }
    const bandTotal = bands.sub + bands.low + bands.lowMid + bands.mid + bands.presence + bands.high + bands.air || 1;
    const pct = (v: number) => (v / bandTotal) * 100;
    const kRatio = energy > 0 ? kWeightedSumSq / Math.max(energy, 1e-18) : 1;
    const approxLufs = rmsDbfs - 0.691 + 10 * Math.log10(Math.max(0.25, Math.min(2.5, kRatio)));
    framePowers.sort((a, b) => a - b);
    const p95 = framePowers[Math.min(framePowers.length - 1, Math.floor(framePowers.length * 0.95))] || 0;
    const p10 = framePowers[Math.min(framePowers.length - 1, Math.floor(framePowers.length * 0.1))] || 1e-12;
    const loudnessRangeProxy = p10 > 0 ? Math.max(0, 10 * Math.log10(Math.max(p95, 1e-18) / Math.max(p10, 1e-18))) : null;
    return {
      durationSec: buffer.duration, sampleRate: sr, channels: nCh,
      peakDbfs, truePeakDbfs, rmsDbfs, crestFactorDb: Math.max(0, peakDbfs - rmsDbfs),
      stereoCorrelation: corr == null ? null : Math.max(-1, Math.min(1, corr)),
      stereoWidth: stereoWidth == null ? null : Math.max(0, Math.min(1, stereoWidth)),
      spectralCentroidHz: energy ? weighted / energy : null,
      lowEnergyPct: pct(bands.sub + bands.low),
      midEnergyPct: pct(bands.lowMid + bands.mid + bands.presence),
      highEnergyPct: pct(bands.high + bands.air),
      clipPct,
      bandEnergy: { sub: pct(bands.sub), low: pct(bands.low), lowMid: pct(bands.lowMid), mid: pct(bands.mid), presence: pct(bands.presence), high: pct(bands.high), air: pct(bands.air) },
      approxLufs, loudnessRangeProxy,
    };
  } finally { await ctx.close(); }
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
  const [file, setFile] = useState<File | null>(null);
  const [genre, setGenre] = useState(GENRES[0]);
  const [focus, setFocus] = useState(FOCUSES[0]);
  const [notes, setNotes] = useState("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
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

  const analyze = async () => {
    if (!file || !metrics) return;
    if (!user) { setError("برای استفاده از MUSIC ANALYZER ابتدا وارد حساب کاربری شو."); return; }
    if (!isAdmin && !quota.pro && quota.remaining <= 0) { setError("سهمیه تحلیل امروز تمام شده است."); return; }
    setLoading(true); setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("metrics", JSON.stringify(metrics));
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

  const canAnalyze = Boolean(file && metrics && !measuring && !loading && (isAdmin || quota.pro || quota.remaining > 0));

  return (
    <section className="mt-2">
      <Link href="/practice" className="btn-ghost !px-4 !py-2 text-xs"><ArrowLeft size={14} /> بازگشت به Practice</Link>
      <div className="mt-5 overflow-hidden rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-cyan-400/[.1] via-white/[.03] to-violet-400/[.08] p-6 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-cyan-300">AI AUDIO · REFERENCE-STYLE · سخت‌گیرانه</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-sand-50">MUSIC ANALYZER</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-300">فایل را آپلود کن. عددهای واقعی Peak، RMS، Crest، استریو و انرژی پایین/میانی/بالا گرفته می‌شود. تحلیل سخت‌گیرانه مثل Reference می‌دهد.</p>
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
          </div>
          <div className="space-y-4">
            <label className="block text-xs text-ink-400">ژانر<select value={genre} onChange={(e) => setGenre(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-sand-50">{GENRES.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="block text-xs text-ink-400">تمرکز<select value={focus} onChange={(e) => setFocus(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-sand-50">{FOCUSES.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="block text-xs text-ink-400">توضیح / مشکل فعلی<textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5 min-h-24 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-sand-50" placeholder="مثلاً: وکال عقب است، بیس زیاد..." /></label>
          </div>
        </div>
        {metrics ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {([["Peak", `${metrics.peakDbfs.toFixed(1)} dBFS`, Gauge], ["True Peak ≈", metrics.truePeakDbfs == null ? "—" : `${metrics.truePeakDbfs.toFixed(1)} dBTP`, Target], ["RMS", `${metrics.rmsDbfs.toFixed(1)} dBFS`, AudioWaveform], ["Crest", `${metrics.crestFactorDb.toFixed(1)} dB`, Waves], ["Stereo", metrics.stereoCorrelation == null ? "N/A" : metrics.stereoCorrelation.toFixed(2), Sparkles], ["عرض", metrics.stereoWidth == null ? "—" : `${(metrics.stereoWidth * 100).toFixed(0)}%`, Zap], ["≈ LUFS", metrics.approxLufs == null ? "—" : metrics.approxLufs.toFixed(1), BarChart3], ["Clip %", metrics.clipPct == null ? "—" : `${metrics.clipPct.toFixed(2)}%`, Target]] as const).map(([label, value, Icon]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[.03] p-4">
                <div className="flex items-center gap-2 text-xs text-ink-500"><Icon size={14} className="text-cyan-300" />{label}</div>
                <p className="mt-2 text-sm font-medium text-sand-50">{value}</p>
              </div>
            ))}
          </div>
        ) : null}
        {metrics ? (
          <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-black/15 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <EnergyBar label="انرژی پایین" value={metrics.lowEnergyPct} color="bg-amber-400/80" />
              <EnergyBar label="انرژی میانی" value={metrics.midEnergyPct} color="bg-cyan-400/80" />
              <EnergyBar label="انرژی بالا" value={metrics.highEnergyPct} color="bg-violet-400/80" />
            </div>
            {metrics.bandEnergy ? (
              <div className="grid gap-2 sm:grid-cols-4 border-t border-white/5 pt-3">
                <EnergyBar label="Sub" value={metrics.bandEnergy.sub} color="bg-amber-500/70" />
                <EnergyBar label="Low" value={metrics.bandEnergy.low} color="bg-amber-400/70" />
                <EnergyBar label="Low-Mid" value={metrics.bandEnergy.lowMid} color="bg-cyan-500/70" />
                <EnergyBar label="Mid" value={metrics.bandEnergy.mid} color="bg-cyan-400/70" />
                <EnergyBar label="Presence" value={metrics.bandEnergy.presence} color="bg-violet-400/70" />
                <EnergyBar label="High" value={metrics.bandEnergy.high} color="bg-violet-500/70" />
                <EnergyBar label="Air" value={metrics.bandEnergy.air} color="bg-fuchsia-400/70" />
              </div>
            ) : null}
          </div>
        ) : null}
        <button type="button" disabled={!canAnalyze} onClick={() => void analyze()} className="btn-primary mt-6">
          {loading ? (<><Loader2 size={16} className="animate-spin" /> در حال تحلیل سخت‌گیرانه…</>) : !isAdmin && !quota.pro && quota.remaining <= 0 ? (<><LockKeyhole size={16} /> سهمیه امروز تمام شده</>) : (<><Sparkles size={16} /> Analyze Music</>)}
        </button>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        {isAdmin ? <p className="mt-3 text-xs text-emerald-200">ادمین: بدون محدودیت روزانه.</p> : null}
      </div>
      {analysis ? (
        <div className="mt-6 space-y-4">
          <div className="card-ay p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow">گزارش AI · MUSIC ANALYZER</p>
                <h2 className="mt-2 text-xl text-sand-50">نتیجه تحلیل فایل</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-300">{analysis.fileSummary}</p>
              </div>
              {typeof analysis.matchScore === "number" ? (
                <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-5 py-3 text-center">
                  <p className="text-[10px] text-cyan-200/80">نزدیکی به رفرنس</p>
                  <p className="text-2xl font-semibold text-cyan-100">{analysis.matchScore}%</p>
                </div>
              ) : null}
            </div>
            {analysis.descriptors ? (
              <div className="mt-5 grid gap-2 sm:grid-cols-4 text-xs">
                <div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="text-ink-500">تونال</div><div className="mt-1 text-sand-50">{analysis.descriptors.tonal}</div></div>
                <div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="text-ink-500">استریو</div><div className="mt-1 text-sand-50">{analysis.descriptors.stereo}</div></div>
                <div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="text-ink-500">داینامیک</div><div className="mt-1 text-sand-50">{analysis.descriptors.dynamics}</div></div>
                <div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="text-ink-500">بلندی</div><div className="mt-1 text-sand-50">{analysis.descriptors.loudness}</div></div>
              </div>
            ) : null}
            <div className="mt-5 grid gap-3 sm:grid-cols-3 text-sm">
              <div className="rounded-xl border border-white/10 p-4"><div className="text-xs text-ink-500">Loudness</div><p className="mt-2 text-ink-300">Peak: <b className="text-sand-50">{analysis.loudness.peak}</b></p><p className="text-ink-300">RMS: <b className="text-sand-50">{analysis.loudness.rms}</b></p><p className="text-ink-300">Crest: <b className="text-sand-50">{analysis.loudness.crest}</b></p></div>
              <div className="rounded-xl border border-white/10 p-4"><div className="text-xs text-ink-500">تونال</div><p className="mt-2 text-ink-300">{analysis.tonal.summary}</p></div>
              <div className="rounded-xl border border-white/10 p-4"><div className="text-xs text-ink-500">استریو / کلیپ</div><p className="mt-2 text-ink-300">{analysis.stereo.advice}</p><p className="mt-2 text-ink-300">{analysis.clipping}</p></div>
            </div>
            <p className="mt-4 text-sm leading-7 text-ink-300">{analysis.dynamics}</p>
            {analysis.eq?.length ? (<div className="mt-4"><div className="text-xs text-ink-500 mb-2">پیشنهاد EQ</div><ul className="space-y-2 text-sm text-ink-300">{analysis.eq.map((x, i) => <li key={i} className="rounded-lg border border-white/10 bg-white/[.02] px-3 py-2">{x}</li>)}</ul></div>) : null}
            {analysis.roadmap?.length ? (<div className="mt-4"><div className="text-xs text-ink-500 mb-2">نقشه قدم‌به‌قدم</div><ol className="list-decimal list-inside space-y-2 text-sm text-ink-300">{analysis.roadmap.map((x, i) => <li key={i}>{x}</li>)}</ol></div>) : null}
            {analysis.quickFixes?.length ? (<div className="mt-4 flex flex-wrap gap-2">{analysis.quickFixes.map((x, i) => <span key={i} className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">{x}</span>)}</div>) : null}
            {analysis.referenceTips ? <p className="mt-4 text-xs leading-6 text-ink-500">{analysis.referenceTips}</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
