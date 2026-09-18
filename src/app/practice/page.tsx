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
const DAILY_MEMBER_STAGES = 15;
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
  function record(correct: boolean) {
    const nextScore = score + (correct ? 10 : 0); const nextStreak = correct ? streak + 1 : 0;
    setScore(nextScore); setStreak(nextStreak);
    localStorage.setItem("artistyar_arcade_score", JSON.stringify({ score: nextScore, streak: nextStreak }));
    if (user?.id && user.username) void fetch("/api/practice/progress",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({userId:user.id,username:user.username,fullName:user.fullName,gameId:active,score:correct?10:0,accuracy:correct?100:0,streak:nextStreak,bestScore:nextScore,metadata:{dailyKey:new Date().toISOString().slice(0,10)}})}).catch(()=>{});
  }
  function uploadPersonal(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; if (personalUrl) URL.revokeObjectURL(personalUrl); setPersonalUrl(URL.createObjectURL(file)); setPersonalName(file.name); }
  function resetGame() { setToneAnswer(null); setEqAnswer(null); setPhaseAnswer(null); setCompressorAnswer(null); }

  return <main className="container-ay relative py-12 sm:py-16"><div className="route-ambient route-ambient-one" aria-hidden="true" /><SectionHeading eyebrow="تمرین‌خانه / Practice Arcade" title="گوشَت را مثل یک ساز تمرین بده." subtitle="بازی‌های کوتاه و شنیداری برای میکس، EQ، داینامیک و فاز؛ بدون اکانت، بدون رتبه‌بندی مصنوعی، فقط تمرین واقعی." />
    <div className="mt-8 flex flex-wrap items-center gap-3"><div className="card-ay flex min-w-[220px] items-center gap-3 px-4 py-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300"><Award size={18} /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2 text-[11px] text-ink-500"><span>رتبه‌ی حرفه‌ای</span><strong className="text-gold-300">{rank}</strong></span><span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/[.08]"><span className="block h-full rounded-full bg-gold-400 transition-[width]" style={{ width: `${rankProgress}%` }} /></span><strong className="mt-1 block text-sm text-sand-50">{score} XP · Level {level}/{PRACTICE_MAX_LEVEL}</strong></span></div><div className="card-ay flex items-center gap-3 px-4 py-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-400/10 text-orange-300"><Flame size={18} /></span><span><span className="block text-[11px] text-ink-500">زنجیره</span><strong className="text-lg text-sand-50">{streak}</strong></span></div><span className="flex items-center gap-2 text-xs text-ink-500"><LockKeyhole size={14} className="text-gold-400" />پیشرفت فقط روی همین دستگاه ذخیره می‌شود.</span></div>
    {active === "hub" ? <><Hub onSelect={(id) => { resetGame(); setActive(id); }} /><PracticeProgressPanel /></> : active === "pro-arcade" ? <ProArcade onBack={() => setActive("hub")} /> : active === "theory" ? <TheoryLab onBack={() => setActive("hub")} /> : active === "personal" ? <Personal url={personalUrl} name={personalName} audioRef={personalAudio} loop={personalLoop} speed={personalSpeed} onLoopChange={setPersonalLoop} onSpeedChange={setPersonalSpeed} onUpload={uploadPersonal} onBack={() => setActive("hub")} /> : <GameStage active={active} toneRound={toneRound} setToneRound={setToneRound} toneAnswer={toneAnswer} setToneAnswer={(value) => { setToneAnswer(value); record(value === toneRounds[toneRound].frequency); }} eqRound={eqRound} setEqRound={setEqRound} eqAnswer={eqAnswer} setEqAnswer={(value) => { setEqAnswer(value); record(value === eqRounds[eqRound].answer); }} compressorRound={compressorRound} setCompressorRound={setCompressorRound} compressorAnswer={compressorAnswer} setCompressorAnswer={(value) => { setCompressorAnswer(value); record(value === compressorRounds[compressorRound].answer); }} phaseAnswer={phaseAnswer} setPhaseAnswer={(value) => { setPhaseAnswer(value); record(value === 0); }} onBack={() => setActive("hub")} onReset={resetGame} />}
  </main>;
}

function GameStage({ active, toneRound, setToneRound, toneAnswer, setToneAnswer, eqRound, setEqRound, eqAnswer, setEqAnswer, compressorRound, setCompressorRound, compressorAnswer, setCompressorAnswer, phaseAnswer, setPhaseAnswer, onBack, onReset }: any) {
  const { user } = useAuth();
  const [stage,setStage]=useState(0);
  const [limit,setLimit]=useState(user ? DAILY_MEMBER_STAGES : DAILY_GUEST_STAGES);
  const [locked,setLocked]=useState(false);
  const [recent,setRecent]=useState<number[]>([]);
  const [played,setPlayed]=useState(false);
  const [level,setLevel]=useState(1);\n  const [phaseTarget,setPhaseTarget]=useState<"normal"|"inverted">("normal");

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
    noise.buffer=buf;filter.type="peaking";const row=eqRounds[eqRound%eqRounds.length];const freq=Number((row.answer.match(/[0-9]+/)||["250"])[0]);filter.frequency.value=Math.max(80,Math.min(14000,freq));filter.Q.value=1.1;filter.gain.value=6+difficulty*5;
    gain.gain.value=.08;noise.connect(filter).connect(gain).connect(ctx.destination);noise.start();noise.stop(ctx.currentTime+1.1);setPlayed(true);window.setTimeout(()=>void ctx.close(),1500);
  };
  const playComp=()=>{
    const A=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!A)return;
    const ctx=new A();void ctx.resume();const osc=ctx.createOscillator(),gain=ctx.createGain(),comp=ctx.createDynamicsCompressor();
    osc.type="sawtooth";osc.frequency.value=110+level*0.5;comp.threshold.value=-18-difficulty*22;comp.ratio.value=2+difficulty*10;comp.attack.value=0.003+(1-difficulty)*0.15;comp.release.value=.06+difficulty*.5;gain.gain.value=.09;
    osc.connect(comp).connect(gain).connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+1.2);setPlayed(true);window.setTimeout(()=>void ctx.close(),1500);
  };
  const playPhase=()=>{\n    const target=Math.random()>.5?"inverted":"normal" as "normal"|"inverted"; setPhaseTarget(target);
    const A=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!A)return;
    const ctx=new A();void ctx.resume();const merger=ctx.createChannelMerger(2),a=ctx.createOscillator(),b=ctx.createOscillator(),ga=ctx.createGain(),gb=ctx.createGain();
    a.frequency.value=220;b.frequency.value=220;ga.gain.value=.07;gb.gain.value=target==="inverted"?-.07:.07;a.connect(ga).connect(merger,0,0);b.connect(gb).connect(merger,0,1);merger.connect(ctx.destination);a.start();b.start();a.stop(ctx.currentTime+1);b.stop(ctx.currentTime+1);setPlayed(true);window.setTimeout(()=>void ctx.close(),1300);
  };

  const answer=(correct:boolean,gameId:string,advance:()=>void)=>{
    if(locked) return;
    advance(); markStage(gameId);
  };
  if(locked) return <section className="mt-10"><button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>بازگشت</button><div className="card-ay mt-5 p-8 text-center"><Award className="mx-auto text-gold-300" size={32}/><h1 className="mt-4 text-xl font-semibold text-sand-50">تمرین امروز این بازی کامل شد.</h1><p className="mt-2 text-sm leading-7 text-ink-400">{user?"۱۵ مرحله‌ی روزانه‌ی عضو":"۵ مرحله‌ی رایگان روزانه"} تمام شد. فردا دوباره سؤال‌های تازه آماده می‌شوند.</p></div></section>;

  const tone=toneRounds[toneRound%toneRounds.length];
  const eq=eqRounds[eqRound%eqRounds.length];
  const comp=compressorRounds[compressorRound%compressorRounds.length];
  const toneChoices=shuffle(tone.options);
  const eqChoices=shuffle(eqRounds.map(x=>x.answer).filter(x=>x!==eq.answer)).slice(0,3).concat(eq.answer).sort(()=>Math.random()-.5);
  const compChoices=shuffle(compressorRounds.map(x=>x.answer).filter(x=>x!==comp.answer)).slice(0,3).concat(comp.answer).sort(()=>Math.random()-.5);

  return <section className="mt-10"><button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>بازگشت</button>
    <div className="card-ay mt-5 p-6 sm:p-10"><div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">LEVEL {level} · ADAPTIVE HEARING</p><h1 className="mt-2 text-2xl font-semibold text-sand-50">{games.find(g=>g.id===active)?.title}</h1></div><span className="rounded-full border border-gold-400/25 px-3 py-1 text-xs text-gold-300">مرحله {stage+1} / {limit}</span></div>
      <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/[.07]"><div className="h-full rounded-full bg-gold-400 transition-all" style={{width:(stage/limit)*100+"%"}}/></div>
      <p className="mt-5 text-sm leading-7 text-ink-400">{active==="tone"?"فرکانس را فقط با گوش تشخیص بده.":active==="eq"?"نمونه‌ی صوتی را گوش کن و ناحیه‌ی EQ را پیدا کن.":active==="compressor"?"نمونه‌ی فشرده‌شده را گوش کن و رفتار کمپرسور را تشخیص بده.":"دو کانال correlated را گوش کن و polarity را تشخیص بده."}</p>
      {active==="tone"&&<><button className="btn-primary mt-5" onClick={()=>{playTone(tone.frequency,1.3);setPlayed(true)}}><Volume2 size={16}/> پخش دوباره</button><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{toneChoices.map(f=><button key={f} className="rounded-xl border border-white/10 p-4 hover:border-gold-400/40" onClick={()=>{const ok=f===tone.frequency;setToneAnswer(f);answer(ok,"tone",()=>{setToneRound(pickIndex(toneRounds.length));});}}>{formatFrequency(f)}</button>)}</div></>}
      {active==="eq"&&<><button className="btn-primary mt-5" onClick={playEq}><Volume2 size={16}/> {played?"پخش دوباره نمونه":"پخش نمونه‌ی صوتی"}</button><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{eqChoices.map(v=><button key={v} className="rounded-xl border border-white/10 p-4 text-sm hover:border-gold-400/40" onClick={()=>{const ok=v===eq.answer;setEqAnswer(v);answer(ok,"eq",()=>setEqRound(pickIndex(eqRounds.length)));}}>{v}</button>)}</div></>}
      {active==="compressor"&&<><button className="btn-primary mt-5" onClick={playComp}><Volume2 size={16}/> {played?"پخش دوباره نمونه":"پخش نمونه‌ی کمپرسور"}</button><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{compChoices.map(v=><button key={v} className="rounded-xl border border-white/10 p-4 text-sm hover:border-gold-400/40" onClick={()=>{const ok=v===comp.answer;setCompressorAnswer(v);answer(ok,"compressor",()=>setCompressorRound(pickIndex(compressorRounds.length)));}}>{v}</button>)}</div></>}
      {active==="phase"&&<><button className="btn-primary mt-5" onClick={playPhase}><Volume2 size={16}/> {played?"پخش دوباره":"پخش نمونه‌ی استریو"}</button><div className="mt-5 grid grid-cols-2 gap-3"><button className="rounded-xl border border-white/10 p-4" onClick={()=>{const ok=phaseTarget==="normal";setPhaseAnswer(0);answer(ok,"phase",()=>{});}}>Normal</button><button className="rounded-xl border border-white/10 p-4" onClick={()=>{const ok=phaseTarget==="inverted";setPhaseAnswer(1);answer(ok,"phase",()=>{});}}>Inverted</button></div></>}
    </div></div></section>;
}

function Hub({ onSelect }: { onSelect: (id: GameId) => void }) {
  const daily = games[new Date().getDate() % games.length];
  return <div className="mt-10 space-y-6"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4"><span className="eyebrow">500+ LEVEL PATH</span><strong className="mt-2 block text-sm text-sand-50">مسیر سطح‌بندی</strong><span className="mt-1 block text-xs text-ink-500">۵ مرحله مهمان / ۱۵ مرحله عضو در روز · XP بیشتر = سؤال سخت‌تر</span></div><div className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4"><span className="eyebrow">SKILL RATING</span><strong className="mt-2 block text-sm text-sand-50">امتیاز مهارت</strong><span className="mt-1 block text-xs text-ink-500">رکورد، Accuracy و Streak</span></div><div className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4"><span className="eyebrow">DAILY 5 MIN</span><strong className="mt-2 block text-sm text-sand-50">چالش روزانه</strong><span className="mt-1 block text-xs text-ink-500">تمرین کوتاه و قابل تکرار</span></div></div><div className="rounded-2xl border border-gold-400/20 bg-gradient-to-l from-gold-400/[.12] to-white/[.025] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><span className="eyebrow">چالش امروز / Daily Challenge</span><h2 className="mt-2 text-lg font-medium text-sand-50">امروز فقط ۵ دقیقه روی {daily.title} تمرکز کن.</h2><p className="mt-1 text-xs leading-6 text-ink-400">هر روز یک مهارت را انتخاب کن؛ کیفیت تمرین از تعداد بازی مهم‌تر است.</p></div><button type="button" className="btn-primary !px-4 !py-2 text-xs" onClick={() => onSelect(daily.id)}>شروع چالش</button></div></div><div className="grid gap-4 md:grid-cols-2">{games.map((game) => { const Icon = game.icon; return <button key={game.id} type="button" className="card-ay group p-6 text-right transition duration-300 hover:-translate-y-1 hover:border-gold-400/35" onClick={() => onSelect(game.id)}><div className="flex items-start justify-between gap-4"><span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[.05] ${game.color}`}><Icon size={23} /></span><span className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-ink-500">{game.tag}</span></div><h2 className="mt-6 text-xl font-medium text-sand-50">{game.title}</h2><p className="mt-2 max-w-md text-sm leading-7 text-ink-400">{game.description}</p><span className="mt-6 inline-flex items-center gap-2 text-xs text-gold-300">شروع بازی <Play size={13} fill="currentColor" /></span></button>; })}</div><button type="button" className="card-ay group flex w-full flex-col items-start gap-4 border-gold-400/20 bg-gradient-to-l from-gold-400/[.09] to-white/[.02] p-6 text-right transition hover:border-gold-400/40 sm:flex-row sm:items-center" onClick={() => onSelect("pro-arcade")}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold-400/10 text-gold-300"><Gamepad2 size={23} /></span>
      <span className="flex-1">
        <span className="eyebrow">PRO ARCADE / Browser Games</span>
        <strong className="mt-2 block text-lg text-sand-50">مینی‌گیم‌های زنده‌ی شنیداری</strong>
        <span className="mt-1 block text-sm leading-7 text-ink-400">آرکید حرفه‌ای شنیداری با تمرین‌های پیشرفته؛ اشتراک Pro ماهانه ۴۰٬۰۰۰ تومان.</span>
      </span>
      <span className="rounded-full border border-gold-400/25 px-3 py-1 text-[10px] text-gold-300">PRO</span>
    </button>
    <button type="button" className="card-ay group flex w-full flex-col items-start gap-4 border-violet-400/20 bg-gradient-to-l from-violet-400/[.08] to-white/[.02] p-6 text-right transition hover:border-violet-400/40 sm:flex-row sm:items-center" onClick={() => onSelect("theory")}><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300"><Sparkles size={23} /></span><span className="flex-1"><span className="eyebrow">THEORY LAB / تئوری موسیقی</span><strong className="mt-2 block text-lg text-sand-50">تشخیص فاصله، آکورد و گام</strong><span className="mt-1 block text-sm leading-7 text-ink-400">تمرین شنیداری Interval و Chord Quality با Level progression.</span></span><span className="rounded-full border border-violet-400/25 px-3 py-1 text-[10px] text-violet-300">THEORY</span></button>\n    <button type="button" className="card-ay group flex w-full flex-col items-start gap-4 p-6 text-right transition hover:border-gold-400/35 sm:flex-row sm:items-center" onClick={() => onSelect("personal")}><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300"><FileAudio size={23} /></span><span className="flex-1"><span className="eyebrow">تمرین شخصی / بدون آپلود</span><strong className="mt-2 block text-lg text-sand-50">فایل خودت را وارد کن و A/B تمرین کن</strong><span className="mt-1 block text-sm leading-7 text-ink-400">یک فایل صوتی را فقط در مرورگر باز کن، بخش‌های مختلفش را loop کن و با هدف مشخص گوش بده.</span></span><Upload size={18} className="text-gold-300" /></button><div className="grid gap-4 rounded-2xl border border-gold-400/15 bg-gold-400/[.045] p-5 text-sm leading-7 text-ink-300 md:grid-cols-3"><p><strong className="text-sand-50">۱. گوش بده</strong><br />اول با گوش تصمیم بگیر، بعد سراغ analyzer برو.</p><p><strong className="text-sand-50">۲. حدس بزن</strong><br />پاسخ اولت را ثبت کن و از دیدن جواب نترس.</p><p><strong className="text-sand-50">۳. تکرار کن</strong><br />رکورد تو روی همین دستگاه می‌ماند و نیاز به حساب ندارد.</p></div>
  </div>;
}


function ProArcade({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [mode,setMode]=useState<"frequency"|"stereo"|"phase"|"memory"|"rhythm">("frequency");
  const [running,setRunning]=useState(false); const [score,setScore]=useState(0); const [best,setBest]=useState(0);
  const [message,setMessage]=useState("یک تمرین را انتخاب کن و حتماً با صدا گوش بده.");
  const [target,setTarget]=useState(440); const [options,setOptions]=useState<number[]>([]);
  const [side,setSide]=useState<"L"|"R"|null>(null); const [polarity,setPolarity]=useState<"normal"|"inverted"|null>(null);
  const [sequence,setSequence]=useState<number[]>([]); const [input,setInput]=useState<number[]>([]); const timer=useRef<number|null>(null);
  const audio=(play:(c:AudioContext)=>void)=>{const A=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!A)return;const c=new A();void c.resume();play(c);window.setTimeout(()=>void c.close(),4000)};
  const tone=(c:AudioContext,f:number,d=.7,p=0)=>{const o=c.createOscillator(),g=c.createGain(),x=c.createStereoPanner();o.type="sine";o.frequency.value=f;x.pan.value=p;g.gain.setValueAtTime(.0001,c.currentTime);g.gain.exponentialRampToValueAtTime(.1,c.currentTime+.03);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+d);o.connect(g).connect(x).connect(c.destination);o.start();o.stop(c.currentTime+d+.05)};
  const stop=()=>{if(timer.current)clearTimeout(timer.current);timer.current=null;setRunning(false)};
  const save=(points:number,acc:number,id:string)=>{const n=Math.max(0,score+points);setScore(n);setBest(v=>Math.max(v,n));if(user?.id&&user.username)void fetch("/api/practice/progress",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({userId:user.id,username:user.username,fullName:user.fullName,gameId:id,score:points,accuracy:acc,streak:acc===100?1:0,bestScore:Math.max(best,n),metadata:{pro:true}})}).catch(()=>{})};
  const frequency=()=>{stop();const pool=[55,80,110,220,440,880,1800,3500,7000,12000],f=pool[Math.floor(Math.random()*pool.length)],o=[f];while(o.length<4){const x=pool[Math.floor(Math.random()*pool.length)];if(!o.includes(x))o.push(x)}setTarget(f);setOptions(o.sort(()=>Math.random()-.5));setRunning(true);setMessage("تون را کامل گوش کن و بعد فرکانس درست را انتخاب کن.");audio(c=>tone(c,f,1.2));timer.current=window.setTimeout(stop,5000)};
  const answerFrequency=(f:number)=>{if(!running)return;const ok=f===target;stop();save(ok?100:0,ok?100:0,"pro-frequency");setMessage(ok?"درست — گوش دقیق بود.":"اشتباه — دوباره با دقت به pitch گوش کن.")};
  const stereo=()=>{stop();const s=Math.random()>.5?"L":"R" as "L"|"R";setSide(s);setRunning(true);setMessage("فقط جهت صدا را با هدفون تشخیص بده.");audio(c=>tone(c,330,1.2,s==="L"?-.95:.95));timer.current=window.setTimeout(stop,4000)};
  const answerSide=(v:"L"|"R")=>{if(!running||!side)return;const ok=v===side;stop();save(ok?100:0,ok?100:0,"pro-stereo");setSide(null);setMessage(ok?"Stereo Focus درست بود.":"سمت را اشتباه شنیدی.")};
  const phase=()=>{stop();const p=Math.random()>.5?"inverted":"normal" as "normal"|"inverted";setPolarity(p);setRunning(true);setMessage("به تصویر مرکزی و افت احتمالی در مونو گوش کن.");audio(c=>{tone(c,220,.8,0);tone(c,277.18,.8,p==="inverted"?-.45:.45)});timer.current=window.setTimeout(stop,3500)};
  const answerPhase=(v:"normal"|"inverted")=>{if(!running||!polarity)return;const ok=v===polarity;stop();save(ok?120:0,ok?100:0,"pro-phase");setPolarity(null);setMessage(ok?"Polarity تشخیص داده شد.":"دوباره با دقت به center image گوش کن.")};
  const memory=()=>{stop();const q=Array.from({length:3+Math.min(4,Math.floor(score/250))},()=>Math.floor(Math.random()*4));setSequence(q);setInput([]);setRunning(true);setMessage("ترتیب تون‌ها را حفظ کن.");audio(c=>q.forEach((n,i)=>setTimeout(()=>tone(c,[220,330,440,660][n],.3),i*380)));timer.current=window.setTimeout(()=>setMessage("حالا همان ترتیب را وارد کن."),2000)};
  const choose=(n:number)=>{if(!running)return;const next=[...input,n];setInput(next);if(next.length===sequence.length){const ok=next.every((v,i)=>v===sequence[i]);stop();save(ok?150:0,ok?100:0,"pro-memory");setMessage(ok?"حافظه شنیداری عالی بود.":"ترتیب را اشتباه به خاطر سپردی.")}};
  const rhythm=()=>{stop();const q=[0,1,2,1,0,2];setSequence(q);setInput([]);setRunning(true);setMessage("الگوی ریتمیک را گوش کن؛ بعد بازسازی کن.");audio(c=>q.forEach((n,i)=>setTimeout(()=>tone(c,[220,330,440][n],.13),i*280)));timer.current=window.setTimeout(()=>setMessage("حالا بازسازی کن."),1800)};
  const start=()=>mode==="frequency"?frequency():mode==="stereo"?stereo():mode==="phase"?phase():mode==="memory"?memory():rhythm();
  return <section className="mt-10"><button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={()=>{stop();onBack()}}><RotateCcw size={14}/> بازگشت</button><div className="card-ay mt-5 p-6 sm:p-10"><div className="mx-auto max-w-3xl"><p className="eyebrow">PRO AUDIO LAB · LISTENING FIRST</p><h1 className="mt-3 text-2xl font-semibold text-sand-50">تمرین حرفه‌ای؛ اول گوش، بعد کلیک</h1><p className="mt-3 text-sm leading-8 text-ink-400">این بازی‌ها با موس حل نمی‌شوند. هر مرحله صدا تولید می‌کند و برای هدفون یا مانیتور استودیویی طراحی شده است.</p><div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">{[["frequency","Frequency / EQ"],["stereo","Stereo Focus"],["phase","Phase / Polarity"],["memory","Audio Memory"],["rhythm","Rhythm"]].map(([id,label])=><button key={id} onClick={()=>{stop();setMode(id as typeof mode)}} className={`rounded-xl border p-3 text-xs ${mode===id?"border-gold-400/40 bg-gold-400/10 text-gold-200":"border-white/10 text-ink-400"}`}>{label}</button>)}</div><div className="mt-6 rounded-2xl border border-emerald-400/15 bg-emerald-400/[.05] p-4 text-xs leading-6 text-emerald-100"><Headphones size={15} className="mb-1"/> هدفون/مانیتور پیشنهاد می‌شود؛ ولوم را در سطح راحت نگه دار.</div><button className="btn-primary mt-6" onClick={start} disabled={running}><Play size={15} fill="currentColor"/> {running?"در حال پخش…":"پخش صوت و شروع"}</button><p className="mt-4 min-h-12 rounded-xl border border-white/[.07] bg-white/[.025] p-4 text-sm">{message}</p>{mode==="frequency"&&<div className="grid grid-cols-2 gap-3">{options.map(f=><button key={f} onClick={()=>answerFrequency(f)} className="rounded-xl border border-white/10 p-4 hover:border-gold-400/40">{f>=1000?f/1000+"kHz":f+"Hz"}</button>)}</div>}{mode==="stereo"&&<div className="grid grid-cols-2 gap-3"><button className="rounded-xl border border-white/10 p-5" onClick={()=>answerSide("L")}>◀ LEFT</button><button className="rounded-xl border border-white/10 p-5" onClick={()=>answerSide("R")}>RIGHT ▶</button></div>}{mode==="phase"&&<div className="grid grid-cols-2 gap-3"><button className="rounded-xl border border-white/10 p-4" onClick={()=>answerPhase("normal")}>Normal Polarity</button><button className="rounded-xl border border-white/10 p-4" onClick={()=>answerPhase("inverted")}>Inverted Polarity</button></div>}{(mode==="memory"||mode==="rhythm")&&<div className="grid grid-cols-4 gap-2">{[0,1,2,3].map(n=><button key={n} className="rounded-xl border border-white/10 p-5 hover:border-gold-400/40" onClick={()=>choose(n)}>{["LOW","MID","HIGH","AIR"][n]}</button>)}</div>}</div></div></section>;
}

function Personal({ url, name, audioRef, loop, speed, onLoopChange, onSpeedChange, onUpload, onBack }: { url: string; name: string; audioRef: RefObject<HTMLAudioElement | null>; loop: boolean; speed: string; onLoopChange: (value: boolean) => void; onSpeedChange: (value: string) => void; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; onBack: () => void }) { return <section className="mt-10"><button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>بازگشت به آرکید</button><div className="card-ay mt-5 p-6 sm:p-10"><div className="mx-auto max-w-2xl text-center"><FileAudio className="mx-auto text-emerald-300" size={34} /><p className="eyebrow mt-5">تمرین شخصی / Local only</p><h1 className="mt-3 text-2xl font-semibold text-sand-50">فایل خودت را دقیق‌تر گوش کن.</h1><p className="mt-3 text-sm leading-8 text-ink-400">فایل فقط در مرورگر تو باز می‌شود و به سرور یا اکانت ارسال نمی‌شود. از loop و مقایسه‌ی چندباره برای پیدا کردن یک مسئله‌ی مشخص استفاده کن.</p><label className="btn-primary mt-7 cursor-pointer gap-2"><Upload size={16} />انتخاب فایل صوتی<input className="sr-only" type="file" accept="audio/*,video/*" onChange={onUpload} /></label>{url ? <div className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.06] p-5"><p className="truncate text-sm text-emerald-200">{name}</p><audio ref={audioRef} className="mt-4 w-full" controls loop={loop} src={url} /><div className="mt-4 flex flex-wrap items-center justify-center gap-3"><label className="flex items-center gap-2 text-xs text-ink-300"><input type="checkbox" checked={loop} onChange={(event) => onLoopChange(event.target.checked)} /> پخش حلقه‌ای</label><label className="flex items-center gap-2 text-xs text-ink-300">سرعت<select className="rounded-lg border border-white/10 bg-ink-950 px-2 py-1" value={speed} onChange={(event) => { onSpeedChange(event.target.value); if (audioRef.current) audioRef.current.playbackRate = Number(event.target.value); }}><option value="0.75">۰٫۷۵×</option><option value="1">۱×</option><option value="1.25">۱٫۲۵×</option><option value="1.5">۱٫۵×</option></select></label><button type="button" className="text-xs text-gold-300 hover:text-gold-200" onClick={() => { if (audioRef.current) { audioRef.current.currentTime = 0; void audioRef.current.play(); } }}>از ابتدا</button></div></div> : <div className="mt-8 flex items-center justify-center gap-2 text-xs text-ink-500"><CircleHelp size={14} />پیشنهاد: یک loop هشت‌میزانی انتخاب کن و فقط یک موضوع را بررسی کن.</div>}<div className="mt-8 grid gap-3 text-right sm:grid-cols-3"><div className="rounded-xl bg-white/[.03] p-3 text-xs leading-6 text-ink-400"><strong className="text-sand-100">A</strong><br />صدای خام</div><div className="rounded-xl bg-white/[.03] p-3 text-xs leading-6 text-ink-400"><strong className="text-sand-100">B</strong><br />بعد از تغییر</div><div className="rounded-xl bg-white/[.03] p-3 text-xs leading-6 text-ink-400"><strong className="text-sand-100">یادداشت</strong><br />یک جمله بنویس</div></div></div></div></section>; }
