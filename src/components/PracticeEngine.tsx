"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AudioWaveform,
  CalendarDays,
  ChevronLeft,
  Dumbbell,
  Headphones,
  LayoutDashboard,
  Music2,
  Target,
  Trophy,
} from "lucide-react";
import dynamic from "next/dynamic";
import { PracticeProBanner } from "@/components/PracticeProBanner";

const PracticeChunkLoading = () => (
  <section className="container-ay py-10" dir="rtl">
    <div className="card-ay animate-pulse p-8 text-center">
      <div className="mx-auto h-5 w-40 rounded bg-white/[.06]" />
      <div className="mx-auto mt-4 h-4 w-72 max-w-full rounded bg-white/[.04]" />
      <div className="mx-auto mt-6 h-11 w-36 rounded-xl bg-white/[.05]" />
    </div>
  </section>
);

const CoreEarGym = dynamic(() => import("@/components/CoreEarGym").then((m) => m.CoreEarGym), { ssr: false, loading: () => <PracticeChunkLoading /> });
const TheoryLab = dynamic(() => import("@/components/TheoryLab").then((m) => m.TheoryLab), { ssr: false, loading: () => <PracticeChunkLoading /> });
const ProArcadeLab = dynamic(() => import("@/components/ProArcadeLab").then((m) => m.ProArcadeLab), { ssr: false, loading: () => <PracticeChunkLoading /> });
const DailyVoicingLab = dynamic(() => import("@/components/DailyVoicingLab").then((m) => m.DailyVoicingLab), { ssr: false, loading: () => <PracticeChunkLoading /> });
const AdaptiveWorkoutLab = dynamic(() => import("@/components/AdaptiveWorkoutLab").then((m) => m.AdaptiveWorkoutLab), { ssr: false, loading: () => <PracticeChunkLoading /> });
const SoundGymLab = dynamic(() => import("@/components/SoundGymLab").then((m) => m.SoundGymLab), { ssr: false, loading: () => <PracticeChunkLoading /> });
const UserAudioLab = dynamic(() => import("@/components/UserAudioLab").then((m) => m.UserAudioLab), { ssr: false, loading: () => <PracticeChunkLoading /> });
const PracticeProfileLab = dynamic(() => import("@/components/PracticeProfileLab").then((m) => m.PracticeProfileLab), { ssr: false, loading: () => <PracticeChunkLoading /> });
const DailyChallengeLab = dynamic(() => import("@/components/DailyChallengeLab").then((m) => m.DailyChallengeLab), { ssr: false, loading: () => <PracticeChunkLoading /> });

type TabId = "today" | "ear" | "lab" | "music" | "progress";
type ViewId =
  | "hub"
  | "workout"
  | "practice"
  | "challenge"
  | "voicing"
  | "soundgym"
  | "core-ear"
  | "pro-arcade"
  | "user-audio"
  | "theory"
  | "profile";

const TABS: Array<{ id: TabId; label: string; icon: typeof Target }> = [
  { id: "today", label: "امروز", icon: Target },
  { id: "ear", label: "گوش", icon: Headphones },
  { id: "lab", label: "آزمایشگاه", icon: AudioWaveform },
  { id: "music", label: "موسیقی", icon: Music2 },
  { id: "progress", label: "پیشرفت", icon: Trophy },
];

function Card({
  title,
  subtitle,
  eyebrow,
  onClick,
  accent = "amber",
}: {
  title: string;
  subtitle: string;
  eyebrow: string;
  onClick: () => void;
  accent?: "amber" | "cyan" | "emerald" | "violet" | "rose";
}) {
  const accents: Record<string, string> = {
    amber: "border-amber-400/20 bg-amber-400/[.04]",
    cyan: "border-cyan-400/20 bg-cyan-400/[.04]",
    emerald: "border-emerald-400/20 bg-emerald-400/[.04]",
    violet: "border-violet-400/20 bg-violet-400/[.04]",
    rose: "border-rose-400/20 bg-rose-400/[.04]",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`card-ay flex w-full items-start gap-3 p-4 text-right transition active:scale-[0.99] sm:p-5 ${accents[accent]}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-medium tracking-wide text-ink-500">{eyebrow}</span>
        <strong className="mt-0.5 block text-[15px] text-sand-50 sm:text-base">{title}</strong>
        <span className="mt-1 block text-[11px] leading-5 text-ink-500 sm:text-xs">{subtitle}</span>
      </span>
      <ChevronLeft className="mt-1 h-4 w-4 shrink-0 text-ink-600" aria-hidden />
    </button>
  );
}

export function PracticeEngine() {
  const [tab, setTab] = useState<TabId>("today");
  const [view, setView] = useState<ViewId>("hub");
  const [status, setStatus] = useState<{ used?: number; dailyLimit?: number; pro?: boolean } | null>(null);

  const open = useCallback((v: ViewId, t?: TabId) => {
    setView(v);
    if (t) setTab(t);
  }, []);

  const goHub = useCallback(() => setView("hub"), []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/practice/status", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setStatus(d);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (view === "workout") return <AdaptiveWorkoutLab mode="workout" onBack={goHub} />;
  if (view === "practice") return <AdaptiveWorkoutLab mode="practice" onBack={goHub} />;
  if (view === "challenge") return <DailyChallengeLab onBack={goHub} />;
  if (view === "voicing") return <DailyVoicingLab onBack={goHub} />;
  if (view === "soundgym") return <SoundGymLab onBack={goHub} />;
  if (view === "core-ear") return <CoreEarGym onBack={goHub} />;
  if (view === "pro-arcade") return <ProArcadeLab onBack={goHub} />;
  if (view === "user-audio") return <UserAudioLab onBack={goHub} />;
  if (view === "theory") return <TheoryLab onBack={goHub} />;
  if (view === "profile") return <PracticeProfileLab onBack={goHub} />;

  return (
    <main className="practice-shell container-ay relative pb-24 pt-6 sm:pb-10 sm:pt-10" dir="rtl">
      <header className="mb-6">
        <p className="text-[11px] font-medium text-amber-300/90">تمرین شنیداری · ArtistYar</p>
        <h1 className="mt-1 text-xl font-semibold text-sand-50 sm:text-2xl">موتور تمرین</h1>
        <p className="mt-2 max-w-xl text-[13px] leading-6 text-ink-500">
          تمرین هدفمند گوش، تئوری و ورک‌اوت روزانه — با پیشرفت تطبیقی و محدودیت رایگان شفاف.
        </p>
      </header>

      <PracticeProBanner onUpgrade={() => open("soundgym", "ear")} />

      <div className="mt-5 space-y-3">
        {tab === "today" && (
          <>
            <Card accent="amber" eyebrow="برنامه امروز" title="ورک‌اوت هوشمند"
              subtitle="برنامهٔ شخصی بر اساس نقاط ضعف — حدود ۱۲ دقیقه" onClick={() => open("workout", "today")} />
            <Card accent="cyan" eyebrow="تمرین آزاد" title="تمرین مهارت"
              subtitle="انتخاب مهارت و سختی · بدون تأثیر روی Skill Rating" onClick={() => open("practice", "ear")} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Card accent="rose" eyebrow="چالش" title="چالش روزانه"
                subtitle="۵ راند ثابت · لیدربورد امروز" onClick={() => open("challenge", "today")} />
              <Card accent="violet" eyebrow="موسیقی" title="وکینگ روزانه"
                subtitle="یک وکینگ پیشرفته · جز تا گاسل" onClick={() => open("voicing", "music")} />
            </div>
          </>
        )}

        {tab === "ear" && (
          <>
            <Card accent="emerald" eyebrow="Arcade · Ear Training" title="باشگاه گوش"
              subtitle="یک بازی واحد با ۶ مهارت: فرکانس، EQ، کمپرسور، استریو، pitch و ریتم · سطح ۱–۵۰"
              onClick={() => open("soundgym", "ear")} />
            <Card accent="cyan" eyebrow="تئوری" title="آزمایشگاه تئوری"
              subtitle="فواصل و آکورد — تمرین شنیداری" onClick={() => open("theory", "music")} />
          </>
        )}

        {tab === "lab" && (
          <>
            <Card accent="violet" eyebrow="آزمایشگاه" title="آپلود و تحلیل ترک"
              subtitle="آپلود ترک · چالش اکولایزر، کمپرسور، ماسکینگ و استریو" onClick={() => open("user-audio", "lab")} />
          </>
        )}

        {tab === "music" && (
          <>
            <Card accent="rose" eyebrow="هارمونی" title="وکینگ روزانه"
              subtitle="آکورد، نت‌ها، کاربرد عملی و پخش" onClick={() => open("voicing", "music")} />
            <Card accent="cyan" eyebrow="تئوری" title="آزمایشگاه تئوری"
              subtitle="فواصل و آکورد — تمرین شنیداری" onClick={() => open("theory", "music")} />
          </>
        )}

        {tab === "progress" && (
          <>
            <Card accent="violet" eyebrow="پروفایل" title="پروفایل تمرین"
              subtitle="امتیاز مهارت، XP، استریک، دستاورد و لیدربورد" onClick={() => open("profile", "progress")} />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="card-ay flex items-center gap-3 p-4">
                <Activity size={18} className="text-amber-300" aria-hidden />
                <div>
                  <p className="text-[11px] text-ink-500">وضعیت امروز</p>
                  <p className="text-sm text-sand-50">{status?.pro ? "نامحدود" : `${status?.used ?? 0} / ${status?.dailyLimit ?? 5}`}</p>
                </div>
              </div>
              <div className="card-ay flex items-center gap-3 p-4">
                <Dumbbell size={18} className="text-cyan-300" aria-hidden />
                <div>
                  <p className="text-[11px] text-ink-500">ورک‌اوت</p>
                  <button type="button" className="text-sm text-sand-50 underline-offset-2 hover:underline" onClick={() => open("workout", "today")}>شروع تمرین هوشمند</button>
                </div>
              </div>
              <div className="card-ay flex items-center gap-3 p-4">
                <LayoutDashboard size={18} className="text-emerald-300" aria-hidden />
                <div>
                  <p className="text-[11px] text-ink-500">چالش</p>
                  <button type="button" className="text-sm text-sand-50 underline-offset-2 hover:underline" onClick={() => open("challenge", "today")}>چالش روزانه</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b0d12]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden" aria-label="ناوبری تمرین">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-0">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 text-[10px] ${active ? "text-amber-200" : "text-ink-500"}`}
                aria-current={active ? "page" : undefined}>
                <Icon size={18} strokeWidth={active ? 2.25 : 1.75} aria-hidden />{t.label}
              </button>
            );
          })}
        </div>
      </nav>
    </main>
  );
}

export default PracticeEngine;
