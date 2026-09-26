"use client";

import type {
  FrequencySkillProfile,
  HearingSkill,
  TrainingEffectiveness,
  MasteryProfile,
  SessionPlan,
} from "@/lib/practice-game/frequency-mastery";
import {
  skillTitleFa,
  trendLabelFa,
  masteryStageFa,
  computeMasteryProfile,
} from "@/lib/practice-game/frequency-mastery";

type Props = {
  profile?: FrequencySkillProfile | null;
  effectiveness?: TrainingEffectiveness | null;
  curriculumFeedbackFa?: string | null;
  sessionPlan?: SessionPlan | null;
};

function SkillRow({
  skill,
  masteryStage,
  reasonFa,
  rich,
}: {
  skill: HearingSkill;
  masteryStage?: string;
  reasonFa?: string;
  rich?: boolean;
}) {
  const title = skillTitleFa(skill.key);
  const trend = trendLabelFa(skill.trend);
  const lowConfidence = skill.confidence < 35 || skill.sampleCount < 4;
  const stageLabel = masteryStage || (lowConfidence ? "داده ناکافی" : trend);
  return (
    <div className="rounded-xl border border-white/[.07] bg-white/[.02] px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-sand-100">{title}</p>
        <span
          className={`text-[11px] ${
            lowConfidence
              ? "text-ink-500"
              : skill.trend === "improving"
                ? "text-emerald-300/90"
                : skill.trend === "limited"
                  ? "text-amber-200/80"
                  : "text-ink-500"
          }`}
        >
          {stageLabel}
        </span>
      </div>
      {!lowConfidence && (
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.06]"
          role="progressbar"
          aria-valuenow={Math.round(skill.value)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={title}
        >
          <div
            className="h-full rounded-full bg-cyan-400/70 motion-reduce:transition-none"
            style={{ width: `${Math.max(4, Math.min(100, skill.value))}%` }}
          />
        </div>
      )}
      <p className="mt-2 text-[10px] leading-5 text-ink-500">
        {lowConfidence
          ? "پس از چند راند حافظهٔ فرکانس، روند شخصی نمایش داده می‌شود."
          : rich
            ? reasonFa || `اطمینان ${skill.confidence}% · ${skill.sampleCount} نمونه · ${trend}`
            : reasonFa || `اطمینان ${skill.confidence}%`}
      </p>
    </div>
  );
}

/**
 * Phase 8–10.5 UX — progressive disclosure.
 * Beginner: simple start message.
 * Returning: focus + skills + plan.
 * Advanced: mastery stages + trends + effectiveness.
 * No rankings.
 */
export function FrequencySkillOverview({
  profile,
  effectiveness,
  curriculumFeedbackFa,
  sessionPlan,
}: Props) {
  // Beginner / no data — keep UI simple
  if (!profile || !profile.enoughEvidence) {
    return (
      <section className="card-ay space-y-3 p-5" dir="rtl">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-cyan-300/90">مهارت‌های شنوایی</p>
          <h3 className="mt-1 text-lg text-sand-50">حافظهٔ فرکانس</h3>
        </div>
        <p className="text-[13px] leading-7 text-ink-400">تمرین را شروع کنید تا پروفایل شنیداری شکل بگیرد.</p>
        {curriculumFeedbackFa ? (
          <p className="text-[12px] leading-6 text-ink-500">{curriculumFeedbackFa}</p>
        ) : null}
      </section>
    );
  }

  const mastery: MasteryProfile = computeMasteryProfile(profile);
  const skills: HearingSkill[] = [
    profile.precision,
    profile.consistency,
    profile.difficultyTolerance,
    profile.rangeHandling,
  ];
  const rich =
    profile.overallSamples >= 20 &&
    skills.some((s) => s.confidence >= 55);

  const masteryMap = {
    precision: mastery.precision,
    consistency: mastery.consistency,
    difficultyTolerance: mastery.difficultyTolerance,
    rangeHandling: mastery.rangeHandling,
  };

  return (
    <section className="card-ay space-y-4 p-5" dir="rtl">
      <div>
        <p className="text-[11px] font-medium tracking-wide text-cyan-300/90">مهارت‌های شنوایی · پیشرفت شخصی</p>
        <h3 className="mt-1 text-lg text-sand-50">حافظهٔ فرکانس</h3>
        <p className="mt-1 text-[12px] leading-6 text-ink-500">
          هر مهارت مستقل است — بدون رتبه و بدون مقایسه با دیگران.
        </p>
      </div>

      {sessionPlan && (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] p-3 text-[12px] leading-6 text-ink-400">
          <p className="text-[11px] text-cyan-300/90">
            {sessionPlan.isPersonalized ? "تمرکز امروز · تمرین پیشنهادی" : "تمرین پیشنهادی"}
          </p>
          <p className="mt-1 text-sand-100">{sessionPlan.summaryFa}</p>
          {sessionPlan.isPersonalized && (
            <p className="mt-1 text-[11px] text-ink-500">
              ساختار: {sessionPlan.structureFa}
              {sessionPlan.goalFa ? ` · هدف: ${sessionPlan.goalFa}` : ""}
            </p>
          )}
          {rich && sessionPlan.avoidFa ? (
            <p className="mt-1 text-[11px] text-ink-600">{sessionPlan.avoidFa}</p>
          ) : null}
          <p className="mt-1 text-[10px] text-ink-600">پیشنهاد است — می‌توانی آزاد تمرین کنی.</p>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {skills.map((s) => {
          const m = masteryMap[s.key as keyof typeof masteryMap];
          return (
            <SkillRow
              key={s.key}
              skill={s}
              masteryStage={m ? masteryStageFa(m.stage) : undefined}
              reasonFa={m?.reasonFa}
              rich={rich}
            />
          );
        })}
      </div>

      {effectiveness?.enoughEvidence && (
        <div className="rounded-xl border border-white/[.07] bg-white/[.02] p-3 text-[12px] leading-6 text-ink-400">
          <p className="text-[11px] text-sand-200">اثر تمرین</p>
          <p className="mt-1">{effectiveness.summaryFa}</p>
          <p className="mt-1 text-[11px] text-ink-500">{effectiveness.guidanceFa}</p>
        </div>
      )}

      {curriculumFeedbackFa && !effectiveness?.enoughEvidence && (
        <p className="text-[12px] leading-6 text-ink-500">{curriculumFeedbackFa}</p>
      )}
    </section>
  );
}
