"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { Check, ChevronLeft, Clock3, LockKeyhole, Play, RotateCcw, Sparkles } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { StatusChip } from "@/components/StatusChip";

const FREE_LESSONS = [
  {
    id: "mixing-foundations",
    title: "مبانی میکس تمیز",
    description: "سه قدم ساده برای اینکه قبل از هر پلاگین، یک میکس مرتب و قابل کنترل داشته باشی.",
    duration: "۱۲ دقیقه",
    src: "",
    chapters: [
      { title: "قبل از شروع میکس", time: 0 },
      { title: "تنظیم گین و headroom", time: 180 },
      { title: "چک نهایی با گوش", time: 480 },
    ],
  },
  {
    id: "vocal-space",
    title: "جای‌گذاری وکال در میکس",
    description: "با volume، پنینگ و عمق، فضای مناسب برای وکال بساز؛ بدون شلوغ‌کردن پروژه.",
    duration: "۱۸ دقیقه",
    src: "",
    chapters: [
      { title: "مرجع شنیداری", time: 0 },
      { title: "عمق و فاصله", time: 240 },
      { title: "چک در مونو", time: 720 },
    ],
  },
  {
    id: "mastering-checklist",
    title: "چک‌لیست خروجی گرفتن",
    description: "پیش از انتشار، این چند نکته را بررسی کن تا فایل نهایی‌ات آماده‌تر و مطمئن‌تر باشد.",
    duration: "۹ دقیقه",
    src: "",
    chapters: [
      { title: "فرمت مناسب", time: 0 },
      { title: "بلندی صدا", time: 180 },
      { title: "نام‌گذاری و آرشیو", time: 360 },
    ],
  },
] as const;

type Lesson = (typeof FREE_LESSONS)[number];
type LessonId = Lesson["id"];

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export default function FreePlayerPage() {
  const [activeId, setActiveId] = useState<LessonId>(FREE_LESSONS[0].id);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [speed, setSpeed] = useState("1");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeLesson = useMemo(() => FREE_LESSONS.find((lesson) => lesson.id === activeId) || FREE_LESSONS[0], [activeId]);
  const activeProgress = progress[activeLesson.id] || 0;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("artistyar_free_player_progress");
      if (saved) setProgress(JSON.parse(saved) as Record<string, number>);
    } catch {
      // Local progress is an enhancement; the player remains fully usable without it.
    }
  }, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = Number(speed);
  }, [speed, activeId]);

  function saveProgress(next: Record<string, number>) {
    setProgress(next);
    window.localStorage.setItem("artistyar_free_player_progress", JSON.stringify(next));
  }

  function onTimeUpdate(event: SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    if (!video.duration || !Number.isFinite(video.duration)) return;
    saveProgress({ ...progress, [activeLesson.id]: Math.round((video.currentTime / video.duration) * 100) });
  }

  function selectLesson(id: LessonId) {
    setActiveId(id);
    setSpeed("1");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function seekTo(seconds: number) {
    if (videoRef.current && activeLesson.src) {
      videoRef.current.currentTime = seconds;
      void videoRef.current.play();
    }
  }

  return (
    <section className="container-ay py-12 sm:py-16">
      <SectionHeading
        eyebrow="رایگان / Free Player"
        title="یاد بگیر، تمرین کن، جلو برو."
        subtitle="آموزش‌های کوتاه و کاربردی برای شروع بهتر؛ هر درس را با سرعت خودت ببین و پیشرفتت را همین‌جا نگه دار."
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-5">
          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/30 shadow-[0_24px_70px_-42px_rgba(0,0,0,.95)]">
            {activeLesson.src ? (
              <video
                ref={videoRef}
                className="aspect-video w-full bg-black object-cover"
                controls
                preload="metadata"
                src={activeLesson.src}
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={(event) => {
                  const savedPercent = progress[activeLesson.id] || 0;
                  if (savedPercent > 0) event.currentTarget.currentTime = (event.currentTarget.duration * savedPercent) / 100;
                }}
              >
                مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
              </video>
            ) : (
              <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_30%,rgba(201,162,39,.2),transparent_42%),#10100e] p-8 text-center">
                <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px)", backgroundSize: "44px 44px" }} />
                <div className="relative max-w-sm"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold-300/30 bg-gold-300/10 text-gold-300"><Play size={22} fill="currentColor" /></span><p className="mt-4 text-sm font-medium text-sand-50">ویدیو به‌زودی در این درس قرار می‌گیرد</p><p className="mt-2 text-xs leading-6 text-ink-400">ساختار پلیر آماده است؛ کافی است آدرس فایل آموزشی را در داده همین درس قرار دهید.</p></div>
              </div>
            )}
          </div>

          <div className="card-ay p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0"><StatusChip tone="gold">آموزش رایگان</StatusChip><h1 className="mt-4 text-xl font-semibold text-sand-50 sm:text-2xl">{activeLesson.title}</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-ink-400">{activeLesson.description}</p></div>
              <label className="flex shrink-0 items-center gap-2 text-xs text-ink-400">سرعت<select className="rounded-lg border border-white/10 bg-white/[.05] px-2 py-1.5 text-sand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300" value={speed} onChange={(event) => setSpeed(event.target.value)} aria-label="سرعت پخش"><option value="0.75">۰٫۷۵×</option><option value="1">۱×</option><option value="1.25">۱٫۲۵×</option><option value="1.5">۱٫۵×</option><option value="2">۲×</option></select></label>
            </div>
            <div className="mt-5 flex items-center gap-3 border-t border-white/[.07] pt-4"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[.08]"><div className="h-full rounded-full bg-gold-400 transition-[width] duration-300" style={{ width: `${activeProgress}%` }} /></div><span className="text-xs tabular-nums text-ink-400">{activeProgress}٪</span></div>
          </div>

          <div className="card-ay p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-base font-medium text-sand-50">فصل‌های این درس</h2><span className="text-xs text-ink-500">{activeLesson.duration}</span></div><div className="mt-4 grid gap-2 sm:grid-cols-3">{activeLesson.chapters.map((chapter, index) => <button key={chapter.title} type="button" className="group rounded-xl border border-white/[.07] bg-white/[.025] p-3 text-right transition-colors hover:border-gold-500/35 hover:bg-gold-500/[.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300" onClick={() => seekTo(chapter.time)} disabled={!activeLesson.src}><span className="flex items-center justify-between gap-2 text-[11px] text-gold-400"><span>۰{index + 1}</span><span>{formatTime(chapter.time)}</span></span><span className="mt-2 block text-xs leading-6 text-ink-300 group-hover:text-sand-50">{chapter.title}</span></button>)}</div></div>
        </div>

        <aside className="card-ay h-fit p-4 lg:sticky lg:top-24"><div className="flex items-center justify-between gap-3 px-2 pb-3"><div><p className="eyebrow">کتابخانه رایگان</p><h2 className="mt-2 text-lg font-medium text-sand-50">درس‌ها</h2></div><Sparkles size={18} className="text-gold-400" aria-hidden="true" /></div><div className="space-y-2">{FREE_LESSONS.map((lesson, index) => { const isActive = lesson.id === activeLesson.id; const lessonProgress = progress[lesson.id] || 0; return <button key={lesson.id} type="button" onClick={() => selectLesson(lesson.id)} className={`w-full rounded-xl border p-3 text-right transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 ${isActive ? "border-gold-400/35 bg-gold-500/[.09]" : "border-white/[.06] bg-white/[.02] hover:border-white/20 hover:bg-white/[.05]"}`}><div className="flex items-start gap-3"><span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs ${isActive ? "bg-gold-300 text-ink-950" : "bg-white/[.06] text-ink-400"}`}>{lessonProgress >= 100 ? <Check size={14} /> : index + 1}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-sand-50">{lesson.title}</span><span className="mt-1 flex items-center gap-1 text-[11px] text-ink-500"><Clock3 size={12} aria-hidden="true" />{lesson.duration}</span></span><ChevronLeft size={15} className={`mt-1 shrink-0 transition-transform ${isActive ? "-translate-x-1 text-gold-400" : "text-ink-500"}`} aria-hidden="true" /></div><div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[.07]"><div className="h-full rounded-full bg-gold-400/80" style={{ width: `${lessonProgress}%` }} /></div></button>; })}</div><div className="mt-4 flex items-start gap-2 rounded-xl border border-white/[.07] bg-black/20 p-3 text-xs leading-6 text-ink-500"><LockKeyhole size={14} className="mt-1 shrink-0 text-gold-500" aria-hidden="true" />پیشرفت این بخش فقط روی همین دستگاه ذخیره می‌شود.</div><button type="button" className="mt-3 inline-flex items-center gap-2 px-2 text-xs text-ink-400 transition-colors hover:text-gold-300" onClick={() => { saveProgress({}); setActiveId(FREE_LESSONS[0].id); }}><RotateCcw size={13} aria-hidden="true" />پاک‌کردن پیشرفت</button></aside>
      </div>
    </section>
  );
}
