"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, Check, Flame, Headphones, RotateCcw, Sparkles, Target, X } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";

const drills = [
  { id: "low-cut", level: "شروع", category: "میکس", title: "پاک‌سازی پایینِ وکال", prompt: "برای کم‌کردن صدای بمِ اضافی وکال، اولین انتخاب منطقی چیست؟", options: ["افزایش ۸۰ هرتز", "High-pass ملایم", "کمپرسور با ratio ۱۰:۱", "افزایش reverb"], answer: 1, explanation: "High-pass ملایم فضای پایین را تمیز می‌کند، بدون اینکه بدنه‌ی طبیعی وکال را نابود کند." },
  { id: "compressor", level: "شروع", category: "میکس", title: "رفتار کمپرسور", prompt: "اگر attack کمپرسور را خیلی سریع کنیم، معمولاً چه اتفاقی برای ترنزینت می‌افتد؟", options: ["ترنزینت بیشتر برجسته می‌شود", "ترنزینت نرم‌تر و کم‌حجم‌تر می‌شود", "پهنای استریو دو برابر می‌شود", "هیچ تغییری نمی‌کند"], answer: 1, explanation: "Attack سریع ترنزینت را زودتر می‌گیرد و صدای ورودی را نرم‌تر می‌کند." },
  { id: "headroom", level: "متوسط", category: "مسترینگ", title: "فضای امن میکس", prompt: "چرا قبل از مسترینگ باید headroom کافی باقی بگذاریم؟", options: ["برای افزایش نویز", "برای جلوگیری از clipping و جا دادن پردازش نهایی", "برای حذف پنینگ", "برای کوتاه‌تر شدن آهنگ"], answer: 1, explanation: "فضای خالی به پردازش‌های مسترینگ اجازه می‌دهد بدون clipping و فشار ناخواسته انجام شوند." },
  { id: "reverb", level: "متوسط", category: "تنظیم", title: "ریورب تمیزتر", prompt: "برای اینکه ریورب وکال مزاحم وضوح کلمات نشود، چه تکنیکی مفید است؟", options: ["افزایش pre-delay یا ducking ریورب", "حذف کامل dry signal", "پان‌کردن همه‌چیز به چپ", "افزایش saturation روی مستر"], answer: 0, explanation: "Pre-delay فضا را از کلمات جدا می‌کند و ducking باعث می‌شود ریورب هنگام اجرای وکال عقب‌تر بنشیند." },
  { id: "stereo", level: "متوسط", category: "میکس", title: "مرکز میکس", prompt: "کدام عنصر معمولاً بهتر است در مرکز میکس جای بگیرد؟", options: ["وکال اصلی یا kick", "همه‌ی افکت‌ها", "فقط hi-hat", "هیچ‌چیز"], answer: 0, explanation: "عناصر اصلی مثل وکال و kick اغلب مرکز می‌مانند تا تصویر میکس پایدار و قابل ترجمه باشد." },
  { id: "reference", level: "پیشرفته", category: "گوش", title: "گوش‌دادن مرجع", prompt: "هنگام مقایسه با یک reference track، کدام روش دقیق‌تر است؟", options: ["بلندتر کردن آهنگ خودمان", "مقایسه در ولوم نزدیک و با تغییرات کوتاه A/B", "فقط نگاه‌کردن به waveform", "مقایسه با هدفون خراب"], answer: 1, explanation: "ولوم نزدیک و A/B کوتاه، قضاوت درباره‌ی تعادل، punch و tone را قابل‌اعتمادتر می‌کند." },
];

type Result = { correct: boolean; selected: number };
const STORAGE_KEY = "artistyar_practice_progress";

export default function PracticePage() {
  const [level, setLevel] = useState("همه");
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [streak, setStreak] = useState(0);
  const [finished, setFinished] = useState(false);
  const available = useMemo(() => level === "همه" ? drills : drills.filter((drill) => drill.level === level), [level]);
  const current = available[index % Math.max(available.length, 1)];
  const currentResult = current ? results[current.id] : undefined;
  const answered = Object.keys(results).length;
  const correctCount = Object.values(results).filter((result) => result.correct).length;

  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); setStreak(Number(saved.streak) || 0); } catch { /* optional local progress */ }
  }, []);

  function choose(option: number) {
    if (!current || currentResult) return;
    const correct = option === current.answer;
    const next = { ...results, [current.id]: { correct, selected: option } };
    setResults(next); setStreak((value) => correct ? value + 1 : value);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ streak: correct ? streak + 1 : streak, updatedAt: new Date().toISOString() }));
  }

  function next() {
    if (index + 1 >= available.length) setFinished(true); else setIndex((value) => value + 1);
  }

  function reset() { setIndex(0); setResults({}); setFinished(false); }
  function changeLevel(value: string) { setLevel(value); setIndex(0); setResults({}); setFinished(false); }

  return <main className="container-ay relative py-12 sm:py-16"><div className="route-ambient route-ambient-one" aria-hidden="true" /><SectionHeading eyebrow="تمرین‌خانه / Practice Lab" title="هر روز کمی بهتر بشنو." subtitle="تمرین‌های کوتاه و پروژه‌محور برای تقویت تصمیم‌های میکس، تنظیم و گوش موسیقی؛ بدون فشار، اما با تکرار." />
    <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className="space-y-5" aria-label="تمرین فعال">
        {finished ? <div className="card-ay p-8 text-center sm:p-12"><Award className="mx-auto text-gold-400" size={34} /><p className="eyebrow mt-5">جلسه کامل شد</p><h1 className="mt-3 text-2xl font-semibold text-sand-50">{correctCount} از {available.length} پاسخ درست</h1><p className="mx-auto mt-3 max-w-md text-sm leading-7 text-ink-400">تمرین بعدی را فردا تکرار کن و سعی کن قبل از دیدن پاسخ، دلیل انتخابت را با صدای بلند توضیح بدهی.</p><button type="button" className="btn-primary mt-7 gap-2" onClick={reset}><RotateCcw size={16} />شروع دوباره</button></div> : current ? <div className="card-ay p-5 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="rounded-full border border-gold-400/25 bg-gold-400/10 px-3 py-1 text-[11px] text-gold-300">{current.category}</span><span className="text-xs text-ink-500">سطح {current.level}</span></div><span className="font-mono text-xs text-ink-500">{index + 1} / {available.length}</span></div><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[.07]"><div className="h-full rounded-full bg-gold-400 transition-[width] duration-300" style={{ width: `${((index + 1) / available.length) * 100}%` }} /></div><h1 className="mt-8 text-2xl font-semibold text-sand-50">{current.title}</h1><p className="mt-3 text-base leading-8 text-ink-300">{current.prompt}</p><div className="mt-7 grid gap-3 sm:grid-cols-2">{current.options.map((option, optionIndex) => { const selected = currentResult?.selected === optionIndex; const correct = current.answer === optionIndex; const state = currentResult ? correct ? "border-emerald-400/45 bg-emerald-400/10 text-emerald-200" : selected ? "border-red-400/40 bg-red-400/10 text-red-200" : "border-white/[.06] text-ink-500" : "border-white/[.08] bg-white/[.025] text-ink-200 hover:border-gold-400/40 hover:bg-gold-400/[.06]"; return <button key={option} type="button" className={`rounded-2xl border p-4 text-right text-sm leading-7 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 ${state}`} onClick={() => choose(optionIndex)} disabled={Boolean(currentResult)}><span className="flex items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[.07] font-mono text-xs">{String.fromCharCode(65 + optionIndex)}</span>{option}{currentResult && correct ? <Check className="mr-auto shrink-0" size={17} /> : null}{currentResult && selected && !correct ? <X className="mr-auto shrink-0" size={17} /> : null}</span></button>; })}</div>{currentResult ? <div className={`mt-6 rounded-2xl border p-4 text-sm leading-7 ${currentResult.correct ? "border-emerald-400/20 bg-emerald-400/[.06] text-emerald-200" : "border-gold-400/20 bg-gold-400/[.06] text-sand-200"}`}><strong>{currentResult.correct ? "درست بود. " : "نزدیک بود. "}</strong>{current.explanation}</div> : <p className="mt-6 flex items-center gap-2 text-xs text-ink-500"><Headphones size={14} className="text-gold-400" />قبل از انتخاب، دلیل هر گزینه را در ذهنت مرور کن.</p>}{currentResult ? <button type="button" className="btn-primary mt-6 gap-2" onClick={next}>{index + 1 === available.length ? "دیدن نتیجه" : "تمرین بعدی"}<Target size={15} /></button> : null}</div> : null}
      </section>
      <aside className="space-y-4"><div className="card-ay p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-400/10 text-orange-300"><Flame size={19} /></span><div><p className="text-xs text-ink-500">زنجیره‌ی شخصی</p><p className="mt-1 text-xl font-semibold text-sand-50">{streak} پاسخ درست</p></div></div><p className="mt-4 text-xs leading-6 text-ink-500">پیشرفت این تمرین‌ها روی همین دستگاه ذخیره می‌شود.</p></div><div className="card-ay p-5"><div className="flex items-center gap-2"><Sparkles size={16} className="text-gold-400" /><h2 className="text-sm font-medium text-sand-50">سطح تمرین</h2></div><div className="mt-4 flex flex-wrap gap-2">{["همه", "شروع", "متوسط", "پیشرفته"].map((item) => <button key={item} type="button" className={`rounded-full border px-3 py-2 text-xs transition ${level === item ? "border-gold-400/45 bg-gold-400/10 text-gold-300" : "border-white/10 text-ink-400 hover:border-white/25 hover:text-sand-100"}`} onClick={() => changeLevel(item)}>{item}</button>)}</div></div><div className="rounded-2xl border border-gold-400/15 bg-gold-400/[.045] p-5 text-sm leading-7 text-ink-300"><strong className="text-sand-50">قانون طلایی</strong><p className="mt-2">پاسخ درست مهم است، اما توضیح‌دادنِ دلیل پاسخ است که گوش تو را حرفه‌ای می‌کند.</p></div></aside>
    </div>
  </main>;
}
