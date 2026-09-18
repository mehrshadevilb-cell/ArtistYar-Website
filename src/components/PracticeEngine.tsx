"use client";

import { useState } from "react";
import {
  FileAudio,
  Gamepad2,
  Sparkles,
} from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { PracticeProgressPanel } from "@/components/PracticeProgressPanel";
import { TheoryLab } from "@/components/TheoryLab";
import { SkillEngineDashboard } from "@/components/SkillEngineDashboard";
import { PracticeProBanner } from "@/components/PracticeProBanner";
import { ProArcadeLab } from "@/components/ProArcadeLab";
import { DailyVoicingLab } from "@/components/DailyVoicingLab";
import { CoreEarGym } from "@/components/CoreEarGym";
import { AudioWaveform } from "lucide-react";

type GameId = "hub" | "core-ear" | "theory" | "pro-arcade" | "voicing" | "personal";

export default function PracticeEngine() {
  const [active, setActive] = useState<GameId>("hub");

  return (
    <main className="container-ay relative py-12 sm:py-16">
      <div className="route-ambient route-ambient-one" aria-hidden="true" />
      <SectionHeading
        eyebrow="موتور تمرین · سطح حرفه‌ای"
        title="تمرین شنیداری حرفه‌ای تا Level ۵۰۰"
        subtitle="تئوری، Pro Arcade، Voicing و تحلیل میکس و تنظیم — EQ، کمپرس، لیمیت و roadmap."
      />
      <SkillEngineDashboard />

      {active === "hub" && (
        <div className="mt-10 space-y-6">
          <PracticeProBanner onUpgrade={() => setActive("pro-arcade")} />

          <div className="grid gap-3 sm:grid-cols-2">
            <a href="/music-analyzer" className="card-ay flex items-center gap-4 border-cyan-400/25 p-5 text-right">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                <AudioWaveform size={22} />
              </span>
              <span className="flex-1">
                <span className="eyebrow">تحلیل صوتی · سبک رفرنس</span>
                <strong className="mt-1 block text-sand-50">تحلیلگر موسیقی</strong>
                <span className="text-xs text-ink-500">آپلود فایل · میکس + تنظیم · Peak/RMS · AI و roadmap</span>
              </span>
            </a>

            <button
              type="button"
              className="card-ay flex items-center gap-4 border-cyan-400/20 p-5 text-right"
              onClick={() => setActive("core-ear")}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                <AudioWaveform size={22} />
              </span>
              <span className="flex-1">
                <span className="eyebrow">ADAPTIVE · ۱۰ دقیقه</span>
                <strong className="mt-1 block text-sand-50">Core Ear Gym</strong>
                <span className="text-xs text-ink-500">Frequency · EQ · Compression · Phase با سختی شخصی</span>
              </span>
            </button>

            <button
              type="button"
              className="card-ay flex items-center gap-4 border-gold-400/20 p-5 text-right"
              onClick={() => setActive("pro-arcade")}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400/10 text-gold-300">
                <Gamepad2 size={22} />
              </span>
              <span className="flex-1">
                <span className="eyebrow">تمرین</span>
                <strong className="mt-1 block text-sand-50">مهارت‌های حرفه‌ای صدا</strong>
                <span className="text-xs text-ink-500">۵ مرحله رایگان · Pro: بدون محدودیت تا پایان اشتراک</span>
              </span>
            </button>
            <button type="button" className="card-ay flex items-center gap-4 p-5 text-right" onClick={() => setActive("theory")}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300">
                <Sparkles size={22} />
              </span>
              <span className="flex-1">
                <span className="eyebrow">هارمونی</span>
                <strong className="mt-1 block text-sand-50">آزمایشگاه تئوری</strong>
              </span>
            </button>
            <button
              type="button"
              className="card-ay flex items-center gap-4 border-gold-400/15 p-5 text-right"
              onClick={() => setActive("voicing")}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400/10 text-gold-300">
                <Sparkles size={22} />
              </span>
              <span className="flex-1">
                <span className="eyebrow">PRO</span>
                <strong className="mt-1 block text-sand-50">Voicing روزانه</strong>
              </span>
            </button>
            <button type="button" className="card-ay flex items-center gap-4 p-5 text-right" onClick={() => setActive("personal")}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                <FileAudio size={22} />
              </span>
              <span className="flex-1">
                <span className="eyebrow">A/B</span>
                <strong className="mt-1 block text-sand-50">تمرین شخصی</strong>
              </span>
            </button>
          </div>

          <PracticeProgressPanel />
        </div>
      )}

      {active === "core-ear" && <CoreEarGym onBack={() => setActive("hub")} />}
      {active === "theory" && <TheoryLab onBack={() => setActive("hub")} />}
      {active === "voicing" && <DailyVoicingLab onBack={() => setActive("hub")} />}
      {active === "pro-arcade" && <ProArcadeLab onBack={() => setActive("hub")} />}
      {active === "personal" && (
        <section className="mt-10">
          <button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={() => setActive("hub")}>
            بازگشت
          </button>
          <div className="card-ay mt-5 p-8 text-center">
            <FileAudio className="mx-auto text-emerald-300" size={34} />
            <h2 className="mt-4 text-xl text-sand-50">تمرین شخصی A/B</h2>
            <p className="mt-3 text-sm leading-8 text-ink-400">آپلود فایل برای مقایسه قبل/بعد به‌زودی کامل می‌شود.</p>
          </div>
        </section>
      )}
    </main>
  );
}
