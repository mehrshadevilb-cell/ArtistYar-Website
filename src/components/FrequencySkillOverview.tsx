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
}: {
  skill: HearingSkill;
  masteryStage?: string;
  reasonFa?: string;
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
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.06]">
          <div
            className="h-full rounded-full bg-cyan-400/70"
            style={{ width: `${Math.max(4, Math.min(100, skill.value))}%` }}
          />
        </div>
      )}
      <p className="mt-2 text-[10px] leading-5 text-ink-500">
        {lowConfidence
          ? "پس از چند راند حافظهٔ فرکانس، روند شخصی نمایش داده می‌شود."
          : reasonFa || `اطمینان ${skill.confidence}% · ${skill.sampleCount} نمونه`}
      </p>
    </div>
  );
}

/** Phase 8–10 UX — personal hearing skills, mastery stages, coach guidance. No rankings. */
export function FrequencySkillOverview({
  profile,
  effectiveness,
  curriculumFeedbackFa,
  sessionPlan,
}: Props) {
  if (!profile) return null;

  const mastery: MasteryProfile | null = profile.enoughEvidence
    ? computeMasteryProfile(profile)
    : null;

  const skills: HearingSkill[] = [
    profile.precision,
    profile.consistency,
    profile.difficultyTolerance,
    profile.rangeHandling,
  ];

  const masteryMap = mastery
    ? {
        precision: mastery.precision,
        consistency: mastery.consistency,
        difficultyTolerance: mastery.difficultyTolerance,
        rangeHandling: mastery.rangeHandling,
      }
    : null;

  return (
    <section className="card-ay space-y-4 p-5" dir="rtl">
      <div>
        <p className="text-[11px] font-medium tracking-wide text-cyan-300/90">مهارت‌های شنوایی</p>
        <h3 className="mt-1 text-lg text-sand-50">حافظهٔ فرکانس · پیشرفت شخصی</h3>
        <p className="mt-1 text-[12px] leading-6 text-ink-500">
          هر مهارت مستقل است — بدون رتبه و بدون مقایسه با دیگران.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {skills.map((s) => {
          const m = masteryMap?.[s.key as keyof typeof masteryMap];
          return (
            <SkillRow
              key={s.key}
              skill={s}
              masteryStage={m ? masteryStageFa(m.stage) : undefined}
              reasonFa={m?.reasonFa}
            />
          );
        })}
      </div>

      {sessionPlan && (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] p-3 text-[12px] leading-6 text-ink-400">
          <p className="text-[11px] text-cyan-300/90">برنامهٔ پیشنهادی جلسه</p>
          <p className="mt-1 text-sand-100">{sessionPlan.summaryFa}</p>
          {sessionPlan.isPersonalized && (
            <p className="mt-1 text-[11px] text-ink-500">
              ساختار: {sessionPlan.structureFa}
              {sessionPlan.goalFa ? ` · هدف: ${sessionPlan.goalFa}` : ""}
            </p>
          )}
          {sessionPlan.avoidFa && (
            <p className="mt-1 text-[11px] text-ink-600">{sessionPlan.avoidFa}</p>
          )}
          <p className="mt-1 text-[10px] text-ink-600">پیشنهاد است — می‌توانی آزاد تمرین کنی.</p>
        </div>
      )}

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
