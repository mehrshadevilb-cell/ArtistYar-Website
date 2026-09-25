"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { Check, ChevronLeft, Clock3, FolderOpen, LockKeyhole, Play, RotateCcw, Sparkles, Upload } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { StatusChip } from "@/components/StatusChip";
import { fetchFreeLessons, type ApiFreeLesson } from "@/lib/rahyar-api";
import { fallbackFreeLessons } from "@/lib/free-lessons-fallback";

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export default function FreePlayerPage() {
  const [lessons, setLessons] = useState<ApiFreeLesson[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [progress, setProgress] = useState<Record<number, number>>({});
  const [speed, setSpeed] = useState("1");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeLesson = useMemo(() => lessons.find((lesson) => lesson.id === activeId) || lessons[0], [lessons, activeId]);
  const activeProgress = activeLesson ? progress[activeLesson.id] || 0 : 0;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("artistyar_free_player_progress");
      if (saved) setProgress(JSON.parse(saved) as Record<number, number>);
    } catch {
      // Local progress is optional and should never block playback.
    }
    loadLessons();
    void checkAdmin();
  }, []);

  async function checkAdmin() {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "include" });
      if (!response.ok) return;
      const data = await response.json();
      setIsAdmin(data?.user?.role === "admin");
    } catch {
      setIsAdmin(false);
    }
  }

  async function loadLessons() {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchFreeLessons();
      setUsingFallback(data.every((lesson) => lesson.id < 0));
      setLessons(data);
      setActiveId(data[0]?.id || null);
    } catch {
      setUsingFallback(true);
      setError(false);
      setLessons(fallbackFreeLessons);
      setActiveId(fallbackFreeLessons[0]?.id || null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = Number(speed);
  }, [speed, activeId]);

  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;
    const block = (event: Event) => event.preventDefault();
    node.addEventListener("contextmenu", block);
    return () => node.removeEventListener("contextmenu", block);
  }, [activeId, activeLesson?.video_url]);

  function saveProgress(next: Record<number, number>) {
    setProgress(next);
    try {
      window.localStorage.setItem("artistyar_free_player_progress", JSON.stringify(next));
    } catch {
      // Progress persistence is optional and must never break playback.
    }
  }

  function onTimeUpdate(event: SyntheticEvent<HTMLVideoElement>) {
    if (!activeLesson) return;
    const video = event.currentTarget;
    if (!video.duration || !Number.isFinite(video.duration)) return;
    saveProgress({ ...progress, [activeLesson.id]: Math.round((video.currentTime / video.duration) * 100) });
  }

  function selectLesson(id: number) {
    setActiveId(id);
    setSpeed("1");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function seekTo(seconds: number) {
    if (videoRef.current && activeLesson?.video_url) {
      videoRef.current.currentTime = seconds;
      void videoRef.current.play();
    }
  }

  return (
    <section className="container-ay py-12 sm:py-16">
      {isAdmin ? (
        <div className="mb-5 flex justify-end">
          <a href="/admin/content?tab=free" className="inline-flex items-center gap-2 rounded-xl border border-gold-400/25 bg-gold-400/[.06] px-4 py-2.5 text-xs font-medium text-gold-200 transition hover:border-gold-400/50 hover:bg-gold-400/[.1]">
            <Upload size={14} />
            مدیریت / Upload / Import آموزش رایگان
            <FolderOpen size={13} className="opacity-70" />
          </a>
        </div>
      ) : null}
      <SectionHeading
        eyebrow="رایگان / Free Player"
        title="یاد بگیر، تمرین کن، جلو برو."
        subtitle="آموزش‌های کوتاه و کاربردی برای شروع بهتر؛ هر درس را با سرعت خودت ببین و پیشرفتت را همین‌جا نگه دار."
        as="h1"
      />
      {loading ? (
        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="card-ay aspect-video animate-pulse bg-white/[.03]" />
          <aside className="card-ay h-72 animate-pulse bg-white/[.03]" />
        </div>
      ) : error ? (
        <div className="card-ay mx-auto mt-10 max-w-xl p-8 text-center">
          <p className="eyebrow">اتصال به کتابخانه</p>
          <h2 className="mt-3 text-xl font-medium text-sand-50">فعلاً امکان دریافت درس‌ها نیست</h2>
          <p className="mt-3 text-sm leading-7 text-ink-400">آموزش‌های نمونه آماده‌اند؛ برای دریافت کتابخانهٔ زنده دوباره تلاش کن.</p>
          <button type="button" onClick={() => void loadLessons()} className="btn-primary mt-5 !py-2 text-sm">تلاش دوباره</button>
        </div>
      ) : !activeLesson ? (
        <div className="card-ay mx-auto mt-10 max-w-xl p-8 text-center">
          <Sparkles className="mx-auto text-gold-400" size={24} />
          <h2 className="mt-4 text-xl font-medium text-sand-50">اولین آموزش به‌زودی منتشر می‌شود</h2>
          <p className="mt-3 text-sm leading-7 text-ink-400">ادمین می‌تواند اولین درس رایگان را از پنل مدیریت ویدیوها اضافه کند.</p>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="space-y-5">
            <div
              className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/30 shadow-[0_24px_70px_-42px_rgba(0,0,0,.95)]"
              onContextMenu={(e) => e.preventDefault()}
            >
              {activeLesson.video_url ? (
                <video
                  ref={videoRef}
                  className="aspect-video w-full bg-black object-cover"
                  controls
                  controlsList="nodownload noplaybackrate noremoteplayback"
                  disablePictureInPicture
                  playsInline
                  preload="metadata"
                  poster={activeLesson.thumbnail_url || undefined}
                  src={activeLesson.video_url}
                  onTimeUpdate={onTimeUpdate}
                  onLoadedMetadata={(event) => {
                    const saved = progress[activeLesson.id] || 0;
                    if (saved > 0) event.currentTarget.currentTime = (event.currentTarget.duration * saved) / 100;
                  }}
                >
                  مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
                </video>
              ) : (
                <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_30%,rgba(201,162,39,.2),transparent_42%),#10100e] p-8 text-center">
                  <div className="relative max-w-sm">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold-300/30 bg-gold-300/10 text-gold-300">
                      <Play size={22} fill="currentColor" />
                    </span>
                    <p className="mt-4 text-sm font-medium text-sand-50">ویدیو این درس هنوز منتشر نشده</p>
                    <p className="mt-2 text-xs leading-6 text-ink-400">
                      تا آماده‌شدن ویدیو، از مسیرهای آموزشی و راه‌یار AI شروع کن.
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                      <a href="/courses" className="rounded-full bg-gold-500 px-4 py-2 text-xs font-medium text-ink-950 transition hover:bg-gold-400">
                        مسیرهای آموزشی
                      </a>
                      <a href="/assistant" className="rounded-full border border-white/15 bg-white/[.04] px-4 py-2 text-xs font-medium text-sand-50 transition hover:border-gold-500/40 hover:bg-gold-500/10">
                        سؤال از راه‌یار AI
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="card-ay p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <StatusChip tone="gold">آموزش رایگان</StatusChip>
                  <h2 className="mt-4 text-xl font-semibold text-sand-50 sm:text-2xl">{activeLesson.title}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-400">{activeLesson.description}</p>
                </div>
                <label className="flex shrink-0 items-center gap-2 text-xs text-ink-400">
                  سرعت
                  <select
                    className="rounded-lg border border-white/10 bg-white/[.05] px-2 py-1.5 text-sand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                    value={speed}
                    onChange={(event) => setSpeed(event.target.value)}
                    aria-label="سرعت پخش"
                  >
                    <option value="0.75">۰٫۷۵×</option>
                    <option value="1">۱×</option>
                    <option value="1.25">۱٫۲۵×</option>
                    <option value="1.5">۱٫۵×</option>
                    <option value="2">۲×</option>
                  </select>
                </label>
              </div>
              <div className="mt-5 flex items-center gap-3 border-t border-white/[.07] pt-4">
                <div
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[.08]"
                  role="progressbar"
                  aria-label={`پیشرفت در درس ${activeLesson.title}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={activeProgress}
                >
                  <div className="h-full rounded-full bg-gold-400 transition-[width] duration-300" style={{ width: `${activeProgress}%` }} />
                </div>
                <span className="text-xs tabular-nums text-ink-400">{activeProgress}٪</span>
              </div>
              <p className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-ink-500">
                <LockKeyhole size={12} className="mt-0.5 shrink-0 text-gold-500" />
                دانلود ویدیو برای کاربران غیرادمین غیرفعال است (دکمه دانلود مرورگر و منوی راست‌کلیک). جلوگیری کامل از IDM نیاز به CDN
                اختصاصی / HLS امضاشده دارد.
              </p>
            </div>
            <div className="card-ay p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-medium text-sand-50">فصل‌های این درس</h2>
                <span className="text-xs text-ink-500">{activeLesson.duration_label}</span>
              </div>
              {usingFallback ? (
                <div className="mt-4 rounded-xl border border-gold-400/20 bg-gold-400/[.06] p-3 text-xs leading-6 text-gold-200">
                  کتابخانهٔ اصلی موقتاً در دسترس نیست؛ این فهرست نمونه نمایش داده شده است. لینک ویدیوها را می‌توان از پنل مدیریت اضافه کرد.
                </div>
              ) : null}
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {activeLesson.chapters.map((chapter, index) => (
                  <button
                    key={`${chapter.title}-${chapter.time}`}
                    type="button"
                    className="group rounded-xl border border-white/[.07] bg-white/[.025] p-3 text-right transition-colors hover:border-gold-500/35 hover:bg-gold-500/[.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                    onClick={() => seekTo(chapter.time)}
                    disabled={!activeLesson.video_url}
                  >
                    <span className="flex items-center justify-between gap-2 text-[11px] text-gold-400">
                      <span>۰{index + 1}</span>
                      <span>{formatTime(chapter.time)}</span>
                    </span>
                    <span className="mt-2 block text-xs leading-6 text-ink-300 group-hover:text-sand-50">{chapter.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <aside className="order-first h-fit p-4 card-ay lg:order-last lg:sticky lg:top-24">
            <div className="flex items-center justify-between gap-3 px-2 pb-3">
              <div>
                <p className="eyebrow">کتابخانه رایگان</p>
                <h2 className="mt-2 text-lg font-medium text-sand-50">درس‌ها</h2>
              </div>
              <Sparkles size={18} className="text-gold-400" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              {lessons.map((lesson, index) => {
                const isActive = lesson.id === activeLesson.id;
                const lessonProgress = progress[lesson.id] || 0;
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => selectLesson(lesson.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={`w-full rounded-xl border p-3 text-right transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 ${
                      isActive
                        ? "border-gold-400/35 bg-gold-500/[.09]"
                        : "border-white/[.06] bg-white/[.02] hover:border-white/20 hover:bg-white/[.05]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs ${
                          isActive ? "bg-gold-300 text-ink-950" : "bg-white/[.06] text-ink-400"
                        }`}
                      >
                        {lessonProgress >= 100 ? <Check size={14} /> : index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-sand-50">{lesson.title}</span>
                        <span className="mt-1 flex items-center gap-1 text-[11px] text-ink-500">
                          <Clock3 size={12} aria-hidden="true" />
                          {lesson.duration_label}
                        </span>
                      </span>
                      <ChevronLeft
                        size={15}
                        className={`mt-1 shrink-0 transition-transform ${isActive ? "-translate-x-1 text-gold-400" : "text-ink-500"}`}
                        aria-hidden="true"
                      />
                    </div>
                    <div
                      className="mt-3 h-1 overflow-hidden rounded-full bg-white/[.07]"
                      role="progressbar"
                      aria-label={`پیشرفت در ${lesson.title}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={lessonProgress}
                    >
                      <div className="h-full rounded-full bg-gold-400/80" style={{ width: `${lessonProgress}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/[.07] bg-black/20 p-3 text-xs leading-6 text-ink-500">
              <LockKeyhole size={14} className="mt-1 shrink-0 text-gold-500" aria-hidden="true" />
              پیشرفت این بخش فقط روی همین دستگاه ذخیره می‌شود.
            </div>
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-2 px-2 text-xs text-ink-400 transition-colors hover:text-gold-300"
              onClick={() => {
                saveProgress({});
                setActiveId(lessons[0]?.id || null);
              }}
            >
              <RotateCcw size={13} aria-hidden="true" />
              پاک‌کردن پیشرفت
            </button>
          </aside>
        </div>
      )}
    </section>
  );
}
