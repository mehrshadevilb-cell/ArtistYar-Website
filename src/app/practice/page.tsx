"use client";

import { ChangeEvent, RefObject, useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, Award, Check, CircleHelp, Ear, FileAudio, Flame, Gamepad2, Headphones, LockKeyhole, Pause, Play, RotateCcw, Sparkles, Target, Upload, Volume2, Waves, X } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { useAuth } from "@/components/AuthProvider";
import type { SessionUser } from "@/lib/auth";
import { PracticeProgressPanel } from "@/components/PracticeProgressPanel";
import { TheoryLab } from "@/components/TheoryLab";

type GameId = "hub" | "tone" | "eq" | "compressor" | "phase" | "personal" | "pro-arcade" | "theory";
type Game = { id: Exclude<GameId, "hub" | "personal">; title: string; description: string; icon: typeof Ear; color: string; tag: string };

const games: Game[] = [
  { id: "tone", title: "فرکانس‌یاب", description: "یک تون مرموز را گوش کن و نزدیک‌ترین فرکانس را پیدا کن.", icon: Ear, color: "text-cyan-300", tag: "EQ / گوش" },
  { id: "eq", title: "کارآگاه EQ", description: "قبل از دیدن پاسخ، حدس بزن مشکل در کدام ناحیه‌ی فرکانسی است.", icon: Waves, color: "text-gold-300", tag: "میکس" },
  { id: "compressor", title: "حس کمپرسور", description: "رفتار attack و release را از روی تغییرات صدا تشخیص بده.", icon: AudioLines, color: "text-violet-300", tag: "داینامیک" },
  { id: "phase", title: "شکارچی فاز", description: "حالت درست و غلط فاز را بشنو و تصویر پایدارتر را انتخاب کن.", icon: Volume2, color: "text-emerald-300", tag: "استریو" },
];

const toneRounds = [
  { frequency: 110, options: [80, 110, 180, 260] },
  { frequency: 440, options: [220, 330, 440, 660] },
  { frequency: 1200, options: [700, 900, 1200, 1800] },
  { frequency: 4200, options: [2400, 3200, 4200, 6000] },
];
const eqRounds = [
  { answer: "زیر ۱۰۰Hz", prompt: "میکس گل‌آلود است و kick فضای زیادی اشغال کرده.", hint: "به low-end و rumble فکر کن." },
  { answer: "حدود ۳kHz", prompt: "وکال تیز و خسته‌کننده شنیده می‌شود.", hint: "حضور و edge معمولاً این اطراف است." },
  { answer: "حدود ۱۰kHz", prompt: "میکس کدر است و هوا کم دارد.", hint: "به high-shelf و air فکر کن." },
  { answer: "حدود ۲۵۰Hz", prompt: "سازها جعبه‌ای و پر از mud هستند.", hint: "بدنه‌ی پایینِ میانی را بررسی کن." },
];
const compressorRounds = [
  { answer: "Attack سریع", prompt: "ترنزینت‌ها نرم شده‌اند و ضربه‌ی ابتدایی کمتر شنیده می‌شود.", hint: "کمپرسور سریع‌تر وارد عمل شده است." },
  { answer: "Release آهسته", prompt: "صدا بعد از ضربه دیرتر به سطح عادی برمی‌گردد و حس کشیده‌شدن دارد.", hint: "به زمان برگشت gain reduction گوش کن." },
  { answer: "Ratio بالا", prompt: "با کمی افزایش ورودی، خروجی خیلی کمتر بالا می‌رود.", hint: "شیب رابطه‌ی input و output را تصور کن." },
  { answer: "Threshold پایین", prompt: "تقریباً تمام اجرای ساز تحت gain reduction قرار گرفته است.", hint: "نقطه‌ی شروع فشرده‌سازی پایین‌تر است." },
];
const phaseOptions = ["مرکز و محکم", "پهن اما ناپایدار", "کاملاً بی‌صدا", "فقط در سمت چپ"];

function formatFrequency(value: number) { return value >= 1000 ? `${value / 1000}kHz` : `${value}Hz`; }

function playTone(frequency: number, duration = 1.3, pan = 0) {
  if (typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const panner = context.createStereoPanner ? context.createStereoPanner() : null;
  oscillator.type = "sine"; oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  if (panner) { panner.pan.value = Math.max(-1, Math.min(1, pan)); oscillator.connect(gain).connect(panner).connect(context.destination); }
  else oscillator.connect(gain).connect(context.destination);
  oscillator.start(); oscillator.stop(context.currentTime + duration + 0.05);
  window.setTimeout(() => void context.close(), (duration + 0.2) * 1000);
}

export default function PracticePage() {
  const { user } = useAuth();
  const [active, setActive] = useState<GameId>("hub");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [toneRound, setToneRound] = useState(0);
  const [toneAnswer, setToneAnswer] = useState<number | null>(null);
  const [eqRound, setEqRound] = useState(0);
  const [eqAnswer, setEqAnswer] = useState<string | null>(null);
  const [phaseAnswer, setPhaseAnswer] = useState<number | null>(null);
  const [compressorRound, setCompressorRound] = useState(0);
  const [compressorAnswer, setCompressorAnswer] = useState<string | null>(null);
  const [personalUrl, setPersonalUrl] = useState("");
  const [personalName, setPersonalName] = useState("");
  const [personalLoop, setPersonalLoop] = useState(false);
  const [personalSpeed, setPersonalSpeed] = useState("1");
  const personalAudio = useRef<HTMLAudioElement | null>(null);
  const rank = score >= 500 ? "گوش طلایی" : score >= 250 ? "میکس‌خوان" : score >= 100 ? "شنونده‌ی دقیق" : "شروع‌کننده";
  const rankFloor = score >= 500 ? 500 : score >= 250 ? 250 : score >= 100 ? 100 : 0;
  const rankCeiling = score >= 500 ? 750 : score >= 250 ? 500 : score >= 100 ? 250 : 100;
  const rankProgress = Math.min(100, Math.round(((score - rankFloor) / (rankCeiling - rankFloor)) * 100));

  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem("artistyar_arcade_score") || "{}"); setScore(Number(saved.score) || 0); setStreak(Number(saved.streak) || 0); } catch { /* local-only progress is optional */ } }, []);
  function record(correct: boolean) {
    const nextScore = score + (correct ? 10 : 0); const nextStreak = correct ? streak + 1 : 0;
    setScore(nextScore); setStreak(nextStreak);
    localStorage.setItem("artistyar_arcade_score", JSON.stringify({ score: nextScore, streak: nextStreak }));
    if (user?.id && user.username) void fetch("/api/practice/progress",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({userId:user.id,username:user.username,fullName:user.fullName,gameId:active,score:correct?10:0,accuracy:correct?100:0,streak:nextStreak,bestScore:nextScore,metadata:{dailyKey:new Date().toISOString().slice(0,10)}})}).catch(()=>{});
  }
  function uploadPersonal(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; if (personalUrl) URL.revokeObjectURL(personalUrl); setPersonalUrl(URL.createObjectURL(file)); setPersonalName(file.name); }
  function resetGame() { setToneAnswer(null); setEqAnswer(null); setPhaseAnswer(null); setCompressorAnswer(null); }

  return <main className="container-ay relative py-12 sm:py-16"><div className="route-ambient route-ambient-one" aria-hidden="true" /><SectionHeading eyebrow="تمرین‌خانه / Practice Arcade" title="گوشَت را مثل یک ساز تمرین بده." subtitle="بازی‌های کوتاه و شنیداری برای میکس، EQ، داینامیک و فاز؛ بدون اکانت، بدون رتبه‌بندی مصنوعی، فقط تمرین واقعی." />
    <div className="mt-8 flex flex-wrap items-center gap-3"><div className="card-ay flex min-w-[220px] items-center gap-3 px-4 py-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300"><Award size={18} /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2 text-[11px] text-ink-500"><span>رتبه‌ی حرفه‌ای</span><strong className="text-gold-300">{rank}</strong></span><span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/[.08]"><span className="block h-full rounded-full bg-gold-400 transition-[width]" style={{ width: `${rankProgress}%` }} /></span><strong className="mt-1 block text-sm text-sand-50">{score} XP</strong></span></div><div className="card-ay flex items-center gap-3 px-4 py-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-400/10 text-orange-300"><Flame size={18} /></span><span><span className="block text-[11px] text-ink-500">زنجیره</span><strong className="text-lg text-sand-50">{streak}</strong></span></div><span className="flex items-center gap-2 text-xs text-ink-500"><LockKeyhole size={14} className="text-gold-400" />پیشرفت فقط روی همین دستگاه ذخیره می‌شود.</span></div>
    {active === "hub" ? <><Hub onSelect={(id) => { resetGame(); setActive(id); }} /><PracticeProgressPanel /></> : active === "pro-arcade" ? <ProArcade onBack={() => setActive("hub")} /> : active === "theory" ? <TheoryLab onBack={() => setActive("hub")} /> : active === "personal" ? <Personal url={personalUrl} name={personalName} audioRef={personalAudio} loop={personalLoop} speed={personalSpeed} onLoopChange={setPersonalLoop} onSpeedChange={setPersonalSpeed} onUpload={uploadPersonal} onBack={() => setActive("hub")} /> : <GameStage active={active} toneRound={toneRound} setToneRound={setToneRound} toneAnswer={toneAnswer} setToneAnswer={(value) => { setToneAnswer(value); record(value === toneRounds[toneRound].frequency); }} eqRound={eqRound} setEqRound={setEqRound} eqAnswer={eqAnswer} setEqAnswer={(value) => { setEqAnswer(value); record(value === eqRounds[eqRound].answer); }} compressorRound={compressorRound} setCompressorRound={setCompressorRound} compressorAnswer={compressorAnswer} setCompressorAnswer={(value) => { setCompressorAnswer(value); record(value === compressorRounds[compressorRound].answer); }} phaseAnswer={phaseAnswer} setPhaseAnswer={(value) => { setPhaseAnswer(value); record(value === 0); }} onBack={() => setActive("hub")} onReset={resetGame} />}
  </main>;
}

function Hub({ onSelect }: { onSelect: (id: GameId) => void }) {
  const daily = games[new Date().getDate() % games.length];
  return <div className="mt-10 space-y-6"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4"><span className="eyebrow">500+ LEVEL PATH</span><strong className="mt-2 block text-sm text-sand-50">مسیر سطح‌بندی</strong><span className="mt-1 block text-xs text-ink-500">از تمرین پایه تا گوش حرفه‌ای</span></div><div className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4"><span className="eyebrow">SKILL RATING</span><strong className="mt-2 block text-sm text-sand-50">امتیاز مهارت</strong><span className="mt-1 block text-xs text-ink-500">رکورد، Accuracy و Streak</span></div><div className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4"><span className="eyebrow">DAILY 5 MIN</span><strong className="mt-2 block text-sm text-sand-50">چالش روزانه</strong><span className="mt-1 block text-xs text-ink-500">تمرین کوتاه و قابل تکرار</span></div></div><div className="rounded-2xl border border-gold-400/20 bg-gradient-to-l from-gold-400/[.12] to-white/[.025] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><span className="eyebrow">چالش امروز / Daily Challenge</span><h2 className="mt-2 text-lg font-medium text-sand-50">امروز فقط ۵ دقیقه روی {daily.title} تمرکز کن.</h2><p className="mt-1 text-xs leading-6 text-ink-400">هر روز یک مهارت را انتخاب کن؛ کیفیت تمرین از تعداد بازی مهم‌تر است.</p></div><button type="button" className="btn-primary !px-4 !py-2 text-xs" onClick={() => onSelect(daily.id)}>شروع چالش</button></div></div><div className="grid gap-4 md:grid-cols-2">{games.map((game) => { const Icon = game.icon; return <button key={game.id} type="button" className="card-ay group p-6 text-right transition duration-300 hover:-translate-y-1 hover:border-gold-400/35" onClick={() => onSelect(game.id)}><div className="flex items-start justify-between gap-4"><span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[.05] ${game.color}`}><Icon size={23} /></span><span className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-ink-500">{game.tag}</span></div><h2 className="mt-6 text-xl font-medium text-sand-50">{game.title}</h2><p className="mt-2 max-w-md text-sm leading-7 text-ink-400">{game.description}</p><span className="mt-6 inline-flex items-center gap-2 text-xs text-gold-300">شروع بازی <Play size={13} fill="currentColor" /></span></button>; })}</div><button type="button" className="card-ay group flex w-full flex-col items-start gap-4 border-gold-400/20 bg-gradient-to-l from-gold-400/[.09] to-white/[.02] p-6 text-right transition hover:border-gold-400/40 sm:flex-row sm:items-center" onClick={() => onSelect("pro-arcade")}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold-400/10 text-gold-300"><Gamepad2 size={23} /></span>
      <span className="flex-1">
        <span className="eyebrow">PRO ARCADE / Browser Games</span>
        <strong className="mt-2 block text-lg text-sand-50">مینی‌گیم‌های زنده‌ی شنیداری</strong>
        <span className="mt-1 block text-sm leading-7 text-ink-400">بازی‌های HTML5 سریع و حرفه‌ای برای reaction، rhythm و stereo focus؛ بدون Flash و بدون نصب.</span>
      </span>
      <span className="rounded-full border border-gold-400/25 px-3 py-1 text-[10px] text-gold-300">PRO</span>
    </button>
    <button type="button" className="card-ay group flex w-full flex-col items-start gap-4 border-violet-400/20 bg-gradient-to-l from-violet-400/[.08] to-white/[.02] p-6 text-right transition hover:border-violet-400/40 sm:flex-row sm:items-center" onClick={() => onSelect("theory")}><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300"><Sparkles size={23} /></span><span className="flex-1"><span className="eyebrow">THEORY LAB / تئوری موسیقی</span><strong className="mt-2 block text-lg text-sand-50">تشخیص فاصله، آکورد و گام</strong><span className="mt-1 block text-sm leading-7 text-ink-400">تمرین شنیداری Interval و Chord Quality با Level progression.</span></span><span className="rounded-full border border-violet-400/25 px-3 py-1 text-[10px] text-violet-300">THEORY</span></button>\n    <button type="button" className="card-ay group flex w-full flex-col items-start gap-4 p-6 text-right transition hover:border-gold-400/35 sm:flex-row sm:items-center" onClick={() => onSelect("personal")}><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300"><FileAudio size={23} /></span><span className="flex-1"><span className="eyebrow">تمرین شخصی / بدون آپلود</span><strong className="mt-2 block text-lg text-sand-50">فایل خودت را وارد کن و A/B تمرین کن</strong><span className="mt-1 block text-sm leading-7 text-ink-400">یک فایل صوتی را فقط در مرورگر باز کن، بخش‌های مختلفش را loop کن و با هدف مشخص گوش بده.</span></span><Upload size={18} className="text-gold-300" /></button><div className="grid gap-4 rounded-2xl border border-gold-400/15 bg-gold-400/[.045] p-5 text-sm leading-7 text-ink-300 md:grid-cols-3"><p><strong className="text-sand-50">۱. گوش بده</strong><br />اول با گوش تصمیم بگیر، بعد سراغ analyzer برو.</p><p><strong className="text-sand-50">۲. حدس بزن</strong><br />پاسخ اولت را ثبت کن و از دیدن جواب نترس.</p><p><strong className="text-sand-50">۳. تکرار کن</strong><br />رکورد تو روی همین دستگاه می‌ماند و نیاز به حساب ندارد.</p></div>
  </div>;
}


function ProArcade({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const rawUser = user as SessionUser & { isPro?: boolean; plan?: string; tier?: string; subscription?: string };
  const isPro = Boolean(
    user?.role === "admin" ||
    rawUser?.isPro === true ||
    ["pro", "professional", "premium", "راهیار پرو", "راه‌یار پرو"].includes(String(rawUser?.plan || rawUser?.tier || rawUser?.subscription || "").toLowerCase())
  );

  type Mode = "reaction" | "rhythm" | "stereo" | "memory" | "frequency" | "pan";
  const [mode, setMode] = useState<Mode>("reaction");
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [round, setRound] = useState(1);
  const [message, setMessage] = useState("یک بازی را انتخاب کن.");
  const [target, setTarget] = useState({ x: 50, y: 50 });
  const [beat, setBeat] = useState(0);
  const [stereo, setStereo] = useState<"L" | "R" | null>(null);
  const [frequency, setFrequency] = useState(440);
  const [frequencyOptions, setFrequencyOptions] = useState([440, 880, 660, 330]);
  const [memorySequence, setMemorySequence] = useState<number[]>([]);
  const [memoryInput, setMemoryInput] = useState<number[]>([]);
  const [pan, setPan] = useState<"L" | "R" | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("artistyar_pro_arcade_v2") || "{}");
      setBest(Math.max(0, Number(saved.best) || 0));
    } catch {}
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, []);

  function persist(value: number) {
    setScore(value);
    if (value > best) {
      setBest(value);
      localStorage.setItem("artistyar_pro_arcade_v2", JSON.stringify({ best: value }));
    }
    if (user?.id && user.username) void fetch("/api/practice/progress",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({userId:user.id,username:user.username,fullName:user.fullName,gameId:`pro-${mode}`,score:value,accuracy:value>0?100:0,streak:0,bestScore:Math.max(value,best),metadata:{dailyKey:new Date().toISOString().slice(0,10)}})}).catch(()=>{});
  }

  function stopTimer() { if (timer.current) { window.clearTimeout(timer.current); timer.current = null; } }

  function startReaction() {
    stopTimer(); setRunning(true); setScore(0); setRound(1); setStartedAt(0); setMessage("صبر کن… وقتی هدف ظاهر شد کلیک کن.");
    const delay = 700 + Math.random() * 2200;
    timer.current = window.setTimeout(() => {
      setTarget({ x: 12 + Math.random() * 76, y: 16 + Math.random() * 68 });
      setStartedAt(performance.now()); setMessage("GO — سریع!");
    }, delay);
  }

  function hitReaction() {
    if (!running) return;
    if (!startedAt) { stopTimer(); setRunning(false); setMessage("زود زدی — false start."); return; }
    const ms = Math.max(1, performance.now() - startedAt);
    const points = Math.max(10, Math.round(700 - ms));
    persist(points); setRunning(false); setStartedAt(0); setMessage(`${Math.round(ms)}ms · +${points} XP`);
  }

  function startRhythm() {
    stopTimer(); setRunning(true); setScore(0); setRound(1); setBeat(0); setMessage("چهار ضرب را دقیق بزن.");
    let n = 0;
    const tick = () => {
      n += 1; setBeat(n % 4);
      if (n < 28) timer.current = window.setTimeout(tick, 390);
      else { setRunning(false); setMessage("راند تمام شد."); }
    };
    tick();
  }

  function hitBeat(index: number) {
    if (!running) return;
    const points = index === beat ? 25 : -10;
    persist(Math.max(0, score + points));
    setMessage(index === beat ? "Perfect timing · +25" : "Off beat · -10");
  }

  function startStereo() {
    stopTimer(); const side = Math.random() > .5 ? "L" : "R"; setRunning(true); setScore(0); setStereo(side); setMessage("فقط به جهت صدا گوش کن."); playTone(330, 1.15, side === "L" ? -0.9 : 0.9);
    timer.current = window.setTimeout(() => { setRunning(false); setStereo(null); setMessage("زمان تمام شد."); }, 2200);
  }

  function chooseStereo(side: "L" | "R") {
    if (!running || !stereo) return;
    stopTimer(); const ok = side === stereo;
    persist(ok ? score + 50 : score); setMessage(ok ? "Correct stereo focus · +50" : "Wrong side");
    setRunning(false); setStereo(null);
  }

  function startFrequency() {
    const pool = [80,110,220,440,880,1200,2400,4200,8000];
    const f = pool[Math.floor(Math.random() * pool.length)];
    const opts = Array.from(new Set([f, pool[Math.floor(Math.random()*pool.length)], pool[Math.floor(Math.random()*pool.length)], pool[Math.floor(Math.random()*pool.length)]]));
    while(opts.length<4) opts.push(pool[Math.floor(Math.random()*pool.length)]);
    setFrequency(f); setFrequencyOptions(opts.slice(0,4)); setRunning(true); setMessage("تون را گوش کن و فرکانس را تشخیص بده."); playTone(f, 1.1);
  }

  function chooseFrequency(value: number) {
    if (!running) return;
    const ok = value === frequency;
    persist(ok ? score + 60 : score);
    setMessage(ok ? `Correct · ${formatFrequency(frequency)} · +60` : `Wrong · جواب ${formatFrequency(frequency)}`);
    setRunning(false);
  }

  function startMemory() {
    const next = [...Array(round + 2)].map(() => Math.floor(Math.random()*4));
    setMemorySequence(next); setMemoryInput([]); setRunning(true); setMessage("ترتیب صداها را به خاطر بسپار.");
    let i=0;
    const show=()=>{ if(i<next.length){ const tone = [220,330,440,660][next[i]]; setBeat(next[i]); playTone(tone, .32); i++; timer.current=window.setTimeout(show,520); } else { setBeat(-1); setMessage("حالا همان ترتیب را با دکمه‌ها تکرار کن."); } };
    show();
  }

  function memoryPick(index:number) {
    if(!running || beat !== -1) return;
    const next=[...memoryInput,index]; setMemoryInput(next);
    const expected=memorySequence[next.length-1];
    if(index!==expected){ setRunning(false); persist(score); setMessage("اشتباه — حافظه‌ی شنیداری را دوباره بساز."); return; }
    if(next.length===memorySequence.length){ const gain=40+round*10; persist(score+gain); setRound(round+1); setRunning(false); setMessage(`Perfect memory · +${gain} XP`); }
  }

  function startPan() {
    const side = Math.random() > .5 ? "L" : "R"; setRunning(true); setPan(side); setMessage("به موقعیت صدا گوش کن و سمت را انتخاب کن."); playTone(260, .9, side === "L" ? -0.85 : 0.85);
  }

  function choosePan(side:"L"|"R") {
    if(!running || !pan) return;
    const ok=side===pan; persist(ok?score+45:score); setRunning(false); setMessage(ok?"Pan locked · +45":"Wrong pan"); setPan(null);
  }

  function switchMode(next: Mode) {
    stopTimer(); setRunning(false); setStartedAt(0); setStereo(null); setPan(null); setMemoryInput([]); setMode(next); setScore(0); setRound(1);
    const labels: Record<Mode,string>={reaction:"واکنش سریع",rhythm:"تایمینگ ریتم",stereo:"تمرکز استریو",memory:"حافظه‌ی شنیداری",frequency:"فرکانس‌یابی",pan:"تشخیص پن"};
    setMessage(labels[next]);
  }

  if (!isPro) {
    return <section className="mt-10">
      <div className="card-ay overflow-hidden border-gold-400/20 p-7 text-center sm:p-12">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gold-400/10 text-gold-300"><LockKeyhole size={30}/></span>
        <p className="eyebrow mt-6">PRO ONLY / ARCADE</p>
        <h1 className="mt-3 text-2xl font-semibold text-sand-50">آرکید حرفه‌ای برای اعضای Pro</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-8 text-ink-400">شش مینی‌گیم زنده برای reaction، rhythm، stereo، memory، frequency و pan. دسترسی به این بخش با اشتراک Pro فعال می‌شود.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button type="button" className="btn-primary" onClick={() => window.location.href="/courses"}>مشاهده مسیر Pro</button>
          <button type="button" className="btn-ghost" onClick={onBack}>بازگشت</button>
        </div>
      </div>
    </section>;
  }

  const modes: [Mode,string,string][] = [
    ["reaction","Reaction Lab","ms accuracy"],
    ["rhythm","Rhythm Grid","timing"],
    ["stereo","Stereo Focus","L / R"],
    ["memory","Audio Memory","sequence"],
    ["frequency","Frequency Hunt","Hz"],
    ["pan","Pan Detective","position"],
  ];

  return <section className="mt-10 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>بازگشت به آرکید</button>
      <div className="flex items-center gap-3 text-xs text-ink-500"><Gamepad2 size={15} className="text-gold-400"/>PRO BROWSER ARCADE · 6 GAMES</div>
    </div>
    <div className="card-ay overflow-hidden p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[.07] pb-5">
        <div><p className="eyebrow">LIVE HTML5 / NO FLASH</p><h1 className="mt-2 text-2xl font-semibold text-sand-50">Pro Audio Arcade</h1><p className="mt-2 text-sm leading-7 text-ink-400">مینی‌گیم‌های سریع، قابل تکرار و مناسب تمرین گوش و reaction.</p></div>
        <div className="text-left"><span className="block text-[10px] text-ink-500">BEST</span><strong className="text-xl text-gold-300">{best}</strong></div>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {modes.map(([id,title,desc]) => <button key={id} type="button" onClick={()=>switchMode(id)} className={`rounded-2xl border p-4 text-right transition ${mode===id?"border-gold-400/35 bg-gold-400/[.07]":"border-white/[.08] bg-white/[.02] hover:border-gold-400/20"}`}><strong className="block text-sm text-sand-50">{title}</strong><span className="mt-1 block text-[10px] text-ink-500">{desc}</span></button>)}
      </div>
      <div className="mt-5 rounded-3xl border border-white/[.08] bg-black/20 p-5 sm:p-8">
        {mode==="reaction" ? <div className="text-center"><p className="text-sm text-ink-400">{message}</p><div className="relative mx-auto mt-5 h-64 max-w-2xl overflow-hidden rounded-2xl border border-white/[.07] bg-white/[.025]">{startedAt?<button type="button" onClick={hitReaction} className="absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold-300 bg-gold-400/20 text-gold-200" style={{left:`${target.x}%`,top:`${target.y}%`}}>GO</button>:null}</div><button type="button" className="btn-primary mt-5" onClick={startReaction}>شروع Reaction</button></div>
        :mode==="rhythm"?<div className="text-center"><p className="text-sm text-ink-400">{message}</p><div className="mx-auto mt-6 grid max-w-lg grid-cols-4 gap-3">{[0,1,2,3].map(i=><button key={i} type="button" onClick={()=>hitBeat(i)} className={`aspect-square rounded-2xl border text-lg transition ${beat===i&&running?"border-gold-300 bg-gold-400/20 text-gold-200":"border-white/[.08] bg-white/[.025] text-ink-500"}`}>{i+1}</button>)}</div><button type="button" className="btn-primary mt-5" onClick={startRhythm}>شروع Rhythm Grid</button></div>
        :mode==="stereo"?<div className="text-center"><p className="text-sm text-ink-400">{message}</p><div className="mx-auto mt-6 grid max-w-lg grid-cols-2 gap-3"><button type="button" className="rounded-2xl border border-white/[.08] bg-white/[.025] p-7 text-lg text-sand-50 hover:border-gold-400/30" onClick={()=>chooseStereo("L")}>LEFT · چپ</button><button type="button" className="rounded-2xl border border-white/[.08] bg-white/[.025] p-7 text-lg text-sand-50 hover:border-gold-400/30" onClick={()=>chooseStereo("R")}>RIGHT · راست</button></div><button type="button" className="btn-primary mt-5" onClick={startStereo}>شروع Stereo Focus</button></div>
        :mode==="frequency"?<div className="text-center"><p className="text-sm text-ink-400">{message}</p><button type="button" className="btn-primary mt-5" onClick={startFrequency}><Play size={16} fill="currentColor"/> پخش تون</button><div className="mx-auto mt-6 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">{frequencyOptions.map(v=><button key={v} type="button" disabled={!running} onClick={()=>chooseFrequency(v)} className="rounded-2xl border border-white/[.08] bg-white/[.025] p-5 text-sand-50 hover:border-gold-400/30">{formatFrequency(v)}</button>)}</div></div>
        :mode==="memory"?<div className="text-center"><p className="text-sm text-ink-400">{message}</p><div className="mx-auto mt-6 grid max-w-lg grid-cols-4 gap-3">{[0,1,2,3].map(i=><button key={i} type="button" onClick={()=>memoryPick(i)} className={`aspect-square rounded-2xl border transition ${beat===i&&running?"border-gold-300 bg-gold-400/20":"border-white/[.08] bg-white/[.025]"}`}>{i+1}</button>)}</div><button type="button" className="btn-primary mt-5" onClick={startMemory}>شروع Audio Memory · Level {round}</button></div>
        :<div className="text-center"><p className="text-sm text-ink-400">{message}</p><div className="mx-auto mt-6 grid max-w-lg grid-cols-2 gap-3"><button type="button" className="rounded-2xl border border-white/[.08] p-7 text-lg text-sand-50 hover:border-gold-400/30" onClick={()=>choosePan("L")}>PAN LEFT</button><button type="button" className="rounded-2xl border border-white/[.08] p-7 text-lg text-sand-50 hover:border-gold-400/30" onClick={()=>choosePan("R")}>PAN RIGHT</button></div><button type="button" className="btn-primary mt-5" onClick={startPan}>شروع Pan Detective</button></div>}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-500"><span>Round XP: <strong className="text-gold-300">{score}</strong></span><span>PRO progress · local best</span></div>
    </div>
  </section>;
}

function GameStage({ active, toneRound, setToneRound, toneAnswer, setToneAnswer, eqRound, setEqRound, eqAnswer, setEqAnswer, compressorRound, setCompressorRound, compressorAnswer, setCompressorAnswer, phaseAnswer, setPhaseAnswer, onBack, onReset }: { active: Exclude<GameId, "hub" | "personal">; toneRound: number; setToneRound: (value: number) => void; toneAnswer: number | null; setToneAnswer: (value: number) => void; eqRound: number; setEqRound: (value: number) => void; eqAnswer: string | null; setEqAnswer: (value: string) => void; compressorRound: number; setCompressorRound: (value: number) => void; compressorAnswer: string | null; setCompressorAnswer: (value: string) => void; phaseAnswer: number | null; setPhaseAnswer: (value: number) => void; onBack: () => void; onReset: () => void }) {
  const game = games.find((item) => item.id === active)!;
  const Icon = game.icon;
  const solved = active === "tone" ? toneAnswer !== null : active === "eq" ? eqAnswer !== null : active === "compressor" ? compressorAnswer !== null : phaseAnswer !== null;
  const next = () => { onReset(); if (active === "tone") setToneRound((toneRound + 1) % toneRounds.length); if (active === "eq") setEqRound((eqRound + 1) % eqRounds.length); if (active === "compressor") setCompressorRound((compressorRound + 1) % compressorRounds.length); };
  return <section className="mt-10"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>بازگشت به آرکید</button><span className="flex items-center gap-2 text-xs text-ink-500"><Icon size={15} className={game.color} />{game.title}</span></div><div className="card-ay p-6 sm:p-10"><div className="mx-auto max-w-2xl text-center"><span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/[.05] ${game.color}`}><Icon size={30} /></span><p className="eyebrow mt-6">{game.tag}</p>{active === "tone" ? <ToneGame round={toneRounds[toneRound]} answer={toneAnswer} onAnswer={setToneAnswer} /> : active === "eq" ? <EqGame round={eqRounds[eqRound]} answer={eqAnswer} onAnswer={setEqAnswer} /> : active === "compressor" ? <CompressorGame round={compressorRounds[compressorRound]} answer={compressorAnswer} onAnswer={setCompressorAnswer} /> : <PhaseGame answer={phaseAnswer} onAnswer={setPhaseAnswer} />}{solved ? <button type="button" className="btn-primary mt-7 gap-2" onClick={next}>راند بعدی <Target size={15} /></button> : null}<p className="mt-8 flex items-center justify-center gap-2 text-xs text-ink-500"><Headphones size={14} className="text-gold-400" />با هدفون یا مانیتور در ولوم امن تمرین کن.</p></div></div></section>;
}

function ToneGame({ round, answer, onAnswer }: { round: typeof toneRounds[number]; answer: number | null; onAnswer: (value: number) => void }) { return <><h1 className="mt-5 text-2xl font-semibold text-sand-50">کدام فرکانس را شنیدی؟</h1><p className="mt-3 text-sm leading-7 text-ink-400">دکمه‌ی پخش را بزن، با دقت گوش کن و نزدیک‌ترین گزینه را انتخاب کن.</p><button type="button" className="btn-primary mt-7 gap-2" onClick={() => playTone(round.frequency)}><Play size={16} fill="currentColor" />پخش تون مرموز</button><div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">{round.options.map((option) => <button type="button" key={option} className={`rounded-xl border p-3 text-sm transition ${answer === option ? option === round.frequency ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-red-400/40 bg-red-400/10 text-red-200" : "border-white/10 text-ink-300 hover:border-gold-400/40"}`} onClick={() => onAnswer(option)} disabled={answer !== null}>{formatFrequency(option)}{answer !== null && option === round.frequency ? <Check className="mx-auto mt-1" size={14} /> : null}</button>)}</div>{answer !== null ? <p className="mt-5 text-sm text-ink-300">فرکانس درست: <strong className="text-gold-300">{formatFrequency(round.frequency)}</strong></p> : null}</>; }
function EqGame({ round, answer, onAnswer }: { round: typeof eqRounds[number]; answer: string | null; onAnswer: (value: string) => void }) { const options = ["زیر ۱۰۰Hz", "حدود ۲۵۰Hz", "حدود ۳kHz", "حدود ۱۰kHz"]; return <><h1 className="mt-5 text-2xl font-semibold text-sand-50">کارآگاه EQ</h1><p className="mt-4 rounded-2xl border border-white/[.08] bg-white/[.03] p-5 text-sm leading-8 text-sand-100">«{round.prompt}»</p><p className="mt-4 text-xs text-ink-500">{round.hint}</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{options.map((option) => <button type="button" key={option} className={`rounded-xl border p-4 text-sm transition ${answer ? option === round.answer ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : answer === option ? "border-red-400/40 bg-red-400/10 text-red-200" : "border-white/10 text-ink-500" : "border-white/10 text-ink-300 hover:border-gold-400/40"}`} onClick={() => onAnswer(option)} disabled={Boolean(answer)}>{option}</button>)}</div>{answer ? <p className="mt-5 text-sm text-ink-300">ناحیه‌ی پیشنهادی: <strong className="text-gold-300">{round.answer}</strong></p> : null}</>; }
function CompressorGame({ round, answer, onAnswer }: { round: typeof compressorRounds[number]; answer: string | null; onAnswer: (value: string) => void }) { const options = ["Attack سریع", "Release آهسته", "Ratio بالا", "Threshold پایین"]; return <><h1 className="mt-5 text-2xl font-semibold text-sand-50">حس کمپرسور</h1><p className="mt-4 rounded-2xl border border-white/[.08] bg-white/[.03] p-5 text-sm leading-8 text-sand-100">«{round.prompt}»</p><p className="mt-4 text-xs text-ink-500">{round.hint}</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{options.map((option) => <button type="button" key={option} className={`rounded-xl border p-4 text-sm transition ${answer ? option === round.answer ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : answer === option ? "border-red-400/40 bg-red-400/10 text-red-200" : "border-white/10 text-ink-500" : "border-white/10 text-ink-300 hover:border-violet-400/40"}`} onClick={() => onAnswer(option)} disabled={Boolean(answer)}>{option}</button>)}</div>{answer ? <p className="mt-5 text-sm leading-7 text-ink-300">به تغییرات transient، طول sustain و مقدار gain reduction گوش بده؛ این مهارت پایه‌ی درک کمپرسور است.</p> : null}</>; }
function PhaseGame({ answer, onAnswer }: { answer: number | null; onAnswer: (value: number) => void }) { return <><h1 className="mt-5 text-2xl font-semibold text-sand-50">شکارچی فاز</h1><p className="mt-3 text-sm leading-7 text-ink-400">دو حالت تصویر استریو را تصور کن. کدام گزینه نشانه‌ی فاز پایدارتر و قابل‌اعتمادتر است؟</p><div className="mt-7 grid gap-3 sm:grid-cols-2">{phaseOptions.map((option, index) => <button type="button" key={option} className={`rounded-xl border p-4 text-sm transition ${answer !== null ? index === 0 ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : answer === index ? "border-red-400/40 bg-red-400/10 text-red-200" : "border-white/10 text-ink-500" : "border-white/10 text-ink-300 hover:border-gold-400/40"}`} onClick={() => onAnswer(index)} disabled={answer !== null}>{option}</button>)}</div>{answer !== null ? <p className="mt-5 text-sm leading-7 text-ink-300">در میکس مونو، مرکز و محکم‌بودن معمولاً نشانه‌ی امن‌تری است؛ با correlation meter هم بررسی کن.</p> : null}</>; }

function Personal({ url, name, audioRef, loop, speed, onLoopChange, onSpeedChange, onUpload, onBack }: { url: string; name: string; audioRef: RefObject<HTMLAudioElement | null>; loop: boolean; speed: string; onLoopChange: (value: boolean) => void; onSpeedChange: (value: string) => void; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; onBack: () => void }) { return <section className="mt-10"><button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>بازگشت به آرکید</button><div className="card-ay mt-5 p-6 sm:p-10"><div className="mx-auto max-w-2xl text-center"><FileAudio className="mx-auto text-emerald-300" size={34} /><p className="eyebrow mt-5">تمرین شخصی / Local only</p><h1 className="mt-3 text-2xl font-semibold text-sand-50">فایل خودت را دقیق‌تر گوش کن.</h1><p className="mt-3 text-sm leading-8 text-ink-400">فایل فقط در مرورگر تو باز می‌شود و به سرور یا اکانت ارسال نمی‌شود. از loop و مقایسه‌ی چندباره برای پیدا کردن یک مسئله‌ی مشخص استفاده کن.</p><label className="btn-primary mt-7 cursor-pointer gap-2"><Upload size={16} />انتخاب فایل صوتی<input className="sr-only" type="file" accept="audio/*,video/*" onChange={onUpload} /></label>{url ? <div className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.06] p-5"><p className="truncate text-sm text-emerald-200">{name}</p><audio ref={audioRef} className="mt-4 w-full" controls loop={loop} src={url} /><div className="mt-4 flex flex-wrap items-center justify-center gap-3"><label className="flex items-center gap-2 text-xs text-ink-300"><input type="checkbox" checked={loop} onChange={(event) => onLoopChange(event.target.checked)} /> پخش حلقه‌ای</label><label className="flex items-center gap-2 text-xs text-ink-300">سرعت<select className="rounded-lg border border-white/10 bg-ink-950 px-2 py-1" value={speed} onChange={(event) => { onSpeedChange(event.target.value); if (audioRef.current) audioRef.current.playbackRate = Number(event.target.value); }}><option value="0.75">۰٫۷۵×</option><option value="1">۱×</option><option value="1.25">۱٫۲۵×</option><option value="1.5">۱٫۵×</option></select></label><button type="button" className="text-xs text-gold-300 hover:text-gold-200" onClick={() => { if (audioRef.current) { audioRef.current.currentTime = 0; void audioRef.current.play(); } }}>از ابتدا</button></div></div> : <div className="mt-8 flex items-center justify-center gap-2 text-xs text-ink-500"><CircleHelp size={14} />پیشنهاد: یک loop هشت‌میزانی انتخاب کن و فقط یک موضوع را بررسی کن.</div>}<div className="mt-8 grid gap-3 text-right sm:grid-cols-3"><div className="rounded-xl bg-white/[.03] p-3 text-xs leading-6 text-ink-400"><strong className="text-sand-100">A</strong><br />صدای خام</div><div className="rounded-xl bg-white/[.03] p-3 text-xs leading-6 text-ink-400"><strong className="text-sand-100">B</strong><br />بعد از تغییر</div><div className="rounded-xl bg-white/[.03] p-3 text-xs leading-6 text-ink-400"><strong className="text-sand-100">یادداشت</strong><br />یک جمله بنویس</div></div></div></div></section>; }
