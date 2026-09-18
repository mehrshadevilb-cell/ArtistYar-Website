"use client";

import { useState } from "react";
import {
  Ear,
  FileAudio,
  Gamepad2,
  Sparkles,
  Target,
} from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { PracticeProgressPanel } from "@/components/PracticeProgressPanel";
import { TheoryLab } from "@/components/TheoryLab";
import { SkillEngineDashboard } from "@/components/SkillEngineDashboard";
import { PracticeProBanner } from "@/components/PracticeProBanner";
import { ProArcadeLab } from "@/components/ProArcadeLab";
import { DailyVoicingLab } from "@/components/DailyVoicingLab";
import { MixAnalyzerLab } from "@/components/MixAnalyzerLab";

type GameId = "hub" | "theory" | "pro-arcade" | "voicing" | "personal" | "analyze";

export default function PracticeEngine() {
  const [active, setActive] = useState<GameId>("hub");

  return (
    <main className="container-ay relative py-12 sm:py-16">
      <div className="route-ambient route-ambient-one" aria-hidden="true" />
      <SectionHeading
        eyebrow="PRACTICE ENGINE · SOUNDGYM-CLASS"
        title="تمرین شنیداری حرفه‌ای تا Level ۵۰۰"
        subtitle="تئوری، Pro Arcade، Voicing و تحلیل میکس شبیه Reference 3 — EQ، کمپرس، لیمیت و roadmap."
      />
      <SkillEngineDashboard />

      {active === "hub" && (
        <div className="mt-10 space-y-6">
          <PracticeProBanner onUpgrade={() => setActive("pro-arcade")} />

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="card-ay flex items-center gap-4 border-cyan-400/25 p-5 text-right"
              onClick={() => setActive("analyze")}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                <Target size={22} />
              </span>
              <span className="flex-1">
                <span className="eyebrow">REFERENCE-STYLE</span>
                <strong className="mt-1 block text-sand-50">تحلیل میکس · Mix Analyzer</strong>
                <span className="text-xs text-ink-500">EQ curve · Compress · Limit · Roadmap</span>
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
                <span className="eyebrow">PRO</span>
                <strong className="mt-1 block text-sand-50">Professional Audio Skills</strong>
                <span className="text-xs text-ink-500">Reverb · Saturation · Masking · Transient</span>
              </span>
            </button>
            <button type="button" className="card-ay flex items-center gap-4 p-5 text-right" onClick={() => setActive("theory")}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300">
                <Sparkles size={22} />
              </span>
              <span className="flex-1">
                <span className="eyebrow">HARMONY</span>
                <strong className="mt-1 block text-sand-50">Theory Lab</strong>
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
            <a href="/practice/analyze" className="card-ay flex items-center gap-4 p-5 text-right">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                <Ear size={22} />
              </span>
              <span className="flex-1">
                <span className="eyebrow">DIRECT</span>
                <strong className="mt-1 block text-sand-50">صفحه مستقیم تحلیل</strong>
                <span className="text-xs text-ink-500">/practice/analyze</span>
              </span>
            </a>
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

      {active === "theory" && <TheoryLab onBack={() => setActive("hub")} />}
      {active === "voicing" && <DailyVoicingLab onBack={() => setActive("hub")} />}
      {active === "pro-arcade" && <ProArcadeLab onBack={() => setActive("hub")} />}
      {active === "analyze" && <MixAnalyzerLab onBack={() => setActive("hub")} />}
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
