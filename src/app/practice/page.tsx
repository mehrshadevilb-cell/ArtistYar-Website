"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowUpLeft,
  Award,
  BrainCircuit,
  Check,
  ExternalLink,
  Headphones,
  Layers3,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Volume2,
  Waves,
  X,
} from "lucide-react";

const PROGRESS_KEY = "artistyar-ear-training-progress";
type GameId = "eq" | "compression" | "stereo";
type Feedback = { correct: boolean; text: string } | null;
type PracticeRound = { value: string; label: string; hz?: number; amount?: number; width?: number };

type Progress = {
  score: number;
  answered: number;
  correct: number;
  bestStreak: number;
  streak: number;
  completed: Record<GameId, number>;
};

const initialProgress: Progress = {
  score: 0,
  answered: 0,
  correct: 0,
  bestStreak: 0,
  streak: 0,
  completed: { eq: 0, compression: 0, stereo: 0 },
};

const games = [
  {
    id: "eq" as const,
    eyebrow: "فرکانس و رنگ صدا",
    title: "کارآگاه EQ",
    description: "بشنو کدام ناحیه فرکانسی تقویت شده و گوش میکس‌ات را دقیق‌تر کن.",
    icon: Waves,
    tone: "from-amber-500/20 via-orange-950/30 to-ink-950",
    tags: ["Low / Mid / High", "مخصوص میکس"],
  },
  {
    id: "compression" as const,
    eyebrow: "داینامیک و کنترل",
    title: "آزمایشگاه کمپرس",
    description: "تفاوت صدای خشک، کمپرس ملایم و کمپرس شدید را با گوش تشخیص بده.",
    icon: Activity,
    tone: "from-sky-500/20 via-blue-950/30 to-ink-950",
    tags: ["Attack / Release", "سطح متوسط"],
  },
  {
    id: "stereo" as const,
    eyebrow: "استریو و فاز",
    title: "رادار استریو",
    description: "جای صدا و عرض استریو را پیدا کن؛ پایه‌ای برای پنینگ امن و میکس مونو.",
    icon: Headphones,
    tone: "from-violet-500/20 via-purple-950/30 to-ink-950",
    tags: ["Pan / Width", "با هدفون بهتر"],
  },
];

const resources = [
  {
    title: "Monosounds Ear Training",
    meta: "رایگان · ۵۰۰ سطح تمرین",
    text: "تمرین‌های سریع برای تشخیص فرکانس و تقویت گوش میکس بدون نیاز به اکانت.",
    href: "https://www.monosounds.com/",
  },
  {
    title: "MAET",
    meta: "فرکانس · کمپرسور · فاز",
    text: "برای تمرین عمیق‌تر روی فایل شخصی و شنیدن تفاوت‌های پردازش صدا.",
    href: "https://maet.app/",
  },
  {
    title: "EQ Academy",
    meta: "نرم‌افزار دسکتاپ رایگان",
    text: "محیطی کامل‌تر برای ساختن عادت تمرین EQ خارج از مرورگر.",
    href: "https://eqacademy.org/",
  },
  {
    title: "TrainYourEars EQ Edition",
    meta: "غیررایگان · پرداخت یکباره",
    text: "تمرین روی آهنگ‌های خودت برای وقتی که می‌خواهی هدفمندتر پیش بروی.",
    href: "https://www.trainyourears.com/",
  },
];

function loadProgress(): Progress {
  if (typeof window === "undefined") return initialProgress;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PROGRESS_KEY) || "null");
    return {
      ...initialProgress,
      ...(parsed || {}),
      completed: { ...initialProgress.completed, ...(parsed?.completed || {}) },
    };
  } catch {
    return initialProgress;
  }
}

function useAudioContext() {
  const contextRef = useRef<AudioContext | null>(null);
  function getContext() {
    if (!contextRef.current) {
      const AudioContextClass = window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;
      contextRef.current = new AudioContextClass();
    }
    if (contextRef.current.state === "suspended") void contextRef.current.resume();
    return contextRef.current;
  }
  useEffect(() => () => { void contextRef.current?.close(); }, []);
  return getContext;
}

function playNoise(getContext: () => AudioContext | null, boostHz?: number, compression = 0, stereo = 0) {
  const ctx = getContext();
  if (!ctx) return;
  const duration = 1.7;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i += 1) {
    const white = Math.random() * 2 - 1;
    last = last * 0.985 + white * 0.015;
    data[i] = white * 0.72 + last * 0.28;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.36, ctx.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  let node: AudioNode = source;
  if (boostHz) {
    const filter = ctx.createBiquadFilter();
    filter.type = "peaking";
    filter.frequency.value = boostHz;
    filter.Q.value = boostHz < 300 ? 0.8 : 1.2;
    filter.gain.value = 9;
    node.connect(filter);
    node = filter;
  }
  if (compression > 0) {
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = compression === 2 ? -35 : -16;
    compressor.ratio.value = compression === 2 ? 12 : 3;
    compressor.attack.value = compression === 2 ? 0.003 : 0.02;
    compressor.release.value = compression === 2 ? 0.08 : 0.22;
    node.connect(compressor);
    node = compressor;
  }
  if (stereo !== 0 && "createStereoPanner" in ctx) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = stereo;
    node.connect(panner);
    node = panner;
  }
  node.connect(gain).connect(ctx.destination);
  source.start();
}

function playStereo(getContext: () => AudioContext | null, width: number) {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  [-1, 1].forEach((side) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const pan = ctx.createStereoPanner();
    osc.frequency.value = side === -1 ? 220 : 330;
    pan.pan.value = side * width;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
    osc.connect(pan).connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.5);
  });
}

function PracticeGame({ game, progress, onResult }: { game: GameId; progress: Progress; onResult: (correct: boolean, game: GameId) => void }) {
  const getContext = useAudioContext();
  const [question, setQuestion] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [playing, setPlaying] = useState(false);

  const round = useMemo<PracticeRound>(() => {
    const eq = [
      { value: "low", label: "بیس / Low", hz: 120 },
      { value: "mid", label: "میانه / Mid", hz: 900 },
      { value: "high", label: "تریبل / High", hz: 5200 },
    ];
    const compression = [
      { value: "dry", label: "بدون کمپرس", amount: 0 },
      { value: "light", label: "کمپرس ملایم", amount: 1 },
      { value: "hard", label: "کمپرس شدید", amount: 2 },
    ];
    const stereo = [
      { value: "mono", label: "تقریباً مونو", width: 0 },
      { value: "wide", label: "استریو باز", width: 0.9 },
      { value: "left", label: "غالباً سمت چپ", width: -0.7 },
    ];
    const source: PracticeRound[] = game === "eq" ? eq : game === "compression" ? compression : stereo;
    return source[question % source.length];
  }, [game, question]);

  const labels = game === "eq"
    ? ["low", "mid", "high"]
    : game === "compression"
      ? ["dry", "light", "hard"]
      : ["mono", "wide", "left"];
  const title = games.find((item) => item.id === game)?.title || "تمرین";

  function playRound() {
    setPlaying(true);
    if (game === "eq") playNoise(getContext, round.hz);
    if (game === "compression") playNoise(getContext, undefined, round.amount);
    if (game === "stereo") playStereo(getContext, round.width ?? 0);
    window.setTimeout(() => setPlaying(false), 1800);
  }

  function choose(value: string) {
    if (answer) return;
    const correct = value === round.value;
    setAnswer(value);
    setFeedback({ correct, text: correct ? "گوش‌ات درست گرفت؛ عالی بود." : `پاسخ درست: ${round.label}` });
    onResult(correct, game);
  }

  function next() {
    setQuestion((value) => value + 1);
    setAnswer(null);
    setFeedback(null);
  }

  return (
    <div className="practice-game-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">تمرین {String((question % 9) + 1).padStart(2, "0")} / سطح مقدماتی</p>
          <h2 className="mt-3 text-2xl font-semibold text-sand-50">{title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-7 text-ink-300">با هدفون یا مانیتورینگ معمولی گوش بده، عجله نکن و بعد گزینه را انتخاب کن.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-gold-500/20 bg-gold-500/10 px-3 py-2 text-xs text-gold-300">
          <Target size={14} aria-hidden="true" /> امتیاز {progress.score}
        </div>
      </div>

      <button type="button" className="practice-play-button" onClick={playRound} disabled={playing}>
        {playing ? <Waves className="animate-pulse" size={22} aria-hidden="true" /> : <Play size={22} fill="currentColor" aria-hidden="true" />}
        <span>{playing ? "در حال پخش…" : "پخش نمونه صدا"}</span>
        <Volume2 size={16} className="ms-auto opacity-60" aria-hidden="true" />
      </button>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {labels.map((value) => {
          const option = game === "eq"
            ? ["بیس / Low", "میانه / Mid", "تریبل / High"][labels.indexOf(value)]
            : game === "compression"
              ? ["بدون کمپرس", "کمپرس ملایم", "کمپرس شدید"][labels.indexOf(value)]
              : ["تقریباً مونو", "استریو باز", "غالباً سمت چپ"][labels.indexOf(value)];
          const selected = answer === value;
          const correct = value === round.value;
          return (
            <button key={value} type="button" className={`practice-option ${selected ? (correct ? "is-correct" : "is-wrong") : ""}`} onClick={() => choose(value)} disabled={Boolean(answer)}>
              {selected && correct ? <Check size={16} aria-hidden="true" /> : selected ? <X size={16} aria-hidden="true" /> : null}
              <span>{option}</span>
            </button>
          );
        })}
      </div>

      {feedback ? (
        <div className={`mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 text-sm ${feedback.correct ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" : "border-rose-400/25 bg-rose-400/10 text-rose-200"}`}>
          <span>{feedback.text}</span>
          <button type="button" onClick={next} className="rounded-full border border-current/30 px-4 py-2 text-xs transition hover:bg-white/10">تمرین بعدی <ArrowUpLeft className="ms-1 inline" size={13} aria-hidden="true" /></button>
        </div>
      ) : <p className="mt-5 text-xs text-ink-500">هر سؤال را می‌توانی چند بار پخش کنی؛ پاسخ درست بعد از انتخاب نمایش داده می‌شود.</p>}
    </div>
  );
}

export default function PracticePage() {
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [activeGame, setActiveGame] = useState<GameId>("eq");

  useEffect(() => setProgress(loadProgress()), []);

  function handleResult(correct: boolean, game: GameId) {
    setProgress((current) => {
      const nextStreak = correct ? current.streak + 1 : 0;
      const next = {
        ...current,
        score: current.score + (correct ? 100 + current.streak * 25 : 20),
        answered: current.answered + 1,
        correct: current.correct + (correct ? 1 : 0),
        streak: nextStreak,
        bestStreak: Math.max(current.bestStreak, nextStreak),
        completed: { ...current.completed, [game]: current.completed[game] + 1 },
      };
      window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
      return next;
    });
  }

  function resetProgress() {
    setProgress(initialProgress);
    window.localStorage.removeItem(PROGRESS_KEY);
  }

  const accuracy = progress.answered ? Math.round((progress.correct / progress.answered) * 100) : 0;

  return (
    <main className="container-ay py-12 sm:py-16">
      <div className="practice-hero">
        <div className="relative z-10 max-w-3xl">
          <p className="eyebrow flex items-center gap-2"><Sparkles size={14} aria-hidden="true" /> آزمایشگاه گوش آرتیست‌یار</p>
          <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.3] tracking-tight text-sand-50 sm:text-6xl">تمرین کن، بازی کن، <span className="gold-shimmer">بهتر بشنو.</span></h1>
          <p className="mt-5 max-w-2xl text-pretty text-base leading-8 text-ink-300 sm:text-lg">میکس خوب فقط از پلاگین نمی‌آید؛ از گوش تربیت‌شده می‌آید. با بازی‌های کوتاه و رایگان، هر روز چند دقیقه روی EQ، کمپرس و استریو تمرین کن.</p>
          <div className="mt-7 flex flex-wrap gap-3 text-xs text-ink-400"><span className="rounded-full border border-white/10 bg-white/[.035] px-3 py-2">بدون اکانت</span><span className="rounded-full border border-white/10 bg-white/[.035] px-3 py-2">پیشرفت روی همین دستگاه</span><span className="rounded-full border border-white/10 bg-white/[.035] px-3 py-2">بهتر با هدفون</span></div>
        </div>
        <div className="practice-hero-mark" aria-hidden="true"><BrainCircuit size={42} /><span>LISTEN<br />BETTER</span></div>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-4" aria-label="پیشرفت تمرین">
        {([
          ["امتیاز", progress.score.toLocaleString("fa-IR"), Award],
          ["تمرین انجام‌شده", progress.answered.toLocaleString("fa-IR"), Layers3],
          ["دقت", `${accuracy.toLocaleString("fa-IR")}٪`, Target],
          ["بهترین streak", progress.bestStreak.toLocaleString("fa-IR"), Activity],
        ] as const).map(([label, value, Icon]) => <div key={String(label)} className="practice-stat"><Icon size={17} className="text-gold-400" aria-hidden="true" /><span>{label}</span><strong>{value}</strong></div>)}
      </section>

      <section className="mt-14" aria-labelledby="games-title">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">تمرین‌های داخلی</p><h2 id="games-title" className="section-title mt-3 !text-3xl sm:!text-4xl">از کدام بازی شروع می‌کنی؟</h2></div><button type="button" onClick={resetProgress} className="inline-flex items-center gap-2 text-xs text-ink-500 transition hover:text-gold-400"><RotateCcw size={14} aria-hidden="true" /> پاک‌کردن پیشرفت</button></div>
        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          {games.map((game) => { const Icon = game.icon; const active = activeGame === game.id; return <button key={game.id} type="button" onClick={() => setActiveGame(game.id)} className={`practice-game-card bg-gradient-to-br ${game.tone} ${active ? "is-active" : ""}`}><div className="flex items-start justify-between"><span className="practice-icon"><Icon size={22} aria-hidden="true" /></span><span className="text-xs text-gold-400">{progress.completed[game.id].toLocaleString("fa-IR")} دور</span></div><p className="mt-7 text-xs text-gold-400">{game.eyebrow}</p><h3 className="mt-2 text-xl font-semibold text-sand-50">{game.title}</h3><p className="mt-3 min-h-14 text-sm leading-7 text-ink-300">{game.description}</p><div className="mt-5 flex flex-wrap gap-2">{game.tags.map(tag => <span key={tag} className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-ink-400">{tag}</span>)}</div></button>; })}
        </div>
        <PracticeGame key={activeGame} game={activeGame} progress={progress} onResult={handleResult} />
      </section>

      <section className="mt-16" aria-labelledby="resources-title">
        <div className="max-w-2xl"><p className="eyebrow">بیرون از آرتیست‌یار</p><h2 id="resources-title" className="section-title mt-3 !text-3xl sm:!text-4xl">منابعی برای تمرین بیشتر</h2><p className="section-sub">اگر می‌خواهی جدی‌تر ادامه بدهی، این منابع را هم امتحان کن. لینک‌ها خارجی هستند و شرایط دسترسی/قیمت ممکن است تغییر کند.</p></div>
        <div className="mt-7 grid gap-4 md:grid-cols-2">{resources.map(resource => <a key={resource.title} href={resource.href} target="_blank" rel="noreferrer" className="resource-card"><div className="flex items-start justify-between gap-4"><div><h3 className="font-medium text-sand-50">{resource.title}</h3><p className="mt-2 text-[11px] text-gold-400">{resource.meta}</p></div><ExternalLink size={16} className="shrink-0 text-ink-500" aria-hidden="true" /></div><p className="mt-4 text-sm leading-7 text-ink-400">{resource.text}</p></a>)}</div>
      </section>

      <section className="mt-14 flex flex-wrap items-center justify-between gap-5 rounded-[1.6rem] border border-gold-500/20 bg-gold-500/[.06] p-6 sm:p-8"><div><p className="text-xs text-gold-400">تمرین پیشنهادی امروز</p><h2 className="mt-2 text-xl font-semibold text-sand-50">۵ دقیقه EQ + یک بار گوش‌دادن در مونو</h2><p className="mt-2 text-sm leading-7 text-ink-300">هر روز کوتاه تمرین کن؛ استمرار از رکورد یک‌روزه مهم‌تر است.</p></div><Link href="/assistant" className="btn-primary">از راه‌یار برنامه تمرین بگیر <ArrowUpLeft size={16} className="ms-2" aria-hidden="true" /></Link></section>
    </main>
  );
}
