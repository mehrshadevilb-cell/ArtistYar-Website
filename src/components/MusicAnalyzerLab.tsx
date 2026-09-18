"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  AudioWaveform,
  BarChart3,
  CheckCircle2,
  Gauge,
  Loader2,
  LockKeyhole,
  Sparkles,
  Target,
  Upload,
  Waves,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

type Metrics = {
  durationSec: number;
  sampleRate: number;
  channels: number;
  peakDbfs: number;
  rmsDbfs: number;
  crestFactorDb: number;
  stereoCorrelation: number | null;
  spectralCentroidHz: number | null;
  lowEnergyPct: number | null;
  midEnergyPct: number | null;
  highEnergyPct: number | null;
};

type Analysis = {
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
  roadmap: string[];
  quickFixes?: string[];
  referenceTips?: string;
  source?: string;
};

const GENRES = [
  "Pop",
  "Persian Pop / پاپ ایرانی",
  "Hip-Hop / Trap",
  "EDM / Electronic",
  "Rock / Indie",
  "R&B / Soul",
  "Acoustic",
  "Cinematic",
];
const FOCUSES = ["فول میکس", "وکال", "درامز", "باس", "مسترینگ نهایی"];
const toDb = (v: number) => 20 * Math.log10(Math.max(v, 1e-9));

async function measureAudio(file: File): Promise<Metrics> {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) throw new Error("Web Audio API در این مرورگر فعال نیست.");
  const ctx = new AudioContextClass();
  try {
    const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
    const left = buffer.getChannelData(0);
    const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
    const stride = Math.max(1, Math.floor(buffer.length / 160000));
    let sumSq = 0,
      peak = 0,
      sumL = 0,
      sumR = 0,
      sumLR = 0,
      count = 0;
    for (let i = 0; i < buffer.length; i += stride) {
      const l = left[i] || 0,
        r = right[i] || l,
        m = (l + r) * 0.5;
      sumSq += m * m;
      peak = Math.max(peak, Math.abs(l), Math.abs(r));
      if (buffer.numberOfChannels > 1) {
        sumL += l * l;
        sumR += r * r;
        sumLR += l * r;
      }
      count++;
    }

    const N = 1024;
    const frames = Math.min(8, Math.max(1, Math.floor(buffer.length / (N * 8))));
    let low = 0,
      mid = 0,
      high = 0,
      weighted = 0,
      energy = 0;
    for (let f = 0; f < frames; f++) {
      const start = Math.floor((buffer.length - N) * (f / Math.max(1, frames - 1)));
      for (let k = 0; k < N / 2; k++) {
        let re = 0,
          im = 0;
        for (let n = 0; n < N; n += 4) {
          const x = ((left[start + n] || 0) + (right[start + n] || 0)) * 0.5;
          const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (N - 1));
          const phase = (2 * Math.PI * k * n) / N;
          re += x * w * Math.cos(phase);
          im -= x * w * Math.sin(phase);
        }
        const mag = re * re + im * im;
        const hz = (k * buffer.sampleRate) / N;
        if (hz < 20 || hz > 20000) continue;
        weighted += hz * mag;
        energy += mag;
        if (hz < 150) low += mag;
        else if (hz < 5000) mid += mag;
        else high += mag;
      }
    }
    const rms = Math.sqrt(sumSq / Math.max(1, count));
    const corr = buffer.numberOfChannels > 1 ? sumLR / Math.sqrt(Math.max(1e-12, sumL * sumR)) : null;
    const total = low + mid + high || 1;
    return {
      durationSec: buffer.duration,
      sampleRate: buffer.sampleRate,
      channels: buffer.numberOfChannels,
      peakDbfs: toDb(peak),
      rmsDbfs: toDb(rms),
      crestFactorDb: Math.max(0, toDb(peak) - toDb(rms)),
      stereoCorrelation: corr == null ? null : Math.max(-1, Math.min(1, corr)),
      spectralCentroidHz: energy ? weighted / energy : null,
      lowEnergyPct: (low / total) * 100,
      midEnergyPct: (mid / total) * 100,
      highEnergyPct: (high / total) * 100,
    };
  } finally {
    await ctx.close();
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
  const [file, setFile] = useState<File | null>(null);
  const [genre, setGenre] = useState(GENRES[0]);
  const [focus, setFocus] = useState(FOCUSES[0]);
  const [notes, setNotes] = useState("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [quota, setQuota] = useState({ limit: 1, used: 0, remaining: 1, pro: false, admin: false });
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
      if (data?.ok)
        setQuota({
          limit: data.limit,
          used: data.used,
          remaining: data.remaining,
          pro: Boolean(data.pro),
          admin: Boolean(data.admin),
        });
    } catch {}
  }, [quotaUrl]);

  useEffect(() => {
    void refreshQuota();
  }, [refreshQuota]);

  const chooseFile = async (next: File | null) => {
    if (!next) return;
    if (next.size > 50 * 1024 * 1024) {
      setError("حداکثر حجم فایل 50MB است.");
      return;
    }
    setError("");
    setAnalysis(null);
    setMetrics(null);
    setFile(next);
    setMeasuring(true);
    try {
      setMetrics(await measureAudio(next));
    } catch (e) {
      setError(e instanceof Error ? e.message : "خواندن فایل صوتی ناموفق بود.");
      setFile(null);
    } finally {
      setMeasuring(false);
    }
  };

  const analyze = async () => {
    if (!file || !metrics) return;
    if (!user) {
      setError("برای استفاده از MUSIC ANALYZER ابتدا وارد حساب کاربری شو.");
      return;
    }
    if (!isAdmin && quota.remaining <= 0) {
      setError("سهمیه تحلیل امروز تمام شده است.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("metrics", JSON.stringify(metrics));
      form.set("userId", user.id);
      if (user.telegramId) form.set("telegramId", String(user.telegramId));
      if (isAdmin) form.set("role", "admin");
      form.set("genre", genre);
      form.set("focus", focus);
      form.set("notes", notes);
      const res = await fetch("/api/practice/music-analyzer", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (data.code === "daily_limit_reached") await refreshQuota();
        throw new Error(
          data.code === "daily_limit_reached"
            ? "تحلیل امروز استفاده شده است. برای تحلیل بیشتر Pro لازم است."
            : data.error || "تحلیل انجام نشد."
        );
      }
      setMetrics(data.metrics || metrics);
      setAnalysis(data.analysis);
      if (data.quota) setQuota({ ...data.quota, admin: Boolean(data.quota.admin) });
      else await refreshQuota();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در تحلیل");
    } finally {
      setLoading(false);
    }
  };

  const canAnalyze = Boolean(file && metrics && !measuring && !loading && (isAdmin || quota.remaining > 0));

  return (
    <section className="mt-2">
      <Link href="/practice" className="btn-ghost !px-4 !py-2 text-xs">
        <ArrowLeft size={14} /> بازگشت به Practice
      </Link>
      <div className="mt-5 overflow-hidden rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-cyan-400/[.1] via-white/[.03] to-violet-400/[.08] p-6 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-cyan-300">AI AUDIO INTELLIGENCE · REFERENCE-CLASS</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-sand-50">MUSIC ANALYZER</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-300">
              فایل را آپلود کن؛ Peak، RMS، Crest، Stereo Correlation و پروفایل Low/Mid/High استخراج می‌شود و AI مثل Reference 3 مسیر EQ، کمپرس، لیمیت و roadmap می‌دهد.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-right">
            <div className="text-[10px] uppercase tracking-[.2em] text-ink-500">Daily Analysis</div>
            <div className="mt-1 text-lg font-semibold text-cyan-100">
              {isAdmin || quota.admin ? "∞" : `${quota.remaining} / ${quota.limit}`}
            </div>
            <div className="text-[11px] text-ink-500">
              {isAdmin || quota.admin ? "Admin · Unlimited" : quota.pro ? "Pro" : "Free"} · reset daily
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="group flex min-h-56 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-300/35 bg-black/20 p-6 text-center transition hover:border-cyan-200/70 hover:bg-cyan-400/[.06]"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
                <Upload size={25} />
              </span>
              <strong className="mt-4 text-base text-sand-50">{file ? file.name : "آپلود فایل موسیقی"}</strong>
              <span className="mt-2 text-xs text-ink-500">MP3 · WAV · M4A · FLAC · OGG · حداکثر 50MB</span>
              {measuring ? (
                <span className="mt-4 flex items-center gap-2 text-xs text-cyan-200">
                  <Loader2 size={14} className="animate-spin" /> استخراج متریک‌های صوتی…
                </span>
              ) : file && metrics ? (
                <span className="mt-4 flex items-center gap-2 text-xs text-emerald-200">
                  <CheckCircle2 size={14} /> آماده تحلیل · {metrics.durationSec.toFixed(1)}s · {metrics.sampleRate}Hz
                </span>
              ) : null}
            </button>
            <input
              ref={inputRef}
              className="hidden"
              type="file"
              accept="audio/*,.flac,.m4a"
              onChange={(e) => void chooseFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="space-y-4">
            <label className="block text-xs text-ink-400">
              ژانر
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-sand-50"
              >
                {GENRES.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-ink-400">
              تمرکز
              <select
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-sand-50"
              >
                {FOCUSES.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-ink-400">
              توضیح / مشکل فعلی
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1.5 min-h-24 w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-sand-50"
                placeholder="مثلاً: وکال عقب است، low-end زیاد، میکس کدر..."
              />
            </label>
          </div>
        </div>

        {metrics ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["Peak", `${metrics.peakDbfs.toFixed(1)} dBFS`, Gauge],
                ["RMS", `${metrics.rmsDbfs.toFixed(1)} dBFS`, AudioWaveform],
                ["Crest", `${metrics.crestFactorDb.toFixed(1)} dB`, Waves],
                ["Stereo Corr.", metrics.stereoCorrelation == null ? "N/A" : metrics.stereoCorrelation.toFixed(2), Sparkles],
              ] as const
            ).map(([label, value, Icon]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[.03] p-4">
                <div className="flex items-center gap-2 text-xs text-ink-500">
                  <Icon size={14} className="text-cyan-300" />
                  {label}
                </div>
                <p className="mt-2 text-sm font-medium text-sand-50">{value}</p>
              </div>
            ))}
          </div>
        ) : null}

        {metrics ? (
          <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-black/15 p-4 sm:grid-cols-3">
            <EnergyBar label="Low energy" value={metrics.lowEnergyPct} color="bg-amber-400/80" />
            <EnergyBar label="Mid energy" value={metrics.midEnergyPct} color="bg-cyan-400/80" />
            <EnergyBar label="High energy" value={metrics.highEnergyPct} color="bg-violet-400/80" />
          </div>
        ) : null}

        <button type="button" disabled={!canAnalyze} onClick={() => void analyze()} className="btn-primary mt-6">
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> AI در حال تحلیل…
            </>
          ) : !isAdmin && quota.remaining <= 0 ? (
            <>
              <LockKeyhole size={16} /> سهمیه امروز تمام شده
            </>
          ) : (
            <>
              <Sparkles size={16} /> Analyze Music
            </>
          )}
        </button>
        {!isAdmin && !quota.pro && quota.remaining === 0 ? (
          <p className="mt-3 text-xs text-amber-200">کاربر Free روزانه ۱ تحلیل دارد. برای بیشتر، Pro را فعال کن.</p>
        ) : null}
        {isAdmin ? <p className="mt-3 text-xs text-emerald-200">ادمین: بدون محدودیت روزانه.</p> : null}
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      </div>

      {analysis ? (
        <div className="mt-6 space-y-4">
          <div className="card-ay p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow">AI REPORT · MUSIC ANALYZER</p>
                <h2 className="mt-2 text-xl text-sand-50">نتیجه تحلیل فایل</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-300">{analysis.fileSummary}</p>
              </div>
              {typeof analysis.matchScore === "number" ? (
                <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-5 py-3 text-center">
                  <p className="text-[10px] text-cyan-200/80">Match %</p>
                  <p className="text-2xl font-semibold text-cyan-100">{analysis.matchScore}</p>
                </div>
              ) : null}
            </div>
            {analysis.descriptors ? (
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
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card-ay p-6">
              <h3 className="text-base text-sand-50">Loudness / Dynamics</h3>
              <p className="mt-3 text-xs text-ink-400">
                Peak: <b className="text-sand-50">{analysis.loudness.peak}</b>
              </p>
              <p className="mt-2 text-xs text-ink-400">
                RMS: <b className="text-sand-50">{analysis.loudness.rms}</b>
              </p>
              <p className="mt-2 text-xs text-ink-400">
                Crest: <b className="text-sand-50">{analysis.loudness.crest}</b>
              </p>
              {analysis.loudness.targetLufs ? (
                <p className="mt-2 text-xs text-cyan-100">هدف: {analysis.loudness.targetLufs}</p>
              ) : null}
              {analysis.loudness.truePeak ? (
                <p className="mt-1 text-xs text-ink-400">True Peak: {analysis.loudness.truePeak}</p>
              ) : null}
              <p className="mt-4 text-sm leading-7 text-ink-300">{analysis.dynamics}</p>
              <p className="mt-3 text-sm leading-7 text-ink-300">{analysis.clipping}</p>
            </div>
            <div className="card-ay p-6">
              <h3 className="text-base text-sand-50">Tonal Profile</h3>
              <p className="mt-2 text-sm leading-7 text-ink-300">{analysis.tonal.summary}</p>
              <div className="mt-4 space-y-3">
                <EnergyBar label="Low" value={analysis.tonal.low} color="bg-amber-400/80" />
                <EnergyBar label="Mid" value={analysis.tonal.mid} color="bg-cyan-400/80" />
                <EnergyBar label="High" value={analysis.tonal.high} color="bg-violet-400/80" />
              </div>
            </div>
            <div className="card-ay p-6">
              <h3 className="text-base text-sand-50">Stereo</h3>
              <p className="mt-2 text-2xl text-cyan-100">{analysis.stereo.correlation?.toFixed(2) ?? "N/A"}</p>
              <p className="mt-3 text-sm leading-7 text-ink-300">{analysis.stereo.advice}</p>
            </div>
          </div>

          {analysis.compression ? (
            <div className="card-ay p-6 sm:p-8">
              <h3 className="text-base text-sand-50">Compression</h3>
              <p className="mt-2 text-sm leading-7 text-ink-300">{analysis.compression.summary}</p>
              <ul className="mt-4 grid gap-2 text-xs text-ink-400 sm:grid-cols-2">
                <li>Attack: {analysis.compression.attack}</li>
                <li>Release: {analysis.compression.release}</li>
                <li>Ratio: {analysis.compression.ratio}</li>
                <li>Threshold: {analysis.compression.thresholdHint}</li>
              </ul>
            </div>
          ) : null}

          <div className="card-ay p-6 sm:p-8">
            <h3 className="flex items-center gap-2 text-base text-sand-50">
              <Target size={18} className="text-gold-300" /> EQ / Mix Notes
            </h3>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {analysis.eq.map((x, i) => (
                <li key={i} className="rounded-lg border border-white/10 bg-white/[.02] px-4 py-3 text-sm leading-6 text-ink-300">
                  {x}
                </li>
              ))}
            </ul>
          </div>

          {analysis.mixBalance?.length ? (
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
          ) : null}

          <div className="card-ay p-6 sm:p-8">
            <h3 className="flex items-center gap-2 text-base text-sand-50">
              <CheckCircle2 size={18} className="text-emerald-300" /> Roadmap
            </h3>
            <ol className="mt-4 space-y-3">
              {analysis.roadmap.map((x, i) => (
                <li key={i} className="flex gap-3 text-sm leading-7 text-ink-300">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-xs text-emerald-200">
                    {i + 1}
                  </span>
                  {x}
                </li>
              ))}
            </ol>
          </div>

          {(analysis.quickFixes?.length || analysis.referenceTips) && (
            <div className="card-ay p-6">
              {analysis.quickFixes?.length ? (
                <>
                  <h3 className="text-base text-sand-50">Quick Fixes</h3>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {analysis.quickFixes.map((q) => (
                      <li key={q} className="rounded-lg border border-white/10 bg-white/[.02] px-3 py-2 text-xs text-ink-300">
                        {q}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {analysis.referenceTips ? <p className="mt-4 text-xs leading-6 text-ink-500">{analysis.referenceTips}</p> : null}
              {analysis.source ? <p className="mt-2 text-[10px] text-ink-600">source: {analysis.source}</p> : null}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
