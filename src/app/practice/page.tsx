"use client";

import { ChangeEvent, RefObject, useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, Award, Check, CircleHelp, Ear, FileAudio, Flame, Headphones, LockKeyhole, Pause, Play, RotateCcw, Sparkles, Target, Upload, Volume2, Waves, X } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { useAuth } from "@/components/AuthProvider";
import type { SessionUser } from "@/lib/auth";
import { PracticeProgressPanel } from "@/components/PracticeProgressPanel";
import { TheoryLab } from "@/components/TheoryLab";
import { SkillEngineDashboard } from "@/components/SkillEngineDashboard";

type GameId = "hub" | "tone" | "eq" | "compressor" | "phase" | "personal" | "pro-arcade" | "theory" | "voicing";
type Game = { id: Exclude<GameId, "hub" | "personal">; title: string; description: string; icon: typeof Ear; color: string; tag: string };

const games: Game[] = [
  { id: "tone", title: "فرکانس‌یاب", description: "یک تون مرموز را گوش کن و نزدیک‌ترین فرکانس را پیدا کن.", icon: Ear, color: "text-cyan-300", tag: "EQ / گوش" },
  { id: "eq", title: "کارآگاه EQ", description: "قبل از دیدن پاسخ، حدس بزن مشکل در کدام ناحیه‌ی فرکانسی است.", icon: Waves, color: "text-gold-300", tag: "میکس" },
  { id: "compressor", title: "حس کمپرسور", description: "رفتار attack و release را از روی تغییرات صدا تشخیص بده.", icon: AudioLines, color: "text-violet-300", tag: "داینامیک" },
  { id: "phase", title: "شکارچی فاز", description: "حالت درست و غلط فاز را بشنو و تصویر پایدارتر را انتخاب کن.", icon: Volume2, color: "text-emerald-300", tag: "استریو" },
];

const toneRounds = [
  { frequency: 55, options: [55, 70, 90, 120] }, { frequency: 80, options: [60, 80, 110, 150] },
  { frequency: 110, options: [80, 110, 160, 220] }, { frequency: 180, options: [120, 180, 240, 320] },
  { frequency: 260, options: [180, 260, 360, 480] }, { frequency: 440, options: [330, 440, 550, 660] },
  { frequency: 700, options: [500, 700, 900, 1200] }, { frequency: 1200, options: [800, 1200, 1600, 2200] },
  { frequency: 2200, options: [1400, 2200, 3000, 4200] }, { frequency: 3500, options: [2400, 3500, 5000, 7000] },
  { frequency: 5000, options: [3500, 5000, 7000, 9000] }, { frequency: 7000, options: [5000, 7000, 9000, 12000] },
  { frequency: 9000, options: [6000, 9000, 12000, 14000] }, { frequency: 12000, options: [8000, 12000, 14000, 16000] },
  { frequency: 16000, options: [10000, 12000, 16000, 18000] },
];
const eqRounds = [
  { answer: "زیر ۱۰۰Hz", prompt: "یک تغییر EQ عمیق در low-end شنیده می‌شود.", hint: "rumble و sub را بررسی کن." },
  { answer: "حدود ۱۵۰Hz", prompt: "بدنه‌ی صدا بیش از حد ضخیم شده.", hint: "low-mid پایین را گوش کن." },
  { answer: "حدود ۲۵۰Hz", prompt: "میکس boxy و muddy شده.", hint: "low-mid را بررسی کن." },
  { answer: "حدود ۵۰۰Hz", prompt: "صدا nasal و congested شده.", hint: "میانه‌ی پایین را بررسی کن." },
  { answer: "حدود ۱kHz", prompt: "میکس honky و تلفنی شده.", hint: "midrange را بررسی کن." },
  { answer: "حدود ۲kHz", prompt: "attack و clarity بیش از حد برجسته است.", hint: "upper-mid پایین را بررسی کن." },
  { answer: "حدود ۳kHz", prompt: "وکال تیز و خسته‌کننده شده.", hint: "presence را بررسی کن." },
  { answer: "حدود ۵kHz", prompt: "ترنزینت‌ها harsh شده‌اند.", hint: "presence/edge را گوش کن." },
  { answer: "حدود ۸kHz", prompt: "hi-hat بیش از حد روشن است.", hint: "high-mid را بررسی کن." },
  { answer: "حدود ۱۰kHz", prompt: "air و brightness تغییر کرده.", hint: "high shelf را گوش کن." },
  { answer: "حدود ۱۴kHz", prompt: "فقط بالاترین air تغییر کرده.", hint: "extreme top-end را بررسی کن." },
];
const compressorRounds = [
  { answer: "Attack سریع", prompt: "ترنزینت ضربه‌ای نرم و کم‌جان شده.", hint: "شروع transient را گوش کن." },
  { answer: "Attack آهسته", prompt: "ضربه‌ی اولیه عبور می‌کند ولی sustain فشرده می‌شود.", hint: "transient قبل از gain reduction است." },
  { answer: "Release سریع", prompt: "gain reduction خیلی سریع برمی‌گردد و pumping نزدیک است.", hint: "برگشت بعد از ضربه را گوش کن." },
  { answer: "Release آهسته", prompt: "صدا دیرتر به سطح عادی برمی‌گردد.", hint: "زمان recovery را گوش کن." },
  { answer: "Ratio بالا", prompt: "با افزایش input، output خیلی کمتر بالا می‌رود.", hint: "شیب input/output را تصور کن." },
  { answer: "Ratio پایین", prompt: "کمپرس نرم و ملایم است.", hint: "فشرده‌سازی gentle است." },
  { answer: "Threshold پایین", prompt: "تقریباً کل اجرا زیر gain reduction است.", hint: "نقطه‌ی شروع compression پایین است." },
  { answer: "Threshold بالا", prompt: "فقط قله‌های بلند فشرده می‌شوند.", hint: "compression فقط روی peaks است." },
];
function formatFrequency(value: number) { return value >= 1000 ? `${value / 1000}kHz` : `${value}Hz`; }
const DAILY_GUEST_STAGES = 5;
const DAILY_MEMBER_STAGES = 5;
const PRO_PRICE_TOMAN = 40000;
const PRACTICE_XP_PER_LEVEL = 100;
const PRACTICE_MAX_LEVEL = 500;
function practiceLevel(xp: number) { return Math.min(PRACTICE_MAX_LEVEL, Math.max(1, Math.floor(Math.max(0, xp) / PRACTICE_XP_PER_LEVEL) + 1)); }

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
  const level = practiceLevel(score);
  const rank = level >= 100 ? "گوش طلایی" : level >= 50 ? "میکس‌خوان" : level >= 10 ? "شنونده‌ی دقیق" : "شروع‌کننده";
  const rankFloor = score >= 500 ? 500 : score >= 250 ? 250 : score >= 100 ? 100 : 0;
  const rankCeiling = score >= 500 ? 750 : score >= 250 ? 500 : score >= 100 ? 250 : 100;
  const rankProgress = Math.min(100, Math.round(((score - rankFloor) / (rankCeiling - rankFloor)) * 100));

  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem("artistyar_arcade_score") || "{}"); setScore(Number(saved.score) || 0); setStreak(Number(saved.streak) || 0); } catch { /* local-only progress is optional */ } }, []);
  async function record(correct: boolean) {
    const nextScore = score + (correct ? 10 : 0);
    const nextStreak = correct ? streak + 1 : 0;
    try {
      let anonymousId = localStorage.getItem("artistyar_practice_anon");
      if (!anonymousId) { anonymousId = crypto.randomUUID(); localStorage.setItem("artistyar_practice_anon", anonymousId); }
      const identity = user?.id || anonymousId;
      const response = await fetch("/api/practice/progress",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({
        userId:identity,username:user?.username || "guest",fullName:user?.fullName || "Guest",telegramId:user?.telegramId,gameId:active,score:correct?10:0,accuracy:correct?100:0,streak:nextStreak,bestScore:nextScore,
        metadata:{dailyKey:new Date().toISOString().slice(0,10),level:practiceLevel(nextScore),anonymous:!user?.id}
      })});
      if (response.status===429) return;
    } catch { return; }
    setScore(nextScore); setStreak(nextStreak);
    localStorage.setItem("artistyar_arcade_score", JSON.stringify({ score: nextScore, streak: nextStreak }));
  }
  function uploadPersonal(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; if (personalUrl) URL.revokeObjectURL(personalUrl); setPersonalUrl(URL.createObjectURL(file)); setPersonalName(file.name); }
  function resetGame() { setToneAnswer(null); setEqAnswer(null); setPhaseAnswer(null); setCompressorAnswer(null); }

  return <main className="container-ay relative py-12 sm:py-16"><div className="route-ambient route-ambient-one" aria-hidden="true" /><SectionHeading eyebrow="PRACTICE ENGINE / مرکز مهارت" title="مهارت شنیداری و حرفه‌ای را تمرین بده." subtitle="یک مرکز واحد برای Ear Training و Professional Audio Skills؛ تمرین‌های تطبیقی، صوت واقعی، XP و مسیر پیشرفت حرفه‌ای." />
    <SkillEngineDashboard />
    <div className="mt-8 flex flex-wrap items-center gap-3"><div className="card-ay flex min-w-[220px] items-center gap-3 px-4 py-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300"><Award size={18} /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2 text-[11px] text-ink-500"><span>رتبه‌ی حرفه‌ای</span><strong className="text-gold-300">{rank}</strong></span><span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/[.08]"><span className="block h-full rounded-full bg-gold-400 transition-[width]" style={{ width: `${rankProgress}%` }} /></span><strong className="mt-1 block text-sm text-sand-50">{score} XP · Level {level}/{PRACTICE_MAX_LEVEL}</strong></span></div><div className="card-ay flex items-center gap-3 px-4 py-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-400/10 text-orange-300"><Flame size={18} /></span><span><span className="block text-[11px] text-ink-500">زنجیره</span><strong className="text-lg text-sand-50">{streak}</strong></span></div><span className="flex items-center gap-2 text-xs text-ink-500"><LockKeyhole size={14} className="text-gold-400" />پیشرفت تمرین‌ها در حساب ذخیره می‌شود و برای مهمان‌ها روی همین دستگاه نگه‌داری می‌شود.</span></div>
    {active === "hub" ? <><Hub onSelect={(id) => { resetGame(); setActive(id); }} /><PracticeProgressPanel /></> : active === "voicing" ? <VoicingLab onBack={() => setActive("hub")} /> : active === "pro-arcade" ? <ProArcade onBack={() => setActive("hub")} /> : active === "theory" ? <TheoryLab onBack={() => setActive("hub")} /> : active === "personal" ? <Personal url={personalUrl} name={personalName} audioRef={personalAudio} loop={personalLoop} speed={personalSpeed} onLoopChange={setPersonalLoop} onSpeedChange={setPersonalSpeed} onUpload={uploadPersonal} onBack={() => setActive("hub")} /> : <GameStage active={active} toneRound={toneRound} setToneRound={setToneRound} toneAnswer={toneAnswer} setToneAnswer={(value) => { setToneAnswer(value); record(value === toneRounds[toneRound].frequency); }} eqRound={eqRound} setEqRound={setEqRound} eqAnswer={eqAnswer} setEqAnswer={(value) => { setEqAnswer(value); record(value === eqRounds[eqRound].answer); }} compressorRound={compressorRound} setCompressorRound={setCompressorRound} compressorAnswer={compressorAnswer} setCompressorAnswer={(value) => { setCompressorAnswer(value); record(value === compressorRounds[compressorRound].answer); }} phaseAnswer={phaseAnswer} setPhaseAnswer={(value) => { setPhaseAnswer(value); record(value === 0); }} onBack={() => setActive("hub")} onReset={resetGame} />}
  </main>;
}

type AIPracticeQuestion = { gameId: "tone"|"eq"|"compressor"|"phase"; prompt: string; hint: string; answer: string|number; options: Array<string|number>; audio: Record<string, number|string>; difficulty: number; source: string; fingerprint?: string };\n\nfunction GameStage({ active, toneRound, setToneRound, toneAnswer, setToneAnswer, eqRound, setEqRound, eqAnswer, setEqAnswer, compressorRound, setCompressorRound, compressorAnswer, setCompressorAnswer, phaseAnswer, setPhaseAnswer, onBack, onReset }: any) {
  const { user } = useAuth();
  const [stage,setStage]=useState(0);
  const [limit,setLimit]=useState(user ? DAILY_MEMBER_STAGES : DAILY_GUEST_STAGES);
  const [locked,setLocked]=useState(false);
  const [recent,setRecent]=useState<number[]>([]);
  const [played,setPlayed]=useState(false);
  const [level,setLevel]=useState(1);\n  const [phaseTarget,setPhaseTarget]=useState<"normal"|"inverted">("normal");\n  const [aiQuestion,setAiQuestion]=useState<AIPracticeQuestion|null>(null);\n  const [aiLoading,setAiLoading]=useState(false);

  useEffect(() => {
    let cancelled=false;
    setStage(0); setLocked(false); setPlayed(false); setRecent([]);
    const localXp=Number(localStorage.getItem("artistyar_arcade_score") ? JSON.parse(localStorage.getItem("artistyar_arcade_score")||"{}").score : 0)||0;
    setLevel(practiceLevel(localXp));
    if(user?.id) {
      fetch("/api/practice/status?userId="+encodeURIComponent(user.id)+"&gameId="+encodeURIComponent(active),{cache:"no-store",credentials:"include"})
        .then(r=>r.json()).then(d=>{ if(!cancelled&&d?.ok){setLimit(Number(d.dailyLimit)||DAILY_MEMBER_STAGES);setStage(Number(d.used)||0);setLocked(Number(d.remaining)<=0);}}).catch(()=>{});
    }
    return ()=>{cancelled=true};
  },[active,user?.id]);

  const difficulty=Math.min(1,(level-1)/499);
  const pickIndex=(length:number)=>{
    const candidates=Array.from({length},(_,i)=>i).filter(i=>!recent.includes(i));
    const pool=candidates.length?candidates:Array.from({length},(_,i)=>i);
    const start=Math.min(pool.length-1,Math.floor(difficulty*(pool.length-1)));
    const windowSize=Math.max(2,Math.ceil(pool.length*(0.35+0.65*difficulty)));
    const chosen=pool[Math.floor(Math.random()*Math.min(pool.length,start+windowSize))];
    setRecent(v=>[...v.slice(-5),chosen]);
    return chosen;
  };

  useEffect(() => {
    let cancelled = false;
    setAiQuestion(null);
    setAiLoading(true);
    const recentKey = "artistyar_practice_ai_recent";
    let recent: string[] = [];
    try { recent = JSON.parse(localStorage.getItem(recentKey) || "[]"); } catch {}
    let anonymousId = localStorage.getItem("artistyar_practice_anon");
    if (!anonymousId) { anonymousId = crypto.randomUUID(); localStorage.setItem("artistyar_practice_anon", anonymousId); }
    const identity = user?.id || anonymousId;
    fetch("/api/practice/question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ gameId: active, level, userId: identity, recent: recent.slice(-12) })
    }).then(r => r.json()).then(d => {
      if (cancelled || !d?.ok || !d.question) return;
      setAiQuestion(d.question);
      const fp = String(d.question.fingerprint || "");
      if (fp) localStorage.setItem(recentKey, JSON.stringify([...recent, fp].slice(-24)));
      if (d.question.gameId === "phase") setPhaseTarget(d.question.answer === "inverted" ? "inverted" : "normal");
    }).catch(() => {}).finally(() => { if (!cancelled) setAiLoading(false); });
    return () => { cancelled = true; };
  }, [active, stage, level, user?.id]);

  const markStage=()=>{
    if(locked) return;
    const next=stage+1; setStage(next);
    if(next>=limit) setLocked(true);
  };

  const playEq=()=>{
    const A=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!A)return;
    const ctx=new A();void ctx.resume();
    const osc=ctx.createOscillator(), noise=ctx.createBufferSource(), filter=ctx.createBiquadFilter(), gain=ctx.createGain();
    const buf=ctx.createBuffer(1,ctx.sampleRate*1.2,ctx.sampleRate);const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    noise.buffer=buf;filter.type="peaking";const row=eq;const freq=aiQuestion?.gameId==="eq" ? Number(aiQuestion.audio.frequency) : Number((row.answer.match(/[0-9]+/)||["250"])[0]);filter.frequency.value=Math.max(80,Math.min(14000,freq));filter.Q.value=1.1;filter.gain.value=6+difficulty*5;
    gain.gain.value=.08;noise.connect(filter).connect(gain).connect(ctx.destination);noise.start();noise.stop(ctx.currentTime+1.1);setPlayed(true);window.setTimeout(()=>void ctx.close(),1500);
  };
  const playComp=()=>{
    const A=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!A)return;
    const ctx=new A();void ctx.resume();const osc=ctx.createOscillator(),gain=ctx.createGain(),comp=ctx.createDynamicsCompressor();
    osc.type="sawtooth";osc.frequency.value=110+level*0.5;const p=aiQuestion?.gameId==="compressor"?aiQuestion.audio:{};comp.threshold.value=Number(p.threshold ?? (-18-difficulty*22));comp.ratio.value=Number(p.ratio ?? (2+difficulty*10));comp.attack.value=Number(p.attack ?? (0.003+(1-difficulty)*0.15));comp.release.value=Number(p.release ?? (.06+difficulty*.5));gain.gain.value=.09;
    osc.connect(comp).connect(gain).connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+1.2);setPlayed(true);window.setTimeout(()=>void ctx.close(),1500);
  };
  const playPhase=()=>{\n    const target=aiQuestion?.gameId==="phase" ? (String(aiQuestion.answer)==="inverted"?"inverted":"normal") : (Math.random()>.5?"inverted":"normal"); setPhaseTarget(target);
    const A=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!A)return;
    const ctx=new A();void ctx.resume();const merger=ctx.createChannelMerger(2),a=ctx.createOscillator(),b=ctx.createOscillator(),ga=ctx.createGain(),gb=ctx.createGain();
    a.frequency.value=220;b.frequency.value=220;ga.gain.value=.07;gb.gain.value=target==="inverted"?-.07:.07;a.connect(ga).connect(merger,0,0);b.connect(gb).connect(merger,0,1);merger.connect(ctx.destination);a.start();b.start();a.stop(ctx.currentTime+1);b.stop(ctx.currentTime+1);setPlayed(true);window.setTimeout(()=>void ctx.close(),1300);
  };

  const answer=(correct:boolean,gameId:string,advance:()=>void)=>{
    if(locked) return;
    advance(); markStage(gameId);
  };
  if(locked) return <section className="mt-10"><button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>بازگشت</button><div className="card-ay mt-5 p-8 text-center"><Award className="mx-auto text-gold-300" size={32}/><h1 className="mt-4 text-xl font-semibold text-sand-50">تمرین امروز این بازی کامل شد.</h1><p className="mt-2 text-sm leading-7 text-ink-400">{user?"۵ مرحله‌ی روزانه‌ی عضو":"۵ مرحله‌ی رایگان روزانه"} تمام شد. فردا دوباره سؤال‌های تازه آماده می‌شوند.</p></div></section>;

  const tone=aiQuestion?.gameId==="tone" ? { frequency:Number(aiQuestion.audio.frequency), options:aiQuestion.options.map(Number) } : toneRounds[toneRound%toneRounds.length];
  const eq=aiQuestion?.gameId==="eq" ? { answer:String(aiQuestion.answer), prompt:aiQuestion.prompt, hint:aiQuestion.hint } : eqRounds[eqRound%eqRounds.length];
  const comp=aiQuestion?.gameId==="compressor" ? { answer:String(aiQuestion.answer), prompt:aiQuestion.prompt, hint:aiQuestion.hint } : compressorRounds[compressorRound%compressorRounds.length];
  const toneChoices=shuffle(tone.options);
  const eqChoices=aiQuestion?.gameId==="eq" ? shuffle(aiQuestion.options.map(String)) : shuffle(eqRounds.map(x=>x.answer).filter(x=>x!==eq.answer)).slice(0,3).concat(eq.answer).sort(()=>Math.random()-.5);
  const compChoices=aiQuestion?.gameId==="compressor" ? shuffle(aiQuestion.options.map(String)) : shuffle(compressorRounds.map(x=>x.answer).filter(x=>x!==comp.answer)).slice(0,3).concat(comp.answer).sort(()=>Math.random()-.5);

  return <section className="mt-10"><button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>بازگشت</button>
    <div className="card-ay mt-5 p-6 sm:p-10"><div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">LEVEL {level} · ADAPTIVE HEARING</p><h1 className="mt-2 text-2xl font-semibold text-sand-50">{games.find(g=>g.id===active)?.title}</h1></div><span className="rounded-full border border-gold-400/25 px-3 py-1 text-xs text-gold-300">مرحله {stage+1} / {limit}</span></div>
      <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/[.07]"><div className="h-full rounded-full bg-gold-400 transition-all" style={{width:(stage/limit)*100+"%"}}/></div>
      {aiLoading&&<div className="mt-4 rounded-xl border border-gold-400/15 bg-gold-400/[.04] px-4 py-3 text-xs text-gold-200">در حال ساخت سؤال تازه بر اساس سطح شنیداری…</div>}\n      {!aiLoading&&aiQuestion?.source==="ai"&&<div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/[.04] px-4 py-3 text-xs text-emerald-200"><Sparkles size={14}/> سؤال تازه توسط مدل فعال تولید و fingerprint شد.</div>}\n      <p className="mt-5 text-sm leading-7 text-ink-400">{active==="tone"?"فرکانس را فقط با گوش تشخیص بده.":active==="eq"?"نمونه‌ی صوتی را گوش کن و ناحیه‌ی EQ را پیدا کن.":active==="compressor"?"نمونه‌ی فشرده‌شده را گوش کن و رفتار کمپرسور را تشخیص بده.":"دو کانال correlated را گوش کن و polarity را تشخیص بده."}</p>
      {!aiLoading&&active==="tone"&&<><button className="btn-primary mt-5" onClick={()=>{playTone(tone.frequency,1.3);setPlayed(true)}}><Volume2 size={16}/> پخش دوباره</button><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{toneChoices.map(f=><button key={f} className="rounded-xl border border-white/10 p-4 hover:border-gold-400/40" onClick={()=>{const ok=f===tone.frequency;setToneAnswer(f);answer(ok,"tone",()=>{setToneRound(pickIndex(toneRounds.length));});}}>{formatFrequency(f)}</button>)}</div></>}
      {!aiLoading&&active==="eq"&&<><button className="btn-primary mt-5" onClick={playEq}><Volume2 size={16}/> {played?"پخش دوباره نمونه":"پخش نمونه‌ی صوتی"}</button><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{eqChoices.map(v=><button key={v} className="rounded-xl border border-white/10 p-4 text-sm hover:border-gold-400/40" onClick={()=>{const ok=v===eq.answer;setEqAnswer(v);answer(ok,"eq",()=>setEqRound(pickIndex(eqRounds.length)));}}>{v}</button>)}</div></>}
      {!aiLoading&&active==="compressor"&&<><button className="btn-primary mt-5" onClick={playComp}><Volume2 size={16}/> {played?"پخش دوباره نمونه":"پخش نمونه‌ی کمپرسور"}</button><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{compChoices.map(v=><button key={v} className="rounded-xl border border-white/10 p-4 text-sm hover:border-gold-400/40" onClick={()=>{const ok=v===comp.answer;setCompressorAnswer(v);answer(ok,"compressor",()=>setCompressorRound(pickIndex(compressorRounds.length)));}}>{v}</button>)}</div></>}
      {!aiLoading&&active==="phase"&&<><button className="btn-primary mt-5" onClick={playPhase}><Volume2 size={16}/> {played?"پخش دوباره":"پخش نمونه‌ی استریو"}</button><div className="mt-5 grid grid-cols-2 gap-3"><button className="rounded-xl border border-white/10 p-4" onClick={()=>{const ok=phaseTarget==="normal";setPhaseAnswer(0);answer(ok,"phase",()=>{});}}>Normal</button><button className="rounded-xl border border-white/10 p-4" onClick={()=>{const ok=phaseTarget==="inverted";setPhaseAnswer(1);answer(ok,"phase",()=>{});}}>Inverted</button></div></>}
    </div></div></section>;
}

function Hub({ onSelect }: { onSelect: (id: GameId) => void }) {
  const daily = games[new Date().getDate() % games.length];
  return <div className="mt-10 space-y-6"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4"><span className="eyebrow">500+ LEVEL PATH</span><strong className="mt-2 block text-sm text-sand-50">مسیر سطح‌بندی</strong><span className="mt-1 block text-xs text-ink-500">۵ مرحله رایگان در روز / ۴۰ مرحله Pro در روز · XP بیشتر = سؤال سخت‌تر</span></div><div className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4"><span className="eyebrow">SKILL RATING</span><strong className="mt-2 block text-sm text-sand-50">امتیاز مهارت</strong><span className="mt-1 block text-xs text-ink-500">رکورد، Accuracy و Streak</span></div><div className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4"><span className="eyebrow">DAILY 5 MIN</span><strong className="mt-2 block text-sm text-sand-50">چالش روزانه</strong><span className="mt-1 block text-xs text-ink-500">تمرین کوتاه و قابل تکرار</span></div></div><div className="rounded-2xl border border-gold-400/20 bg-gradient-to-l from-gold-400/[.12] to-white/[.025] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><span className="eyebrow">چالش امروز / Daily Challenge</span><h2 className="mt-2 text-lg font-medium text-sand-50">امروز فقط ۵ دقیقه روی {daily.title} تمرکز کن.</h2><p className="mt-1 text-xs leading-6 text-ink-400">هر روز یک مهارت را انتخاب کن؛ کیفیت تمرین از تعداد بازی مهم‌تر است.</p></div><button type="button" className="btn-primary !px-4 !py-2 text-xs" onClick={() => onSelect(daily.id)}>شروع چالش</button></div></div><div className="mb-3 flex items-end justify-between gap-3"><div><span className="eyebrow">01 / EAR TRAINING ENGINE</span><h3 className="mt-2 text-xl font-medium text-sand-50">Ear Training Engine</h3><p className="mt-1 text-xs leading-6 text-ink-500">تشخیص فرکانس، EQ، داینامیک، فاز و هارمونی با سؤال‌های تطبیقی.</p></div><span className="rounded-full border border-cyan-400/20 px-3 py-1 text-[10px] text-cyan-200">HEARING</span></div><div className="grid gap-4 md:grid-cols-2">{games.map((game) => { const Icon = game.icon; return <button key={game.id} type="button" className="card-ay group p-6 text-right transition duration-300 hover:-translate-y-1 hover:border-gold-400/35" onClick={() => onSelect(game.id)}><div className="flex items-start justify-between gap-4"><span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[.05] ${game.color}`}><Icon size={23} /></span><span className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-ink-500">{game.tag}</span></div><h2 className="mt-6 text-xl font-medium text-sand-50">{game.title}</h2><p className="mt-2 max-w-md text-sm leading-7 text-ink-400">{game.description}</p><span className="mt-6 inline-flex items-center gap-2 text-xs text-gold-300">شروع بازی <Play size={13} fill="currentColor" /></span></button>; })}</div><div className="mt-8 mb-3 flex items-end justify-between gap-3"><div><span className="eyebrow">02 / PROFESSIONAL AUDIO SKILLS</span><h3 className="mt-2 text-xl font-medium text-sand-50">Professional Audio Skills</h3><p className="mt-1 text-xs leading-6 text-ink-500">مهارت‌های واقعی تولید و میکس؛ از Reverb و Saturation تا Masking و Transient.</p></div><span className="rounded-full border border-gold-400/20 px-3 py-1 text-[10px] text-gold-200">PRO</span></div><button type="button" className="card-ay group flex w-full flex-col items-start gap-4 border-gold-400/20 bg-gradient-to-l from-gold-400/[.09] to-white/[.02] p-6 text-right transition hover:border-gold-400/40 sm:flex-row sm:items-center" onClick={() => onSelect("pro-arcade")}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold-400/10 text-gold-300"><Gamepad2 size={23} /></span>
      <span className="flex-1">
        <span className="eyebrow">PRO AUDIO SKILLS / PROFESSIONAL AUDIO</span>
        <strong className="mt-2 block text-lg text-sand-50">Professional Audio Skills</strong>
        <span className="mt-1 block text-sm leading-7 text-ink-400">مهارت‌های حرفه‌ای میکس را با تمرین شنیداری واقعی بساز: Reverb، Saturation، Masking و Transient. اشتراک Pro ماهانه ۴۰٬۰۰۰ تومان.</span>
      </span>
      <span className="rounded-full border border-gold-400/25 px-3 py-1 text-[10px] text-gold-300">PRO</span>
    </button>
    <button type="button" className="card-ay group flex w-full flex-col items-start gap-4 border-gold-400/20 bg-gradient-to-l from-gold-400/[.09] to-white/[.02] p-6 text-right transition hover:border-gold-400/40 sm:flex-row sm:items-center" onClick={() => onSelect("voicing")}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold-400/10 text-gold-300"><Sparkles size={23}/></span>
      <span className="flex-1"><span className="eyebrow">1 VOICING / DAILY</span><strong className="mt-2 block text-lg text-sand-50">۱ Voicing در روز</strong><span className="mt-1 block text-sm leading-7 text-ink-400">هر روز یک Voicing پیانو حرفه‌ای از Jazz، Pop، Trap، R&B و سبک‌های مدرن.</span></span>
      <span className="rounded-full border border-gold-400/25 px-3 py-1 text-[10px] text-gold-300">PRO</span>
    </button>
    <button type="button" className="card-ay group flex w-full flex-col items-start gap-4 border-violet-400/20 bg-gradient-to-l from-violet-400/[.08] to-white/[.02] p-6 text-right transition hover:border-violet-400/40 sm:flex-row sm:items-center" onClick={() => onSelect("theory")}><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300"><Sparkles size={23} /></span><span className="flex-1"><span className="eyebrow">EAR TRAINING ENGINE / HARMONY</span><strong className="mt-2 block text-lg text-sand-50">فاصله، آکورد و گام</strong><span className="mt-1 block text-sm leading-7 text-ink-400">بخش هارمونی Ear Training Engine برای تشخیص Interval و Chord Quality با Level progression.</span></span><span className="rounded-full border border-violet-400/25 px-3 py-1 text-[10px] text-violet-300">THEORY</span></button>\n    <button type="button" className="card-ay group flex w-full flex-col items-start gap-4 p-6 text-right transition hover:border-gold-400/35 sm:flex-row sm:items-center" onClick={() => onSelect("personal")}><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300"><FileAudio size={23} /></span><span className="flex-1"><span className="eyebrow">تمرین شخصی / بدون آپلود</span><strong className="mt-2 block text-lg text-sand-50">فایل خودت را وارد کن و A/B تمرین کن</strong><span className="mt-1 block text-sm leading-7 text-ink-400">یک فایل صوتی را فقط در مرورگر باز کن، بخش‌های مختلفش را loop کن و با هدف مشخص گوش بده.</span></span><Upload size={18} className="text-gold-300" /></button><div className="grid gap-4 rounded-2xl border border-gold-400/15 bg-gold-400/[.045] p-5 text-sm leading-7 text-ink-300 md:grid-cols-3"><p><strong className="text-sand-50">۱. گوش بده</strong><br />اول با گوش تصمیم بگیر، بعد سراغ analyzer برو.</p><p><strong className="text-sand-50">۲. حدس بزن</strong><br />پاسخ اولت را ثبت کن و از دیدن جواب نترس.</p><p><strong className="text-sand-50">۳. تکرار کن</strong><br />رکورد تو روی همین دستگاه می‌ماند و نیاز به حساب ندارد.</p></div>
  </div>;
}


const VOICING_LESSONS = [
  {genre:"Jazz",title:"Maj9 Drop-2",chord:"Cmaj9",notes:["C3","G3","B3","E4"],tip:"صدای باز و لوکس؛ فاصله‌ی Bass تا Upper Structure را حفظ کن."},
  {genre:"R&B",title:"Minor 9",chord:"Am9",notes:["A2","G3","C4","B4"],tip:"برای R&B، سوم و هفتم را نرم و نزدیک به هم نگه دار."},
  {genre:"Pop",title:"Add9 Pop",chord:"Dadd9",notes:["D3","A3","E4","F#4"],tip:"Add9 را روشن نگه دار و Bass را ساده اجرا کن."},
  {genre:"Trap",title:"Minor 11",chord:"Fm11",notes:["F2","C3","Eb3","Ab3","Bb3"],tip:"Low root را جدا و Upper Voicing را سبک اجرا کن."},
  {genre:"Jazz",title:"Dominant 13",chord:"G13",notes:["G2","F3","B3","E4","A4"],tip:"برای حل به Cmaj7، صدای B و F را کنترل کن."},
  {genre:"Neo-Soul",title:"Maj7 #11",chord:"Fmaj7#11",notes:["F2","C3","E3","A3","B3"],tip:"فاصله‌ی #11 را واضح ولی نرم نگه دار."},
  {genre:"Pop",title:"Sus2 → Major",chord:"Asus2 → A",notes:["A2","E3","B3","C#4"],tip:"ابتدا Sus2 را بزن و سپس سوم را وارد کن."},
  {genre:"R&B",title:"9th Shell",chord:"Dm9",notes:["D3","C4","F4","E4"],tip:"Shell را با Bass ساده ترکیب کن؛ شلوغی کمتر، حس بیشتر."},
  {genre:"Jazz",title:"Minor 7 Drop-2",chord:"Em7",notes:["E2","B2","D3","G3"],tip:"Drop-2 را روی صدای میانی تمرین کن."},
  {genre:"Trap",title:"Dark 7th",chord:"Cm7",notes:["C2","G2","Bb3","Eb4"],tip:"اکتاو Bass را پایین نگه دار و Upper Voicing را خلوت کن."},
  {genre:"R&B",title:"Maj9 Color",chord:"Ebmaj9",notes:["Eb2","Bb2","D3","G3","F4"],tip:"نت 9 را در بالا نگه دار تا رنگ هارمونیک برجسته شود."},
  {genre:"Jazz",title:"13b9",chord:"A13b9",notes:["A2","G3","C4","F#4","Bb4"],tip:"این رنگ را با resolve به Dm7 تمرین کن."}
] as const;

function midiFor(note:string){const m=note.match(/^([A-G])([#b]?)(\\d)$/);if(!m)return 60;const names:{[k:string]:number}={C:0,"C#":1,Db:1,D:2,"D#":3,Eb:3,E:4,F:5,"F#":6,Gb:6,G:7,"G#":8,Ab:8,A:9,"A#":10,Bb:10,B:11};return 12*(Number(m[3])+1)+names[m[1]+m[2]];}
function VoicingLab({onBack}:{onBack:()=>void}){
  const {user}=useAuth(); const [pro,setPro]=useState(false); const [loading,setLoading]=useState(true); const [playing,setPlaying]=useState(false);
  const day=Math.floor(Date.now()/86400000); const lesson=VOICING_LESSONS[day%VOICING_LESSONS.length];
  useEffect(()=>{if(user?.role==="admin"){setPro(true);setLoading(false);return;} if(!user?.id){setLoading(false);return;} fetch("/api/practice/status?userId="+encodeURIComponent(user.id),{cache:"no-store"}).then(r=>r.json()).then(d=>setPro(Boolean(d?.pro))).finally(()=>setLoading(false));},[user?.id,user?.role]);
  const play=()=>{const A=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!A)return;const c=new A();void c.resume();setPlaying(true);lesson.notes.forEach((n,i)=>{const o=c.createOscillator(),g=c.createGain();o.type="triangle";o.frequency.value=440*Math.pow(2,(midiFor(n)-69)/12);const t=c.currentTime+i*.16;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.07,t+.025);g.gain.exponentialRampToValueAtTime(.0001,t+1.8);o.connect(g).connect(c.destination);o.start(t);o.stop(t+1.9)});setTimeout(()=>{setPlaying(false);void c.close()},3200);};
  if(loading)return <section className="mt-10"><button className="btn-ghost" onClick={onBack}>بازگشت</button><div className="card-ay mt-5 p-8 text-center">در حال بررسی Pro…</div></section>;
  if(!pro)return <section className="mt-10"><button className="btn-ghost" onClick={onBack}>بازگشت</button><div className="card-ay mt-5 p-8 text-center"><LockKeyhole className="mx-auto text-gold-300" size={34}/><p className="eyebrow mt-5">PRO VOICING LAB</p><h1 className="mt-3 text-2xl font-semibold text-sand-50">۱ Voicing حرفه‌ای در روز</h1><p className="mt-3 text-sm leading-8 text-ink-400">درس روزانه‌ی Jazz / Pop / Trap / R&B و سبک‌های مدرن با صدای پیانو و توضیح اجرایی.</p><div className="mx-auto mt-6 max-w-md rounded-2xl border border-gold-400/20 p-5"><strong className="text-xl text-gold-200">فقط برای Pro · ۴۰٬۰۰۰ تومان / ماه</strong><button className="btn-primary mt-5 w-full" onClick={onBack}>خرید اشتراک Pro</button></div></div></section>;
  return <section className="mt-10"><button className="btn-ghost" onClick={onBack}>بازگشت</button><div className="card-ay mt-5 p-6 sm:p-10"><div className="mx-auto max-w-3xl"><p className="eyebrow">1 VOICING / DAILY PIANO</p><div className="mt-3 flex flex-wrap items-center gap-2"><span className="rounded-full border border-gold-400/25 px-3 py-1 text-xs text-gold-300">{lesson.genre}</span><span className="rounded-full border border-white/10 px-3 py-1 text-xs text-ink-400">{lesson.chord}</span></div><h1 className="mt-4 text-3xl font-semibold text-sand-50">{lesson.title}</h1><p className="mt-4 text-sm leading-8 text-ink-300">{lesson.tip}</p><div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5">{lesson.notes.map(n=><div key={n} className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-center text-sm text-sand-50">{n}</div>)}</div><button className="btn-primary mt-7" disabled={playing} onClick={play}><Volume2 size={16}/>{playing?"در حال پخش…":"شنیدن Voicing با صدای پیانو"}</button><div className="mt-7 rounded-2xl border border-emerald-400/15 bg-emerald-400/[.04] p-5 text-sm leading-8 text-ink-300"><strong className="text-emerald-200">تمرین امروز:</strong> Voicing را با دست راست آرام بزن، سپس Bass را جدا اضافه کن و در نهایت به آکورد بعدی resolve کن. هدف حفظ رنگ آکورد و voice leading نرم است.</div></div></div></section>;
}

function ProArcade({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [mode,setMode]=useState<"reverb"|"saturation"|"masking"|"transient">("reverb");
  const [pro,setPro]=useState(false);
  const [proLoading,setProLoading]=useState(true);
  const [running,setRunning]=useState(false);
  const [score,setScore]=useState(0);
  const [target,setTarget]=useState("");
  const [message,setMessage]=useState("یک تمرین حرفه‌ای را انتخاب کن و با هدفون گوش بده.");
  const [options,setOptions]=useState<string[]>([]);
  const [cardNumber,setCardNumber]=useState("شماره کارت را در تنظیمات سایت وارد کنید");
  const [cardHolder,setCardHolder]=useState("نام صاحب کارت");
  const [reference,setReference]=useState("");
  const [paymentSent,setPaymentSent]=useState(false);
  const [paymentError,setPaymentError]=useState("");
  const [paymentLoading,setPaymentLoading]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    if(user?.role==="admin"){setPro(true);setProLoading(false);return;}
    if(!user?.id){setPro(false);setProLoading(false);return;}
    fetch("/api/practice/status?userId="+encodeURIComponent(user.id),{cache:"no-store",credentials:"include"})
      .then(r=>r.json()).then(d=>{if(!cancelled)setPro(Boolean(d?.pro))})
      .catch(()=>{if(!cancelled)setPro(false)})
      .finally(()=>{if(!cancelled)setProLoading(false)});
    fetch("/api/practice/payment-config",{cache:"no-store"})
      .then(r=>r.json()).then(d=>{if(!cancelled){setCardNumber(d?.cardNumber||cardNumber);setCardHolder(d?.cardHolder||cardHolder)}}).catch(()=>{});
    return()=>{cancelled=true};
  },[user?.id,user?.role]);

  const audio=(play:(c:AudioContext)=>void)=>{
    const A=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
    if(!A)return;
    const c=new A();void c.resume();play(c);window.setTimeout(()=>void c.close(),4500);
  };
  const tone=(c:AudioContext,f:number,d=.8)=>{
    const o=c.createOscillator(),g=c.createGain();
    o.type="sawtooth";o.frequency.value=f;
    g.gain.setValueAtTime(.0001,c.currentTime);
    g.gain.exponentialRampToValueAtTime(.055,c.currentTime+.04);
    g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+d);
    o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+d+.05);
  };
  const noise=(c:AudioContext,d=1.2)=>{
    const b=c.createBuffer(1,c.sampleRate*d,c.sampleRate),data=b.getChannelData(0);
    for(let i=0;i<data.length;i++) data[i]=Math.random()*2-1;
    const n=c.createBufferSource(),g=c.createGain();n.buffer=b;g.gain.value=.045;n.connect(g).connect(c.destination);n.start();n.stop(c.currentTime+d);
  };
  const start=()=>{
    setRunning(true);setMessage("صدا را کامل گوش کن؛ پاسخ را بعد از پخش انتخاب کن.");
    if(mode==="reverb"){
      const t=Math.random()>.5?"کوتاه / اتاق کوچک":"بلند / فضای بزرگ";
      setTarget(t);setOptions(["کوتاه / اتاق کوچک","بلند / فضای بزرگ"]);
      audio(c=>{
        const o=c.createOscillator(),g=c.createGain(),wet=c.createGain(),delay=c.createDelay(1.5);
        o.type="sine";o.frequency.value=440;g.gain.value=.07;wet.gain.value=.34;
        o.connect(g).connect(c.destination);
        o.connect(delay).connect(wet).connect(c.destination);
        o.start();o.stop(c.currentTime+.35);
        const delayTime=t.startsWith("کوتاه")?.12:.62;delay.delayTime.value=delayTime;
      });
    } else if(mode==="saturation"){
      const t=Math.random()>.5?"تمیز / Clean":"اشباع‌شده / Saturated";setTarget(t);setOptions(["تمیز / Clean","اشباع‌شده / Saturated"]);
      audio(c=>{
        const o=c.createOscillator(),g=c.createGain();o.frequency.value=180;g.gain.value=.06;
        if(t.startsWith("اشباع")){
          const sh=c.createWaveShaper();const curve=new Float32Array(256);for(let i=0;i<256;i++){const x=i*2/255-1;curve[i]=Math.tanh(x*3)}sh.curve=curve;sh.oversample="2x";o.connect(sh).connect(g).connect(c.destination);
        } else o.connect(g).connect(c.destination);
        o.start();o.stop(c.currentTime+1.1);
      });
    } else if(mode==="masking"){
      const t=Math.random()>.5?"جدا / Clear":"پوشانده / Masked";setTarget(t);setOptions(["جدا / Clear","پوشانده / Masked"]);
      audio(c=>{
        tone(c,440,1);
        if(t.startsWith("پوشانده")){const b=c.createBuffer(1,c.sampleRate,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const n=c.createBufferSource(),g=c.createGain();n.buffer=b;g.gain.value=.035;n.connect(g).connect(c.destination);n.start();}
      });
    } else {
      const t=Math.random()>.5?"Transient روشن":"Transient نرم";setTarget(t);setOptions(["Transient روشن","Transient نرم"]);
      audio(c=>{
        const o=c.createOscillator(),g=c.createGain(),comp=c.createDynamicsCompressor();o.type="triangle";o.frequency.value=110;
        comp.threshold.value=-18;comp.ratio.value=t==="Transient روشن"?2:12;comp.attack.value=t==="Transient روشن"?.08:.003;comp.release.value=.12;g.gain.value=.07;
        o.connect(comp).connect(g).connect(c.destination);o.start();o.stop(c.currentTime+1);
      });
    }
    window.setTimeout(()=>setRunning(false),1800);
  };
  const answer=(value:string)=>{
    if(running||!target)return;
    const ok=value===target;setScore(v=>v+(ok?120:0));setMessage(ok?"درست — تشخیص شنیداری دقیق بود.":"اشتباه — دوباره با تمرکز روی تفاوت شنیداری تمرین کن.");setTarget("");
  };
  const submitPayment=async()=>{
    if(!user?.id){setPaymentError("برای خرید Pro ابتدا وارد حساب کاربری شو.");return;}
    if(!reference.trim()){setPaymentError("کد پیگیری/شماره تراکنش را وارد کن.");return;}
    setPaymentLoading(true);setPaymentError("");
    try{
      const res=await fetch("/api/practice/payment-request",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({userId:user.id,reference:reference.trim()})});
      const data=await res.json();
      if(!res.ok) throw new Error(data?.error||"ثبت درخواست انجام نشد.");
      setPaymentSent(true);
    }catch(e){setPaymentError(e instanceof Error?e.message:"ثبت درخواست انجام نشد.");}
    finally{setPaymentLoading(false);}
  };

  if(proLoading)return <section className="mt-10"><button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>بازگشت</button><div className="card-ay mt-5 p-8 text-center text-sm text-ink-400">در حال بررسی اشتراک Pro…</div></section>;

  if(!pro)return <section className="mt-10"><button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>بازگشت</button><div className="card-ay mt-5 p-6 sm:p-10">
    <div className="mx-auto max-w-2xl text-center"><LockKeyhole className="mx-auto text-gold-300" size={34}/><p className="eyebrow mt-5">PRO AUDIO LAB</p><h1 className="mt-3 text-2xl font-semibold text-sand-50">Professional Audio Skills</h1><p className="mt-3 text-sm leading-8 text-ink-400">فقط تمرین‌های شنیداری پیشرفته و غیرتکراری؛ Reverb، Saturation، Masking و Transient.</p>
    <div className="mx-auto mt-6 max-w-md rounded-2xl border border-gold-400/20 bg-gold-400/[.06] p-5 text-right"><strong className="block text-xl text-gold-200">۴۰٬۰۰۰ تومان / ماه</strong><p className="mt-3 text-xs leading-6 text-ink-400">فعلاً پرداخت به‌صورت کارت‌به‌کارت انجام می‌شود. بعد از تأیید، اشتراک برای حساب فعال می‌شود.</p><div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4"><span className="block text-[11px] text-ink-500">شماره کارت</span><strong className="mt-1 block select-all text-lg tracking-wider text-sand-50">{cardNumber}</strong><span className="mt-3 block text-[11px] text-ink-500">به نام</span><strong className="mt-1 block text-sm text-sand-100">{cardHolder}</strong></div>
    {paymentSent?<div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[.06] p-4 text-sm leading-7 text-emerald-200">درخواست پرداخت ثبت شد. بعد از بررسی رسید/کد پیگیری، Pro فعال می‌شود.</div>:<><input value={reference} onChange={e=>setReference(e.target.value)} placeholder="کد پیگیری / شماره تراکنش" className="mt-4 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-sand-50 outline-none focus:border-gold-400/40"/><button type="button" className="btn-primary mt-3 w-full" onClick={submitPayment} disabled={paymentLoading}>{paymentLoading?"در حال ثبت…":"ثبت پرداخت کارت‌به‌کارت"}</button>{paymentError&&<p className="mt-3 text-xs text-red-300">{paymentError}</p>}</>}</div></div>
  </div></section>;

  return <section className="mt-10"><button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>بازگشت</button><div className="card-ay mt-5 p-6 sm:p-10"><div className="mx-auto max-w-3xl"><p className="eyebrow">PROFESSIONAL AUDIO SKILLS · ADVANCED LISTENING</p><h1 className="mt-3 text-2xl font-semibold text-sand-50">تمرین حرفه‌ای؛ بدون بازی‌های تکراری</h1><p className="mt-3 text-sm leading-8 text-ink-400">هر مرحله یک مسئله‌ی شنیداری واقعی از میکس را شبیه‌سازی می‌کند.</p><div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">{[["reverb","Reverb Space"],["saturation","Saturation"],["masking","Masking"],["transient","Transient"]].map(([id,label])=><button key={id} onClick={()=>{setMode(id as typeof mode);setTarget("");setRunning(false)}} className={`rounded-xl border p-3 text-xs ${mode===id?"border-gold-400/40 bg-gold-400/10 text-gold-200":"border-white/10 text-ink-400"}`}>{label}</button>)}</div><div className="mt-6 rounded-2xl border border-emerald-400/15 bg-emerald-400/[.05] p-4 text-xs leading-6 text-emerald-100"><Headphones size={15} className="mb-1"/> هدفون یا مانیتور استودیویی؛ ولوم راحت و ثابت.</div><button className="btn-primary mt-6" onClick={start} disabled={running}><Play size={15} fill="currentColor"/> {running?"در حال پخش…":"پخش صوت و شروع"}</button><p className="mt-4 min-h-12 rounded-xl border border-white/[.07] bg-white/[.025] p-4 text-sm">{message}</p>{options.length>0&&<div className="grid grid-cols-2 gap-3">{options.map(o=><button key={o} disabled={Boolean(target)||running} onClick={()=>answer(o)} className="rounded-xl border border-white/10 p-4 hover:border-gold-400/40 disabled:opacity-50">{o}</button>)}</div>}</div></div></section>;
}

function Personal({ url, name, audioRef, loop, speed, onLoopChange, onSpeedChange, onUpload, onBack }: { url: string; name: string; audioRef: RefObject<HTMLAudioElement | null>; loop: boolean; speed: string; onLoopChange: (value: boolean) => void; onSpeedChange: (value: string) => void; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; onBack: () => void }) { return <section className="mt-10"><button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>بازگشت به Practice Engine</button><div className="card-ay mt-5 p-6 sm:p-10"><div className="mx-auto max-w-2xl text-center"><FileAudio className="mx-auto text-emerald-300" size={34} /><p className="eyebrow mt-5">Professional Audio Skills / Personal Practice</p><h1 className="mt-3 text-2xl font-semibold text-sand-50">فایل خودت را دقیق‌تر گوش کن.</h1><p className="mt-3 text-sm leading-8 text-ink-400">فایل فقط در مرورگر تو باز می‌شود و به سرور یا اکانت ارسال نمی‌شود. از loop و مقایسه‌ی چندباره برای پیدا کردن یک مسئله‌ی مشخص استفاده کن.</p><label className="btn-primary mt-7 cursor-pointer gap-2"><Upload size={16} />انتخاب فایل صوتی<input className="sr-only" type="file" accept="audio/*,video/*" onChange={onUpload} /></label>{url ? <div className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.06] p-5"><p className="truncate text-sm text-emerald-200">{name}</p><audio ref={audioRef} className="mt-4 w-full" controls loop={loop} src={url} /><div className="mt-4 flex flex-wrap items-center justify-center gap-3"><label className="flex items-center gap-2 text-xs text-ink-300"><input type="checkbox" checked={loop} onChange={(event) => onLoopChange(event.target.checked)} /> پخش حلقه‌ای</label><label className="flex items-center gap-2 text-xs text-ink-300">سرعت<select className="rounded-lg border border-white/10 bg-ink-950 px-2 py-1" value={speed} onChange={(event) => { onSpeedChange(event.target.value); if (audioRef.current) audioRef.current.playbackRate = Number(event.target.value); }}><option value="0.75">۰٫۷۵×</option><option value="1">۱×</option><option value="1.25">۱٫۲۵×</option><option value="1.5">۱٫۵×</option></select></label><button type="button" className="text-xs text-gold-300 hover:text-gold-200" onClick={() => { if (audioRef.current) { audioRef.current.currentTime = 0; void audioRef.current.play(); } }}>از ابتدا</button></div></div> : <div className="mt-8 flex items-center justify-center gap-2 text-xs text-ink-500"><CircleHelp size={14} />پیشنهاد: یک loop هشت‌میزانی انتخاب کن و فقط یک موضوع را بررسی کن.</div>}<div className="mt-8 grid gap-3 text-right sm:grid-cols-3"><div className="rounded-xl bg-white/[.03] p-3 text-xs leading-6 text-ink-400"><strong className="text-sand-100">A</strong><br />صدای خام</div><div className="rounded-xl bg-white/[.03] p-3 text-xs leading-6 text-ink-400"><strong className="text-sand-100">B</strong><br />بعد از تغییر</div><div className="rounded-xl bg-white/[.03] p-3 text-xs leading-6 text-ink-400"><strong className="text-sand-100">یادداشت</strong><br />یک جمله بنویس</div></div></div></div></section>; }
