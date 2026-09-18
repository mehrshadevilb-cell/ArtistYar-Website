"use client";

import { ChangeEvent, RefObject, useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, Award, Check, CircleHelp, Ear, FileAudio, Flame, Gamepad2, Headphones, LockKeyhole, Pause, Play, RotateCcw, Sparkles, Target, Upload, Volume2, Waves, X } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";

type GameId = "hub" | "tone" | "eq" | "compressor" | "phase" | "personal";
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
const phaseOptions = ["مرکز و محکم", "پهن اما ناپایدار", "کاملاً بی‌صدا", "فقط در سمت چپ"];

function formatFrequency(value: number) { return value >= 1000 ? `${value / 1000}kHz` : `${value}Hz`; }

function playTone(frequency: number, duration = 1.3) {
  if (typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine"; oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.22, context.currentTime + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + duration + 0.05);
  window.setTimeout(() => void context.close(), (duration + 0.2) * 1000);
}

export default function PracticePage() {
  const [active, setActive] = useState<GameId>("hub");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [toneRound, setToneRound] = useState(0);
  const [toneAnswer, setToneAnswer] = useState<number | null>(null);
  const [eqRound, setEqRound] = useState(0);
  const [eqAnswer, setEqAnswer] = useState<string | null>(null);
  const [phaseAnswer, setPhaseAnswer] = useState<number | null>(null);
  const [personalUrl, setPersonalUrl] = useState("");
  const [personalName, setPersonalName] = useState("");
  const [personalLoop, setPersonalLoop] = useState(false);
  const [personalSpeed, setPersonalSpeed] = useState("1");
  const personalAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem("artistyar_arcade_score") || "{}"); setScore(Number(saved.score) || 0); setStreak(Number(saved.streak) || 0); } catch { /* local-only progress is optional */ } }, []);
  function record(correct: boolean) { const nextScore = score + (correct ? 10 : 0); const nextStreak = correct ? streak + 1 : 0; setScore(nextScore); setStreak(nextStreak); localStorage.setItem("artistyar_arcade_score", JSON.stringify({ score: nextScore, streak: nextStreak })); }
  function uploadPersonal(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; if (personalUrl) URL.revokeObjectURL(personalUrl); setPersonalUrl(URL.createObjectURL(file)); setPersonalName(file.name); }
  function resetGame() { setToneAnswer(null); setEqAnswer(null); setPhaseAnswer(null); }

  return <main className="container-ay relative py-12 sm:py-16"><div className="route-ambient route-ambient-one" aria-hidden="true" /><SectionHeading eyebrow="تمرین‌خانه / Practice Arcade" title="گوشَت را مثل یک ساز تمرین بده." subtitle="بازی‌های کوتاه و شنیداری برای میکس، EQ، داینامیک و فاز؛ بدون اکانت، بدون رتبه‌بندی مصنوعی، فقط تمرین واقعی." />
    <div className="mt-8 flex flex-wrap items-center gap-3"><div className="card-ay flex items-center gap-3 px-4 py-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-400/10 text-gold-300"><Award size={18} /></span><span><span className="block text-[11px] text-ink-500">امتیاز امروز</span><strong className="text-lg text-sand-50">{score}</strong></span></div><div className="card-ay flex items-center gap-3 px-4 py-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-400/10 text-orange-300"><Flame size={18} /></span><span><span className="block text-[11px] text-ink-500">زنجیره</span><strong className="text-lg text-sand-50">{streak}</strong></span></div><span className="flex items-center gap-2 text-xs text-ink-500"><LockKeyhole size={14} className="text-gold-400" />پیشرفت فقط روی همین دستگاه ذخیره می‌شود.</span></div>
    {active === "hub" ? <Hub onSelect={(id) => { resetGame(); setActive(id); }} /> : active === "personal" ? <Personal url={personalUrl} name={personalName} audioRef={personalAudio} loop={personalLoop} speed={personalSpeed} onLoopChange={setPersonalLoop} onSpeedChange={setPersonalSpeed} onUpload={uploadPersonal} onBack={() => setActive("hub")} /> : <GameStage active={active} toneRound={toneRound} setToneRound={setToneRound} toneAnswer={toneAnswer} setToneAnswer={(value) => { setToneAnswer(value); record(value === toneRounds[toneRound].frequency); }} eqRound={eqRound} setEqRound={setEqRound} eqAnswer={eqAnswer} setEqAnswer={(value) => { setEqAnswer(value); record(value === eqRounds[eqRound].answer); }} phaseAnswer={phaseAnswer} setPhaseAnswer={(value) => { setPhaseAnswer(value); record(value === 0); }} onBack={() => setActive("hub")} onReset={resetGame} />}
  </main>;
}

function Hub({ onSelect }: { onSelect: (id: GameId) => void }) {
  const daily = games[new Date().getDate() % games.length];
  return <div className="mt-10 space-y-6"><div className="rounded-2xl border border-gold-400/20 bg-gradient-to-l from-gold-400/[.12] to-white/[.025] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><span className="eyebrow">چالش امروز / Daily Challenge</span><h2 className="mt-2 text-lg font-medium text-sand-50">امروز فقط ۵ دقیقه روی {daily.title} تمرکز کن.</h2><p className="mt-1 text-xs leading-6 text-ink-400">هر روز یک مهارت را انتخاب کن؛ کیفیت تمرین از تعداد بازی مهم‌تر است.</p></div><button type="button" className="btn-primary !px-4 !py-2 text-xs" onClick={() => onSelect(daily.id)}>شروع چالش</button></div></div><div className="grid gap-4 md:grid-cols-2">{games.map((game) => { const Icon = game.icon; return <button key={game.id} type="button" className="card-ay group p-6 text-right transition duration-300 hover:-translate-y-1 hover:border-gold-400/35" onClick={() => onSelect(game.id)}><div className="flex items-start justify-between gap-4"><span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[.05] ${game.color}`}><Icon size={23} /></span><span className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-ink-500">{game.tag}</span></div><h2 className="mt-6 text-xl font-medium text-sand-50">{game.title}</h2><p className="mt-2 max-w-md text-sm leading-7 text-ink-400">{game.description}</p><span className="mt-6 inline-flex items-center gap-2 text-xs text-gold-300">شروع بازی <Play size={13} fill="currentColor" /></span></button>; })}</div><button type="button" className="card-ay group flex w-full flex-col items-start gap-4 p-6 text-right transition hover:border-gold-400/35 sm:flex-row sm:items-center" onClick={() => onSelect("personal")}><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300"><FileAudio size={23} /></span><span className="flex-1"><span className="eyebrow">تمرین شخصی / بدون آپلود</span><strong className="mt-2 block text-lg text-sand-50">فایل خودت را وارد کن و A/B تمرین کن</strong><span className="mt-1 block text-sm leading-7 text-ink-400">یک فایل صوتی را فقط در مرورگر باز کن، بخش‌های مختلفش را loop کن و با هدف مشخص گوش بده.</span></span><Upload size={18} className="text-gold-300" /></button><div className="grid gap-4 rounded-2xl border border-gold-400/15 bg-gold-400/[.045] p-5 text-sm leading-7 text-ink-300 md:grid-cols-3"><p><strong className="text-sand-50">۱. گوش بده</strong><br />اول با گوش تصمیم بگیر، بعد سراغ analyzer برو.</p><p><strong className="text-sand-50">۲. حدس بزن</strong><br />پاسخ اولت را ثبت کن و از دیدن جواب نترس.</p><p><strong className="text-sand-50">۳. تکرار کن</strong><br />رکورد تو روی همین دستگاه می‌ماند و نیاز به حساب ندارد.</p></div><PracticeResources />
  </div>;
}

function PracticeResources() {
  const resources = [
    { name: "Monosounds Ear Training", badge: "رایگان", description: "تمرین مرورگری برای EQ، کمپرس، استریو، فاز و مهارت‌های شنیداری.", href: "https://monosounds.studio/", action: "باز کردن" },
    { name: "MAET", badge: "رایگان · Local", description: "تمرین فرکانس، کمپرسور، phase و comb filtering با امکان استفاده از فایل‌های صوتی خودت؛ فایل‌ها محلی پردازش می‌شوند.", href: "https://michaelafanasyev.com/maet", action: "شروع تمرین" },
    { name: "Lion Train", badge: "Community Pick", description: "گزینه‌ای که در معرفی‌های کاربری SoundGym دیده می‌شود؛ برای تمرین شنیداری به‌عنوان منبع مکمل.", href: "https://www.soundgym.co/", action: "مشاهده در SoundGym" },
    { name: "Audiodrillz", badge: "رایگان", description: "تمرین‌های گیمی برای تشخیص فرکانس و تنظیمات رایج افکت‌ها، مخصوص تولیدکننده‌ها و مهندسان صدا.", href: "https://audiodrillz.app/", action: "باز کردن" },
    { name: "EQ Academy", badge: "رایگان · Desktop", description: "تمرین EQ با ۱۰۰ سطح تعاملی، frequency، gain، Q و mid/side؛ امکان تمرین با reference track.", href: "https://www.masteringthemix.com/products/eq-academy", action: "دریافت رایگان" },
    { name: "TrainYourEars EQ Edition", badge: "Desktop", description: "تمرین تخصصی EQ برای Mac و Windows با Guess و Correct Mode و امکان طراحی تمرین اختصاصی.", href: "https://www.trainyourears.com/", action: "مشاهده" },
  ];

  return (
    <section className="space-y-5 pt-2" aria-labelledby="external-ear-training">
      <div>
        <p className="eyebrow">منابع منتخب / Ear Training</p>
        <h2 id="external-ear-training" className="mt-2 text-xl font-semibold text-sand-50">ابزارهای مکمل برای ادامه‌ی تمرین</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-400">این ابزارها مکمل تمرین‌خانه‌ی آرتیست‌یارند؛ بعضی مرورگری‌اند و بعضی نرم‌افزار دسکتاپ.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {resources.map((resource) => (
          <a key={resource.name} href={resource.href} target="_blank" rel="noopener noreferrer" className="group card-ay flex h-full flex-col p-5 text-right transition duration-300 hover:-translate-y-1 hover:border-gold-400/30">
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-full border border-gold-400/20 bg-gold-400/[.06] px-2.5 py-1 text-[10px] text-gold-300">{resource.badge}</span>
              <Sparkles size={17} className="text-gold-400/70 transition group-hover:rotate-12 group-hover:text-gold-300" />
            </div>
            <h3 className="mt-5 text-base font-medium text-sand-50">{resource.name}</h3>
            <p className="mt-2 flex-1 text-sm leading-7 text-ink-400">{resource.description}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-gold-300">{resource.action} <Play size={12} fill="currentColor" /></span>
          </a>
        ))}
      </div>
      <div className="rounded-2xl border border-white/[.07] bg-white/[.02] p-5 text-xs leading-7 text-ink-400">
        <strong className="text-sand-100">نکته:</strong> MAET با فایل شخصی به‌صورت محلی کار می‌کند؛ تمرین شخصی آرتیست‌یار هم فایل را به سرور ارسال نمی‌کند.
      </div>
    </section>
  );
}

function GameStage({ active, toneRound, setToneRound, toneAnswer, setToneAnswer, eqRound, setEqRound, eqAnswer, setEqAnswer, phaseAnswer, setPhaseAnswer, onBack, onReset }: { active: Exclude<GameId, "hub" | "personal">; toneRound: number; setToneRound: (value: number) => void; toneAnswer: number | null; setToneAnswer: (value: number) => void; eqRound: number; setEqRound: (value: number) => void; eqAnswer: string | null; setEqAnswer: (value: string) => void; phaseAnswer: number | null; setPhaseAnswer: (value: number) => void; onBack: () => void; onReset: () => void }) {
  const game = games.find((item) => item.id === active)!;
  const Icon = game.icon;
  const solved = active === "tone" ? toneAnswer !== null : active === "eq" ? eqAnswer !== null : phaseAnswer !== null;
  const next = () => { onReset(); if (active === "tone") setToneRound((toneRound + 1) % toneRounds.length); if (active === "eq") setEqRound((eqRound + 1) % eqRounds.length); };
  return <section className="mt-10"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>بازگشت به آرکید</button><span className="flex items-center gap-2 text-xs text-ink-500"><Icon size={15} className={game.color} />{game.title}</span></div><div className="card-ay p-6 sm:p-10"><div className="mx-auto max-w-2xl text-center"><span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/[.05] ${game.color}`}><Icon size={30} /></span><p className="eyebrow mt-6">{game.tag}</p>{active === "tone" ? <ToneGame round={toneRounds[toneRound]} answer={toneAnswer} onAnswer={setToneAnswer} /> : active === "eq" ? <EqGame round={eqRounds[eqRound]} answer={eqAnswer} onAnswer={setEqAnswer} /> : <PhaseGame answer={phaseAnswer} onAnswer={setPhaseAnswer} />}{solved ? <button type="button" className="btn-primary mt-7 gap-2" onClick={next}>راند بعدی <Target size={15} /></button> : null}<p className="mt-8 flex items-center justify-center gap-2 text-xs text-ink-500"><Headphones size={14} className="text-gold-400" />با هدفون یا مانیتور در ولوم امن تمرین کن.</p></div></div></section>;
}

function ToneGame({ round, answer, onAnswer }: { round: typeof toneRounds[number]; answer: number | null; onAnswer: (value: number) => void }) { return <><h1 className="mt-5 text-2xl font-semibold text-sand-50">کدام فرکانس را شنیدی؟</h1><p className="mt-3 text-sm leading-7 text-ink-400">دکمه‌ی پخش را بزن، با دقت گوش کن و نزدیک‌ترین گزینه را انتخاب کن.</p><button type="button" className="btn-primary mt-7 gap-2" onClick={() => playTone(round.frequency)}><Play size={16} fill="currentColor" />پخش تون مرموز</button><div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">{round.options.map((option) => <button type="button" key={option} className={`rounded-xl border p-3 text-sm transition ${answer === option ? option === round.frequency ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-red-400/40 bg-red-400/10 text-red-200" : "border-white/10 text-ink-300 hover:border-gold-400/40"}`} onClick={() => onAnswer(option)} disabled={answer !== null}>{formatFrequency(option)}{answer !== null && option === round.frequency ? <Check className="mx-auto mt-1" size={14} /> : null}</button>)}</div>{answer !== null ? <p className="mt-5 text-sm text-ink-300">فرکانس درست: <strong className="text-gold-300">{formatFrequency(round.frequency)}</strong></p> : null}</>; }
function EqGame({ round, answer, onAnswer }: { round: typeof eqRounds[number]; answer: string | null; onAnswer: (value: string) => void }) { const options = ["زیر ۱۰۰Hz", "حدود ۲۵۰Hz", "حدود ۳kHz", "حدود ۱۰kHz"]; return <><h1 className="mt-5 text-2xl font-semibold text-sand-50">کارآگاه EQ</h1><p className="mt-4 rounded-2xl border border-white/[.08] bg-white/[.03] p-5 text-sm leading-8 text-sand-100">«{round.prompt}»</p><p className="mt-4 text-xs text-ink-500">{round.hint}</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{options.map((option) => <button type="button" key={option} className={`rounded-xl border p-4 text-sm transition ${answer ? option === round.answer ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : answer === option ? "border-red-400/40 bg-red-400/10 text-red-200" : "border-white/10 text-ink-500" : "border-white/10 text-ink-300 hover:border-gold-400/40"}`} onClick={() => onAnswer(option)} disabled={Boolean(answer)}>{option}</button>)}</div>{answer ? <p className="mt-5 text-sm text-ink-300">ناحیه‌ی پیشنهادی: <strong className="text-gold-300">{round.answer}</strong></p> : null}</>; }
function PhaseGame({ answer, onAnswer }: { answer: number | null; onAnswer: (value: number) => void }) { return <><h1 className="mt-5 text-2xl font-semibold text-sand-50">شکارچی فاز</h1><p className="mt-3 text-sm leading-7 text-ink-400">دو حالت تصویر استریو را تصور کن. کدام گزینه نشانه‌ی فاز پایدارتر و قابل‌اعتمادتر است؟</p><div className="mt-7 grid gap-3 sm:grid-cols-2">{phaseOptions.map((option, index) => <button type="button" key={option} className={`rounded-xl border p-4 text-sm transition ${answer !== null ? index === 0 ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : answer === index ? "border-red-400/40 bg-red-400/10 text-red-200" : "border-white/10 text-ink-500" : "border-white/10 text-ink-300 hover:border-gold-400/40"}`} onClick={() => onAnswer(index)} disabled={answer !== null}>{option}</button>)}</div>{answer !== null ? <p className="mt-5 text-sm leading-7 text-ink-300">در میکس مونو، مرکز و محکم‌بودن معمولاً نشانه‌ی امن‌تری است؛ با correlation meter هم بررسی کن.</p> : null}</>; }

function Personal({ url, name, audioRef, loop, speed, onLoopChange, onSpeedChange, onUpload, onBack }: { url: string; name: string; audioRef: RefObject<HTMLAudioElement | null>; loop: boolean; speed: string; onLoopChange: (value: boolean) => void; onSpeedChange: (value: string) => void; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; onBack: () => void }) { return <section className="mt-10"><button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>بازگشت به آرکید</button><div className="card-ay mt-5 p-6 sm:p-10"><div className="mx-auto max-w-2xl text-center"><FileAudio className="mx-auto text-emerald-300" size={34} /><p className="eyebrow mt-5">تمرین شخصی / Local only</p><h1 className="mt-3 text-2xl font-semibold text-sand-50">فایل خودت را دقیق‌تر گوش کن.</h1><p className="mt-3 text-sm leading-8 text-ink-400">فایل فقط در مرورگر تو باز می‌شود و به سرور یا اکانت ارسال نمی‌شود. از loop و مقایسه‌ی چندباره برای پیدا کردن یک مسئله‌ی مشخص استفاده کن.</p><label className="btn-primary mt-7 cursor-pointer gap-2"><Upload size={16} />انتخاب فایل صوتی<input className="sr-only" type="file" accept="audio/*,video/*" onChange={onUpload} /></label>{url ? <div className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.06] p-5"><p className="truncate text-sm text-emerald-200">{name}</p><audio ref={audioRef} className="mt-4 w-full" controls loop={loop} src={url} /><div className="mt-4 flex flex-wrap items-center justify-center gap-3"><label className="flex items-center gap-2 text-xs text-ink-300"><input type="checkbox" checked={loop} onChange={(event) => onLoopChange(event.target.checked)} /> پخش حلقه‌ای</label><label className="flex items-center gap-2 text-xs text-ink-300">سرعت<select className="rounded-lg border border-white/10 bg-ink-950 px-2 py-1" value={speed} onChange={(event) => { onSpeedChange(event.target.value); if (audioRef.current) audioRef.current.playbackRate = Number(event.target.value); }}><option value="0.75">۰٫۷۵×</option><option value="1">۱×</option><option value="1.25">۱٫۲۵×</option><option value="1.5">۱٫۵×</option></select></label><button type="button" className="text-xs text-gold-300 hover:text-gold-200" onClick={() => { if (audioRef.current) { audioRef.current.currentTime = 0; void audioRef.current.play(); } }}>از ابتدا</button></div></div> : <div className="mt-8 flex items-center justify-center gap-2 text-xs text-ink-500"><CircleHelp size={14} />پیشنهاد: یک loop هشت‌میزانی انتخاب کن و فقط یک موضوع را بررسی کن.</div>}<div className="mt-8 grid gap-3 text-right sm:grid-cols-3"><div className="rounded-xl bg-white/[.03] p-3 text-xs leading-6 text-ink-400"><strong className="text-sand-100">A</strong><br />صدای خام</div><div className="rounded-xl bg-white/[.03] p-3 text-xs leading-6 text-ink-400"><strong className="text-sand-100">B</strong><br />بعد از تغییر</div><div className="rounded-xl bg-white/[.03] p-3 text-xs leading-6 text-ink-400"><strong className="text-sand-100">یادداشت</strong><br />یک جمله بنویس</div></div></div></div></section>; }
