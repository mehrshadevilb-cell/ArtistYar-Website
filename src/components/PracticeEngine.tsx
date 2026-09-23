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
const TheoryLab = dynamic(() => import("@/components/TheoryLab").then((m) => m.TheoryLab), { ssr: false });
const ProArcadeLab = dynamic(() => import("@/components/ProArcadeLab").then((m) => m.ProArcadeLab), { ssr: false });
const DailyVoicingLab = dynamic(() => import("@/components/DailyVoicingLab").then((m) => m.DailyVoicingLab), { ssr: false });
const AdaptiveWorkoutLab = dynamic(() => import("@/components/AdaptiveWorkoutLab").then((m) => m.AdaptiveWorkoutLab), { ssr: false });
const SoundGymLab = dynamic(() => import("@/components/SoundGymLab").then((m) => m.SoundGymLab), { ssr: false });
const UserAudioLab = dynamic(() => import("@/components/UserAudioLab").then((m) => m.UserAudioLab), { ssr: false });
const PracticeProfileLab = dynamic(() => import("@/components/PracticeProfileLab").then((m) => m.PracticeProfileLab), { ssr: false });
const DailyChallengeLab = dynamic(() => import("@/components/DailyChallengeLab").then((m) => m.DailyChallengeLab), { ssr: false });

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
  { id: "today", label: "امروز", icon: CalendarDays },
  { id: "ear", label: "گوش", icon: Headphones },
  { id: "lab", label: "آزمایشگاه", icon: AudioWaveform },
  { id: "music", label: "موسیقی", icon: Music2 },
  { id: "progress", label: "پیشرفت", icon: Trophy },
];

function Card({
  title, subtitle, eyebrow, onClick, href, accent = "cyan", primary,
}: {
  title: string; subtitle: string; eyebrow: string; onClick?: () => void; href?: string;
  accent?: "cyan" | "amber" | "rose" | "violet" | "emerald" | "gold"; primary?: boolean;
}) {
  const accents: Record<string, string> = {
    cyan: "border-cyan-400/25 bg-cyan-400/5",
    amber: "border-amber-400/25 bg-amber-400/5",
    rose: "border-rose-400/25 bg-rose-400/5",
    violet: "border-violet-400/25 bg-violet-400/5",
    emerald: "border-emerald-400/25 bg-emerald-400/5",
    gold: "border-amber-300/25 bg-amber-300/5",
  };
  const cls = `card-ay flex w-full items-start gap-3 p-4 text-right transition active:scale-[0.99] sm:p-5 ${
    primary ? "border-amber-400/40 shadow-[0_0_0_1px_rgba(251,191,36,0.12)]" : accents[accent]
  }`;
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-medium tracking-wide text-ink-500">{eyebrow}</span>
        <strong className="mt-0.5 block text-[15px] text-sand-50 sm:text-base">{title}</strong>
        <span className="mt-1 block text-[11px] leading-5 text-ink-500 sm:text-xs">{subtitle}</span>
      </span>
      <ChevronLeft className="mt-1 h-4 w-4 shrink-0 text-ink-600" aria-hidden />
    </>
  );
  if (href) return <a href={href} className={cls}>{body}</a>;
  return <button type="button" className={cls} onClick={onClick}>{body}</button>;
}

export default function PracticeEngine() {
  const [tab, setTab] = useState<TabId>("today");
  const [view, setView] = useState<ViewId>("hub");
  const [status, setStatus] = useState<{ pro?: boolean; remaining?: number | null; used?: number; dailyLimit?: number } | null>(null);

  useEffect(() => {
    void fetch("/api/practice/status", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok || d?.pro != null) {
          setStatus({ pro: Boolean(d.pro ?? d.unlimited), remaining: d.remaining ?? null, used: d.used, dailyLimit: d.dailyLimit ?? 5 });
        }
      })
      .catch(() => undefined);
  }, [view]);

  const goHub = useCallback(() => setView("hub"), []);
  const open = useCallback((v: ViewId, t?: TabId) => { setView(v); if (t) setTab(t); }, []);

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
    <main className="practice-shell container-ay relative pb-28 pt-6 sm:pb-16 sm:pt-10" dir="rtl">
      <div className="route-ambient route-ambient-one pointer-events-none" aria-hidden />
      <header className="mb-6 sm:mb-8">
        <p className="text-[11px] font-medium text-amber-300/90">تمرین‌خانه آرتیست‌یار</p>
        <h1 className="mt-1 text-xl font-semibold text-sand-50 sm:text-2xl">گوش قوی‌تر، تصمیم دقیق‌تر</h1>
        <p className="mt-2 max-w-xl text-[13px] leading-6 text-ink-500 sm:text-sm">
          هر روز چند دقیقه تمرین هدفمند — فرکانس، اکولایزر، کمپرسور، فضا و تصمیم میکس.
        </p>
        {status && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-ink-400">
            {status.pro ? (
              <span className="text-emerald-300">اشتراک فعال · تمرین نامحدود</span>
            ) : (
              <span>رایگان: {status.remaining ?? "—"} از {status.dailyLimit ?? 5} مرحله امروز باقی مانده</span>
            )}
          </p>
        )}
      </header>

      <nav className="mb-6 hidden gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1 sm:flex" aria-label="بخش‌های تمرین">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs transition ${
                active ? "bg-white/10 text-sand-50" : "text-ink-500 hover:text-ink-300"
              }`} aria-current={active ? "page" : undefined}>
              <Icon size={14} aria-hidden />{t.label}
            </button>
          );
        })}
      </nav>

      <PracticeProBanner onUpgrade={() => open("pro-arcade", "ear")} />

      <div className="mt-5 space-y-4">
        {tab === "today" && (
          <>
            <Card primary accent="amber" eyebrow="پیشنهاد امروز" title="تمرین هوشمند امروز"
              subtitle="برنامهٔ شخصی بر اساس نقاط ضعف — حدود ۱۲ دقیقه" onClick={() => open("workout", "today")} />
            <Card accent="cyan" eyebrow="بدون امتیاز مهارت" title="تمرین آزاد"
              subtitle="انتخاب مهارت و سختی · بدون تأثیر روی Skill Rating" onClick={() => open("practice", "ear")} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Card accent="rose" eyebrow="یک‌بار در روز" title="چالش روزانه"
                subtitle="۵ راند ثابت · لیدربورد امروز" onClick={() => open("challenge", "today")} />
              <Card accent="gold" eyebrow="هارمونی" title="وکینگ امروز"
                subtitle="یک وکینگ پیشرفته · جز تا گاسل" onClick={() => open("voicing", "music")} />
            </div>
            <p className="px-1 text-[11px] text-ink-500">مسیر پیشنهادی: گوش بده → تصمیم بگیر → نتیجه را ببین → یاد بگیر</p>
          </>
        )}

        {tab === "ear" && (
          <>
            <Card accent="emerald" eyebrow="تمرین‌های اصلی گوش" title="باشگاه گوش (SoundGym)"
              subtitle="فرکانس، اکولایزر، فیلتر، کمپرسور، پن، عرض استریو و بیشتر" onClick={() => open("soundgym", "ear")} />
            <Card accent="cyan" eyebrow="۱۰ دقیقه · تطبیقی" title="تمرین پایه گوش"
              subtitle="فرکانس · اکولایزر · کمپرسور · فاز با سختی شخصی" onClick={() => open("core-ear", "ear")} />
            <Card accent="gold" eyebrow="مهارت حرفه‌ای" title="تمرین پیشرفته صدا"
              subtitle="ریورب، سچوریشن، ماسکینگ، ترنزینت — رایگان محدود / پرو نامحدود" onClick={() => open("pro-arcade", "ear")} />
          </>
        )}

        {tab === "lab" && (
          <>
            <Card accent="violet" eyebrow="فایل خودت" title="آزمایشگاه صوت شخصی"
              subtitle="آپلود ترک · چالش اکولایزر، کمپرسور، ماسکینگ و استریو" onClick={() => open("user-audio", "lab")} />
            <Card accent="cyan" eyebrow="تحلیل" title="تحلیلگر موسیقی"
              subtitle="آپلود · پیک/RMS · پیشنهاد تنظیم · مقایسه با رفرنس" href="/music-analyzer" />
            <Card accent="emerald" eyebrow="جداسازی" title="جداسازی وکال"
              subtitle="استخراج وکال از میکس در مرورگر" href="/separate" />
          </>
        )}

        {tab === "music" && (
          <>
            <Card accent="gold" eyebrow="روزانه" title="وکینگ امروز"
              subtitle="آکورد، نت‌ها، کاربرد عملی و پخش" onClick={() => open("voicing", "music")} />
            <Card accent="violet" eyebrow="هارمونی" title="آزمایشگاه تئوری"
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
