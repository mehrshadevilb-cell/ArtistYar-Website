"use client";

import type {
  FrequencySkillProfile,
  HearingSkill,
  TrainingEffectiveness,
} from "@/lib/practice-game/frequency-mastery";
import { skillTitleFa, trendLabelFa } from "@/lib/practice-game/frequency-mastery";

type Props = {
  profile?: FrequencySkillProfile | null;
  effectiveness?: TrainingEffectiveness | null;
  curriculumFeedbackFa?: string | null;
};

function SkillRow({ skill }: { skill: HearingSkill }) {
  const title = skillTitleFa(skill.key);
  const trend = trendLabelFa(skill.trend);
  const lowConfidence = skill.confidence < 35 || skill.sampleCount < 4;
  return (
    <div className="rounded-xl border border-white/[.07] bg-white/[.02] px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <strong className="text-sm text-sand-100">{title}</strong>
        <span
          className={`text-[11px] font-medium ${
            skill.trend === "improving"
              ? "text-emerald-300"
              : skill.trend === "limited"
                ? "text-amber-300"
                : skill.trend === "stable"
                  ? "text-cyan-300/90"
                  : "text-ink-500"
          }`}
        >
          {lowConfidence ? "داده ناکافی" : trend}
        </span>
      </div>
      {!lowConfidence && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.07]">
          <div
            className="h-full rounded-full bg-cyan-400/80 transition-[width]"
            style={{ width: `${Math.max(4, Math.min(100, skill.value))}%` }}
            aria-hidden
          />
        </div>
      )}
      <p className="mt-2 text-[10px] leading-5 text-ink-500">
        {lowConfidence
          ? "پس از چند راند حافظهٔ فرکانس، روند شخصی نمایش داده می‌شود."
          : `اطمینان ${skill.confidence}% · ${skill.sampleCount} نمونه`}
      </p>
    </div>
  );
}

/** Phase 8 UX — personal hearing abilities. No rankings or comparisons. */
export function FrequencySkillOverview({ profile, effectiveness, curriculumFeedbackFa }: Props) {
  if (!profile) return null;
  const skills: HearingSkill[] = [
    profile.precision,
    profile.consistency,
    profile.difficultyTolerance,
    profile.rangeHandling,
  ];
  return (
    <section className="card-ay space-y-4 p-5" dir="rtl">
      <div>
        <p className="text-[11px] font-medium tracking-wide text-cyan-300/90">توانایی‌های شنوایی</p>
        <h3 className="mt-1 text-lg text-sand-50">حافظهٔ فرکانس · مهارت‌های جداگانه</h3>
        <p className="mt-1 text-[12px] leading-6 text-ink-500">
          هر مهارت فقط پیشرفت شخصی شماست — بدون رتبه و بدون مقایسه با دیگران.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {skills.map((s) => (
          <SkillRow key={s.key} skill={s} />
        ))}
      </div>
      {(curriculumFeedbackFa || effectiveness) && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[12px] leading-6 text-ink-400">
          {curriculumFeedbackFa ? (
            <p>{curriculumFeedbackFa}</p>
          ) : effectiveness && !effectiveness.enoughEvidence ? (
            <p>{effectiveness.summaryFa}</p>
          ) : effectiveness ? (
            <p>
              {effectiveness.summaryFa} {effectiveness.guidanceFa}
            </p>
          ) : null}
          {effectiveness?.enoughEvidence && (
            <p className="mt-1 text-[10px] text-ink-600">
              بر اساس {effectiveness.sessionsCompared} جلسه · اطمینان {effectiveness.confidence}%
            </p>
          )}
        </div>
      )}
    </section>
  );
}
