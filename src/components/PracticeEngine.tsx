"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Award,
  AudioLines,
  Ear,
  FileAudio,
  Flame,
  Gamepad2,
  Headphones,
  Play,
  Sparkles,
  Target,
  Volume2,
  Waves,
} from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { PracticeProgressPanel } from "@/components/PracticeProgressPanel";
import { TheoryLab } from "@/components/TheoryLab";
import { SkillEngineDashboard } from "@/components/SkillEngineDashboard";
import { PracticeProBanner } from "@/components/PracticeProBanner";
import { ProGate } from "@/components/PracticeProGate";
import { DailyVoicingLab } from "@/components/DailyVoicingLab";
import { useAuth } from "@/components/AuthProvider";

type GameId = "hub" | "tone" | "eq" | "compressor" | "phase" | "theory" | "pro-arcade" | "voicing" | "personal";
type DrillId = "tone" | "eq" | "compressor" | "phase";

type AIQuestion = {
  gameId: DrillId;
  prompt: string;
  hint: string;
  answer: string | number;
  options: Array<string | number>;
  audio: Record<string, number | string>;
  difficulty: number;
  source: string;
  fingerprint?: string;
};

const drills: Array<{ id: DrillId; title: string; desc: string; icon: typeof Ear; color: string; tag: string }> = [
  { id: "tone", title: "فرکانس‌یاب", desc: "۵۰۰ سطح · تشخیص فرکانس مثل Soundgym / MAET", icon: Ear, color: "text-cyan-300", tag: "EQ / گوش" },
  { id: "eq", title: "کارآگاه EQ", desc: "ناحیه فرکانسی را بشنو — سبک TrainYourEars / EQ Academy", icon: Waves, color: "text-gold-300", tag: "میکس" },
  { id: "compressor", title: "حس کمپرسور", desc: "Attack · Release · Ratio · Threshold", icon: AudioLines, color: "text-violet-300", tag: "داینامیک" },
  { id: "phase", title: "شکارچی فاز", desc: "Polarity و تصویر استریو پایدار", icon: Volume2, color: "text-emerald-300", tag: "استریو" },
];

const starterQuestions: Record<DrillId, AIQuestion> = {
  tone: { gameId: "tone", prompt: "نمونه را گوش کن و نزدیک‌ترین فرکانس را انتخاب کن.", hint: "اول محدوده را پیدا کن، بعد فاصلهٔ نسبی را بسنج.", answer: 440, options: [220, 330, 440, 660], audio: { frequency: 440 }, difficulty: 1, source: "starter" },
  eq: { gameId: "eq", prompt: "نمونهٔ EQ را بشنو و ناحیهٔ اصلی تقویت‌شده را انتخاب کن.", hint: "به محل انرژی تغییر توجه کن، نه بلندی کلی.", answer: "حدود ۱kHz", options: ["زیر ۱۰۰Hz", "حدود ۲۵۰Hz", "حدود ۱kHz", "حدود ۸kHz"], audio: { frequency: 1000, gain: 6 }, difficulty: 1, source: "starter" },
  compressor: { gameId: "compressor", prompt: "رفتار کمپرسور را از روی نمونهٔ صوتی تشخیص بده.", hint: "به transient و سرعت بازگشت توجه کن.", answer: "Attack سریع", options: ["Attack سریع", "Attack آهسته", "Release سریع", "Ratio پایین"], audio: { attack: 0.003, release: 0.18, ratio: 8, threshold: -30 }, difficulty: 1, source: "starter" },
  phase: { gameId: "phase", prompt: "به نمونه گوش کن و polarity را تشخیص بده.", hint: "روی مرکز تصویر و استحکام low-end تمرکز کن.", answer: "normal", options: ["normal", "inverted"], audio: { frequency: 120, phase: "normal" }, difficulty: 1, source: "starter" },
};

function practiceLevel(xp: number) {
  return Math.min(500, Math.max(1, Math.floor(Math.max(0, xp) / 100) + 1));
}

function formatHz(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}kHz` : `${Math.round(v)}Hz`;
}

let sharedAudioContext: AudioContext | null = null;

async function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  sharedAudioContext ||= new AC();
  if (sharedAudioContext.state === "suspended") await sharedAudioContext.resume();
  return sharedAudioContext;
}

function playTone(frequency: number, duration = 1.15, pan = 0) {
  void (async () => {
    const ctx = await getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    if (panner) { panner.pan.value = Math.max(-1, Math.min(1, pan)); osc.connect(gain).connect(panner).connect(ctx.destination); }
    else osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  })();
}

function playEqDemo(centerHz: number, gainDb: number) {
  void (async () => {
    const ctx = await getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const length = Math.floor(ctx.sampleRate * 1.6);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const fade = Math.min(1, i / (ctx.sampleRate * 0.05), (length - i) / (ctx.sampleRate * 0.08));
      data[i] = (Math.random() * 2 - 1) * 0.28 * Math.max(0, fade);
    }
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = buffer;
    filter.type = "peaking";
    filter.frequency.setValueAtTime(centerHz, now);
    filter.Q.setValueAtTime(1.2, now);
    filter.gain.setValueAtTime(gainDb, now);
    gain.gain.value = 0.32;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(now); src.stop(now + 1.6);
  })();
}

function playCompressorDemo(params: Record<string, number | string>) {
  void (async () => {
    const ctx = await getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    const out = ctx.createGain();
    comp.attack.setValueAtTime(Math.max(0.001, Number(params.attack) || 0.005), now);
    comp.release.setValueAtTime(Math.max(0.03, Number(params.release) || 0.18), now);
    comp.ratio.setValueAtTime(Math.max(1, Number(params.ratio) || 4), now);
    comp.threshold.setValueAtTime(Number(params.threshold) || -24, now);
    osc.type = "sawtooth"; osc.frequency.value = 180;
    out.gain.setValueAtTime(0.0001, now);
    out.gain.exponentialRampToValueAtTime(0.16, now + 0.04);
    out.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
    osc.connect(env).connect(comp).connect(out).connect(ctx.destination);
    osc.start(now); osc.stop(now + 1.3);
  })();
}

function playPhaseDemo(phase: string) {
  void (async () => {
    const ctx = await getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime, length = Math.floor(ctx.sampleRate * 1.4);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    const left = buffer.getChannelData(0), right = buffer.getChannelData(1);
    const inverted = phase === "inverted";
    for (let i = 0; i < length; i++) {
      const t = i / ctx.sampleRate;
      const s = Math.sin(2 * Math.PI * 120 * t) * 0.55 + Math.sin(2 * Math.PI * 240 * t) * 0.22;
      const fade = Math.min(1, i / (ctx.sampleRate * 0.04), (length - i) / (ctx.sampleRate * 0.08));
      left[i] = s * fade; right[i] = (inverted ? -s : s) * fade;
    }
    const src = ctx.createBufferSource(), gain = ctx.createGain();
    gain.gain.value = 0.24; src.buffer = buffer; src.connect(gain).connect(ctx.destination);
    src.start(now); src.stop(now + 1.4);
  })();
}

export default function PracticeEngine() {
  const { user } = useAuth();
  const [active, setActive] = useState<GameId>("hub");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const level = practiceLevel(score);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("artistyar_arcade_score") || "{}");
      setScore(Number(saved.score) || 0);
      setStreak(Number(saved.streak) || 0);
    } catch { /* optional */ }
  }, []);

  const record = useCallback(
    async (correct: boolean, gameId: string) => {
      const nextScore = score + (correct ? 12 : 0);
      const nextStreak = correct ? streak + 1 : 0;
      try {
        let anonymousId = localStorage.getItem("artistyar_practice_anon");
        if (!anonymousId) {
          anonymousId = crypto.randomUUID();
          localStorage.setItem("artistyar_practice_anon", anonymousId);
        }
        await fetch("/api/practice/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            userId: user?.id || anonymousId,
            username: user?.username || "guest",
            fullName: user?.fullName || "Guest",
            telegramId: user?.telegramId,
            gameId,
            score: correct ? 12 : 0,
            accuracy: correct ? 100 : 0,
            streak: nextStreak,
            bestScore: nextScore,
            metadata: {
              dailyKey: new Date().toISOString().slice(0, 10),
              level: practiceLevel(nextScore),
              anonymous: !user?.id,
            },
          }),
        });
      } catch { /* offline ok */ }
      setScore(nextScore);
      setStreak(nextStreak);
      localStorage.setItem("artistyar_arcade_score", JSON.stringify({ score: nextScore, streak: nextStreak }));
    },
    [score, streak, user],
  );

  return (
    <main className="container-ay relative py-12 sm:py-16">
      <div className="route-ambient route-ambient-one" aria-hidden="true" />
      <SectionHeading
        eyebrow="PRACTICE ENGINE · SOUNDGYM-CLASS"
        title="تمرین شنیداری حرفه‌ای تا Level ۵۰۰"
        subtitle="فرکانس، EQ، کمپرسور و فاز — سوال‌های غیرتکراری با Multi-Agent AI، مسیر پیشرفت و اشتراک Pro."
      />
      <SkillEngineDashboard />

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="card-ay flex min-w-[200px] items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300"><Award size={18} /></span>
          <span>
            <span className="block text-[11px] text-ink-500">Level</span>
            <strong className="text-lg text-sand-50">{level}/500</strong>
          </span>
        </div>
        <div className="card-ay flex items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-400/10 text-orange-300"><Flame size={18} /></span>
          <span>
            <span className="block text-[11px] text-ink-500">Streak</span>
            <strong className="text-lg text-sand-50">{streak}</strong>
          </span>
        </div>
        <div className="card-ay flex items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300"><Target size={18} /></span>
          <span>
            <span className="block text-[11px] text-ink-500">XP</span>
            <strong className="text-lg text-sand-50">{score}</strong>
          </span>
        </div>
        <span className="text-xs text-ink-500">سوال‌ها از Multi-Agent می‌آیند و تکرار نمی‌شوند.</span>
      </div>

      {active === "hub" && (
        <div className="mt-10 space-y-6">
          <PracticeProBanner onUpgrade={() => setActive("pro-arcade")} />

          <div className="rounded-2xl border border-white/[.07] bg-white/[.02] p-5">
            <p className="eyebrow">EAR TRAINING ENGINE · مثل Soundgym / MAET / TrainYourEars</p>
            <h2 className="mt-2 text-xl text-sand-50">۴ مسیر اصلی شنیداری</h2>
            <p className="mt-2 text-sm leading-7 text-ink-400">
              هر مرحله سوال تازه می‌گیرد؛ fingerprint قبلی در سرور و مرورگر ذخیره می‌شود تا تکرار نشود.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {drills.map((g) => {
              const Icon = g.icon;
              return (
                <button
                  key={g.id}
                  type="button"
                  className="card-ay group p-6 text-right transition hover:-translate-y-0.5 hover:border-gold-400/35"
                  onClick={() => setActive(g.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[.04] ${g.color}`}>
                      <Icon size={22} />
                    </span>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-ink-400">{g.tag}</span>
                  </div>
                  <strong className="mt-4 block text-lg text-sand-50">{g.title}</strong>
                  <p className="mt-2 text-sm leading-7 text-ink-400">{g.desc}</p>
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" className="card-ay flex items-center gap-4 border-gold-400/20 p-5 text-right" onClick={() => setActive("pro-arcade")}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400/10 text-gold-300"><Gamepad2 size={22} /></span>
              <span className="flex-1">
                <span className="eyebrow">PRO</span>
                <strong className="mt-1 block text-sand-50">Professional Audio Skills</strong>
                <span className="text-xs text-ink-500">Reverb · Saturation · Masking · Transient</span>
              </span>
            </button>
            <button type="button" className="card-ay flex items-center gap-4 p-5 text-right" onClick={() => setActive("theory")}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300"><Sparkles size={22} /></span>
              <span className="flex-1">
                <span className="eyebrow">HARMONY</span>
                <strong className="mt-1 block text-sand-50">Theory Lab</strong>
                <span className="text-xs text-ink-500">Interval · Chord Quality</span>
              </span>
            </button>
            <button type="button" className="card-ay flex items-center gap-4 border-gold-400/15 p-5 text-right" onClick={() => setActive("voicing")}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400/10 text-gold-300"><Sparkles size={22} /></span>
              <span className="flex-1">
                <span className="eyebrow">PRO</span>
                <strong className="mt-1 block text-sand-50">Voicing روزانه</strong>
              </span>
            </button>
            <button type="button" className="card-ay flex items-center gap-4 p-5 text-right" onClick={() => setActive("personal")}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300"><FileAudio size={22} /></span>
              <span className="flex-1">
                <span className="eyebrow">A/B</span>
                <strong className="mt-1 block text-sand-50">تمرین شخصی</strong>
              </span>
            </button>
          </div>

          <PracticeProgressPanel />
        </div>
      )}

      {(active === "tone" || active === "eq" || active === "compressor" || active === "phase") && (
        <DrillStage
          gameId={active}
          level={level}
          onBack={() => setActive("hub")}
          onResult={(ok) => void record(ok, active)}
        />
      )}

      {active === "theory" && <TheoryLab onBack={() => setActive("hub")} />}
      {active === "voicing" && <DailyVoicingLab onBack={() => setActive("hub")} />}
      {active === "pro-arcade" && (
        <ProGate
          onBack={() => setActive("hub")}
          title="Professional Audio Skills"
          body="Reverb، Saturation، Masking و Transient برای کاربران Pro."
        />
      )}
      {active === "personal" && (
        <section className="mt-10">
          <button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={() => setActive("hub")}>
            بازگشت
          </button>
          <div className="card-ay mt-5 p-8 text-center">
            <FileAudio className="mx-auto text-emerald-300" size={34} />
            <h2 className="mt-4 text-xl text-sand-50">تمرین شخصی A/B</h2>
            <p className="mt-3 text-sm leading-8 text-ink-400">آپلود فایل برای مقایسه قبل/بعد به‌زودی کامل می‌شود.</p>
          </div>
        </section>
      )}
    </main>
  );
}

function DrillStage({
  gameId,
  level,
  onBack,
  onResult,
}: {
  gameId: DrillId;
  level: number;
  onBack: () => void;
  onResult: (ok: boolean) => void;
}) {
  const { user } = useAuth();
  const [q, setQ] = useState<AIQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<string | number | null>(null);
  const [stage, setStage] = useState(0);
  const [sourceLabel, setSourceLabel] = useState("");

  const loadQuestion = useCallback(async () => {
    setLoading(true);
    setPicked(null);
    setQ(starterQuestions[gameId]);
    const recentKey = `artistyar_practice_ai_recent_${gameId}`;
    let recent: string[] = [];
    try {
      recent = JSON.parse(localStorage.getItem(recentKey) || "[]");
    } catch { /* ignore */ }
    let anonymousId = localStorage.getItem("artistyar_practice_anon");
    if (!anonymousId) {
      anonymousId = crypto.randomUUID();
      localStorage.setItem("artistyar_practice_anon", anonymousId);
    }
    try {
      const res = await fetch("/api/practice/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          gameId,
          level,
          userId: user?.id || anonymousId,
          recent: recent.slice(-16),
        }),
      });
      const data = await res.json();
      if (data?.ok && data.question) {
        setQ(data.question);
        setSourceLabel(String(data.question.source || "ai"));
        const fp = String(data.question.fingerprint || "");
        if (fp) localStorage.setItem(recentKey, JSON.stringify([...recent, fp].slice(-32)));
      }
    } catch {
      setQ(starterQuestions[gameId]);
      setSourceLabel("starter");
    } finally {
      setLoading(false);
    }
  }, [gameId, level, user?.id]);

  useEffect(() => {
    void loadQuestion();
  }, [loadQuestion, stage]);

  function playDemo() {
    if (!q) return;
    if (gameId === "tone") {
      playTone(Number(q.audio.frequency || q.answer));
      return;
    }
    if (gameId === "eq") {
      playEqDemo(Number(q.audio.frequency) || 1000, Number(q.audio.gain) || 6);
      return;
    }
    if (gameId === "phase") {
      const inverted = String(q.answer) === "inverted";
      playTone(180, 1.1, inverted ? 0.85 : -0.2);
      return;
    }
    if (gameId === "compressor") { playCompressorDemo(q.audio); return; }
    playPhaseDemo(String(q.answer));
  }

  function choose(opt: string | number) {
    if (!q || picked !== null) return;
    setPicked(opt);
    const ok = String(opt) === String(q.answer);
    onResult(ok);
  }

  const title = drills.find((d) => d.id === gameId)?.title || gameId;

  return (
    <section className="mt-10">
      <button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>
        بازگشت
      </button>
      <div className="card-ay mt-5 p-6 sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">STAGE {stage + 1} · LEVEL {level}</p>
            <h1 className="mt-2 text-2xl font-semibold text-sand-50">{title}</h1>
          </div>
          {sourceLabel ? (
            <span className="rounded-full border border-cyan-400/20 px-3 py-1 text-[10px] text-cyan-200">
              {sourceLabel.startsWith("ensemble") ? "Multi-Agent" : sourceLabel}
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/[.05] px-4 py-3 text-xs text-emerald-100">
          <Headphones size={14} /> هدفون یا مانیتور · ولوم ثابت · یک‌بار پخش و بعد انتخاب
        </div>

        {loading && <p className="mt-8 text-center text-sm text-ink-500">در حال ساخت سوال غیرتکراری با Multi-Agent…</p>}

        {!loading && q && (
          <>
            <p className="mt-6 text-base leading-8 text-sand-100">{q.prompt}</p>
            {q.hint ? <p className="mt-2 text-xs text-ink-500">راهنما: {q.hint}</p> : null}

            <button type="button" className="btn-primary mt-6" onClick={playDemo}>
              <Play size={15} fill="currentColor" /> پخش نمونه
            </button>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {q.options.map((opt) => {
                const label = typeof opt === "number" ? formatHz(opt) : String(opt);
                const isPick = picked !== null && String(picked) === String(opt);
                const isCorrect = picked !== null && String(opt) === String(q.answer);
                return (
                  <button
                    key={String(opt)}
                    type="button"
                    disabled={picked !== null}
                    onClick={() => choose(opt)}
                    className={`rounded-xl border p-4 text-sm transition ${
                      isCorrect
                        ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-100"
                        : isPick
                          ? "border-red-400/40 bg-red-400/10 text-red-100"
                          : "border-white/10 text-ink-200 hover:border-gold-400/40"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {picked !== null && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <p className={`text-sm ${String(picked) === String(q.answer) ? "text-emerald-200" : "text-red-200"}`}>
                  {String(picked) === String(q.answer)
                    ? "درست — به مرحله بعد برو."
                    : `نادرست — پاسخ: ${typeof q.answer === "number" ? formatHz(Number(q.answer)) : q.answer}`}
                </p>
                <button
                  type="button"
                  className="btn-primary !px-4 !py-2 text-xs"
                  onClick={() => setStage((s) => s + 1)}
                >
                  سوال بعدی (غیرتکراری)
                </button>
              </div>
            )}
          </>
        )}

        {!loading && !q && (
          <div className="mt-8 text-center">
            <p className="text-sm text-ink-400">سوال آماده نشد. دوباره تلاش کن.</p>
            <button type="button" className="btn-primary mt-4" onClick={() => setStage((s) => s + 1)}>
              تلاش مجدد
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
