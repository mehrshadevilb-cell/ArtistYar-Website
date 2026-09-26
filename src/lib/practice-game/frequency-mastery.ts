/**
 * Phase 7.5 + Phase 8 — Frequency Memory training effectiveness + skill mastery.
 * Authority: Recommendation=suggestion, Training plan=guidance, Adaptive=difficulty.
 * No global ranking. Skills are personal dimensions with confidence gates.
 */
import { clamp } from "./difficulty";

export type HearingSkillKey = "precision" | "consistency" | "rangeHandling" | "difficultyTolerance";
export type SkillTrend = "improving" | "stable" | "limited" | "unknown";
export type HearingSkill = { key: HearingSkillKey; value: number; confidence: number; trend: SkillTrend; sampleCount: number };
export type FrequencySkillProfile = {
  precision: HearingSkill; consistency: HearingSkill; rangeHandling: HearingSkill;
  difficultyTolerance: HearingSkill; overallSamples: number; enoughEvidence: boolean;
};
export type TrainingFocus = "precision" | "consistency" | "difficulty" | "range" | "general";
export type TrainingContext = {
  focus: TrainingFocus; confidence: number; suggestedRounds: number;
  difficultyStart: number; difficultyEnd: number; sessionId: string;
  avgAccuracy?: number; avgErrorHz?: number | null; errorVariance?: number | null;
};
export type TrainingEffectiveness = {
  focus: TrainingFocus; sessionsCompared: number; confidence: number; enoughEvidence: boolean;
  precisionDelta: number | null; consistencyDelta: number | null; difficultyToleranceDelta: number | null;
  summaryFa: string; guidanceFa: string;
};
export type FreqEventSample = {
  accuracy: number; correct: boolean; difficulty: number; level?: number;
  responseTimeMs?: number | null; errorHz?: number | null; targetHz?: number | null;
  guessHz?: number | null; createdAt?: string; sessionId?: string | null; focus?: TrainingFocus | null;
};

const MIN_SAMPLES_SKILL = 6;
const MIN_SESSIONS_EFFECT = 3;
const RECENT_WINDOW = 20;
const PRIOR_WINDOW = 20;

function trendFromDelta(delta: number, confidence: number): SkillTrend {
  if (confidence < 35) return "unknown";
  if (delta >= 6) return "improving";
  if (delta <= -6) return "limited";
  return "stable";
}
function mean(nums: number[]) { return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0; }
function variance(nums: number[]) {
  if (nums.length < 2) return 0;
  const m = mean(nums);
  return mean(nums.map((n) => (n - m) ** 2));
}
function extractErrorHz(s: FreqEventSample): number | null {
  if (typeof s.errorHz === "number" && Number.isFinite(s.errorHz)) return Math.abs(s.errorHz);
  if (typeof s.targetHz === "number" && typeof s.guessHz === "number" && s.targetHz > 0 && s.guessHz > 0)
    return Math.abs(s.guessHz - s.targetHz);
  if (Number.isFinite(s.accuracy) && s.accuracy > 0) return clamp(120 * (1 - s.accuracy / 100), 4, 200);
  return null;
}
function bandOfHz(hz: number): "low" | "mid" | "high" {
  if (hz < 250) return "low";
  if (hz < 2000) return "mid";
  return "high";
}
function scorePrecision(samples: FreqEventSample[]) {
  if (!samples.length) return { value: 0, confidence: 0 };
  const errors = samples.map(extractErrorHz).filter((n): n is number => n != null);
  const acc = mean(samples.map((s) => clamp(s.accuracy, 0, 100)));
  let errorScore = acc;
  if (errors.length >= 3) errorScore = clamp(100 * (1 - mean(errors) / 90), 0, 100);
  return {
    value: Math.round(errorScore * 0.65 + acc * 0.35),
    confidence: clamp(20 + samples.length * 4 + (errors.length >= 3 ? 15 : 0), 0, 100),
  };
}
function scoreConsistency(samples: FreqEventSample[]) {
  if (samples.length < 2) return { value: 0, confidence: 0 };
  const accs = samples.map((s) => clamp(s.accuracy, 0, 100));
  return {
    value: Math.round(clamp(100 - Math.sqrt(variance(accs)) * 2.8, 0, 100)),
    confidence: clamp(15 + samples.length * 5, 0, 100),
  };
}
function scoreRangeHandling(samples: FreqEventSample[]) {
  const withHz = samples.filter((s) => typeof s.targetHz === "number" && (s.targetHz as number) > 0);
  if (withHz.length < 4) {
    const acc = samples.length ? mean(samples.map((s) => clamp(s.accuracy, 0, 100))) : 0;
    return { value: Math.round(acc * 0.5), confidence: clamp(samples.length * 2, 0, 25) };
  }
  const buckets: Record<"low" | "mid" | "high", number[]> = { low: [], mid: [], high: [] };
  for (const s of withHz) buckets[bandOfHz(s.targetHz as number)].push(clamp(s.accuracy, 0, 100));
  const bandMeans = (["low", "mid", "high"] as const)
    .map((b) => (buckets[b].length ? mean(buckets[b]) : null))
    .filter((n): n is number => n != null);
  if (!bandMeans.length) return { value: 0, confidence: 10 };
  const overall = mean(bandMeans);
  const spread = bandMeans.length > 1 ? Math.sqrt(variance(bandMeans)) : 0;
  return {
    value: Math.round(clamp(overall - spread * 0.6, 0, 100)),
    confidence: clamp(20 + withHz.length * 3 + (bandMeans.length === 3 ? 20 : bandMeans.length * 5), 0, 100),
  };
}
function scoreDifficultyTolerance(samples: FreqEventSample[]) {
  if (samples.length < 4) return { value: 0, confidence: clamp(samples.length * 5, 0, 20) };
  const sorted = [...samples].sort((a, b) => (a.difficulty || 0) - (b.difficulty || 0));
  const third = Math.max(1, Math.floor(sorted.length / 3));
  const lowAcc = mean(sorted.slice(0, third).map((s) => clamp(s.accuracy, 0, 100)));
  const highAcc = mean(sorted.slice(-third).map((s) => clamp(s.accuracy, 0, 100)));
  const avgDiff = mean(samples.map((s) => clamp(s.difficulty || 0, 0, 500)));
  const retention = clamp(100 - Math.max(0, lowAcc - highAcc) * 1.4, 0, 100);
  return {
    value: Math.round(clamp(retention * 0.75 + highAcc * 0.15 + clamp(avgDiff / 5, 0, 30) * 0.1, 0, 100)),
    confidence: clamp(20 + samples.length * 3 + (avgDiff > 80 ? 10 : 0), 0, 100),
  };
}
function buildSkill(
  key: HearingSkillKey,
  recent: FreqEventSample[],
  prior: FreqEventSample[],
  scoreFn: (s: FreqEventSample[]) => { value: number; confidence: number },
): HearingSkill {
  const now = scoreFn(recent);
  const before = prior.length >= MIN_SAMPLES_SKILL / 2 ? scoreFn(prior) : null;
  const delta = before ? now.value - before.value : 0;
  return {
    key, value: Math.round(now.value), confidence: Math.round(now.confidence),
    trend: before ? trendFromDelta(delta, Math.min(now.confidence, before.confidence)) : "unknown",
    sampleCount: recent.length,
  };
}

export function computeFrequencySkillProfile(events: FreqEventSample[]): FrequencySkillProfile {
  const ordered = [...events].sort((a, b) => (b.createdAt ? Date.parse(b.createdAt) : 0) - (a.createdAt ? Date.parse(a.createdAt) : 0));
  const recent = ordered.slice(0, RECENT_WINDOW);
  const prior = ordered.slice(RECENT_WINDOW, RECENT_WINDOW + PRIOR_WINDOW);
  return {
    precision: buildSkill("precision", recent, prior, scorePrecision),
    consistency: buildSkill("consistency", recent, prior, scoreConsistency),
    rangeHandling: buildSkill("rangeHandling", recent, prior, scoreRangeHandling),
    difficultyTolerance: buildSkill("difficultyTolerance", recent, prior, scoreDifficultyTolerance),
    overallSamples: ordered.length,
    enoughEvidence: ordered.length >= MIN_SAMPLES_SKILL,
  };
}

export function suggestTrainingFocus(profile: FrequencySkillProfile): { focus: TrainingFocus; confidence: number; reasonFa: string } {
  if (!profile.enoughEvidence) {
    return { focus: "general", confidence: profile.overallSamples * 8, reasonFa: "هنوز داده کافی نیست؛ چند جلسهٔ عمومی تمرین کن." };
  }
  const skills = [profile.precision, profile.consistency, profile.difficultyTolerance, profile.rangeHandling].filter((s) => s.confidence >= 30);
  if (!skills.length) return { focus: "general", confidence: 20, reasonFa: "شروع با تمرین عمومی." };
  const weakest = [...skills].sort((a, b) => a.value - b.value || a.confidence - b.confidence)[0];
  const focusMap: Record<HearingSkillKey, TrainingFocus> = {
    precision: "precision", consistency: "consistency", difficultyTolerance: "difficulty", rangeHandling: "range",
  };
  const labels: Record<HearingSkillKey, string> = {
    precision: "دقت تشخیص", consistency: "پایداری پاسخ‌ها",
    difficultyTolerance: "توانایی در سختی بالاتر", rangeHandling: "پوشش محدودهٔ فرکانس",
  };
  return {
    focus: focusMap[weakest.key],
    confidence: Math.round(Math.min(weakest.confidence, 85)),
    reasonFa: `تمرکز پیشنهادی: ${labels[weakest.key]} (راهنما، نه اجبار).`,
  };
}

export function measureTrainingEffectiveness(events: FreqEventSample[], focus: TrainingFocus = "general"): TrainingEffectiveness {
  const focused = focus === "general" ? events : events.filter((e) => !e.focus || e.focus === focus || e.focus === "general");
  const ordered = [...focused].sort((a, b) => (a.createdAt ? Date.parse(a.createdAt) : 0) - (b.createdAt ? Date.parse(b.createdAt) : 0));
  const sessions: FreqEventSample[][] = [];
  const bySession = new Map<string, FreqEventSample[]>();
  let anon = 0;
  for (const e of ordered) {
    const sid = e.sessionId || `anon-${Math.floor(anon++ / 8)}`;
    if (!bySession.has(sid)) bySession.set(sid, []);
    bySession.get(sid)!.push(e);
  }
  for (const list of bySession.values()) if (list.length >= 2) sessions.push(list);
  const sessionsCompared = sessions.length;
  if (sessionsCompared < MIN_SESSIONS_EFFECT) {
    return {
      focus, sessionsCompared, confidence: clamp(sessionsCompared * 15, 0, 40), enoughEvidence: false,
      precisionDelta: null, consistencyDelta: null, difficultyToleranceDelta: null,
      summaryFa: "هنوز شواهد کافی برای سنجش اثر تمرین نیست.",
      guidanceFa: "چند جلسهٔ دیگر با همین مسیر تمرین کن تا روند مشخص شود.",
    };
  }
  const half = Math.floor(sessionsCompared / 2);
  const early = sessions.slice(0, half).flat();
  const late = sessions.slice(half).flat();
  const precisionDelta = Math.round(scorePrecision(late).value - scorePrecision(early).value);
  const consistencyDelta = Math.round(scoreConsistency(late).value - scoreConsistency(early).value);
  const difficultyToleranceDelta = Math.round(scoreDifficultyTolerance(late).value - scoreDifficultyTolerance(early).value);
  const confidence = clamp(35 + sessionsCompared * 8, 0, 95);
  const improved =
    (focus === "precision" && precisionDelta >= 5) ||
    (focus === "consistency" && consistencyDelta >= 5) ||
    (focus === "difficulty" && difficultyToleranceDelta >= 5) ||
    (focus === "general" && precisionDelta + consistencyDelta >= 8);
  const limited =
    (focus === "precision" && precisionDelta <= -4) ||
    (focus === "consistency" && consistencyDelta <= -4) ||
    (focus === "difficulty" && difficultyToleranceDelta <= -4) ||
    (focus === "general" && precisionDelta + consistencyDelta <= -6);
  let summaryFa: string;
  let guidanceFa: string;
  if (improved) {
    summaryFa =
      focus === "consistency" ? "پایداری پاسخ‌ها در مسیر اخیر بهتر شده."
      : focus === "precision" ? "دقت تشخیص نسبت به جلسات قبلی بهتر شده."
      : focus === "difficulty" ? "تحمل سختی بالاتر در حال رشد است."
      : "عملکرد شخصی نسبت به جلسات قبلی بهتر شده.";
    guidanceFa = "ادامهٔ مسیر مشابه منطقی است — سیستم فقط پیشنهاد می‌دهد.";
  } else if (limited) {
    summaryFa = "مسیر فعلی بهبود محدودی نشان داده است.";
    guidanceFa = "می‌توانی تمرکز را کمی عوض کنی؛ اجباری نیست و تنبیه وجود ندارد.";
  } else {
    summaryFa = "روند تقریباً ثابت است.";
    guidanceFa = "ادامه بده یا اگر خواستی یک بُعد دیگر را هدف بگیر.";
  }
  return {
    focus, sessionsCompared, confidence: Math.round(confidence), enoughEvidence: true,
    precisionDelta, consistencyDelta, difficultyToleranceDelta, summaryFa, guidanceFa,
  };
}

export function trendLabelFa(trend: SkillTrend): string {
  switch (trend) {
    case "improving": return "در حال پیشرفت";
    case "stable": return "ثابت";
    case "limited": return "نیاز به تمرین بیشتر";
    default: return "داده ناکافی";
  }
}
export function skillTitleFa(key: HearingSkillKey): string {
  switch (key) {
    case "precision": return "دقت تشخیص";
    case "consistency": return "پایداری پاسخ‌ها";
    case "rangeHandling": return "پوشش محدودهٔ فرکانس";
    case "difficultyTolerance": return "توانایی در سختی بالاتر";
  }
}

export function sampleFromEventRow(row: {
  accuracy?: number; correct?: boolean; difficulty?: number; created_at?: string;
  metadata?: Record<string, unknown> | null; response_time_ms?: number | null;
}): FreqEventSample {
  const m = (row.metadata || {}) as Record<string, unknown>;
  const targetHz = typeof m.targetHz === "number" ? m.targetHz : typeof m.target_hz === "number" ? m.target_hz : null;
  const guessHz = typeof m.guessHz === "number" ? m.guessHz : typeof m.guess_hz === "number" ? m.guess_hz : null;
  let errorHz: number | null =
    typeof m.errorHz === "number" ? Math.abs(m.errorHz) : typeof m.hzErr === "number" ? Math.abs(m.hzErr) : null;
  if (errorHz == null && targetHz != null && guessHz != null) errorHz = Math.abs(guessHz - targetHz);
  const focus =
    typeof m.trainingFocus === "string" ? (m.trainingFocus as TrainingFocus)
    : typeof m.focus === "string" ? (m.focus as TrainingFocus) : null;
  return {
    accuracy: Number(row.accuracy) || 0, correct: Boolean(row.correct), difficulty: Number(row.difficulty) || 0,
    level: typeof m.level === "number" ? m.level : undefined,
    responseTimeMs: row.response_time_ms != null ? Number(row.response_time_ms)
      : typeof m.responseTimeMs === "number" ? m.responseTimeMs : null,
    errorHz, targetHz, guessHz, createdAt: row.created_at,
    sessionId: typeof m.sessionId === "string" ? m.sessionId : null, focus,
  };
}

export type MasteryStage = "developing" | "building" | "stable" | "advanced" | "unknown";

export type SkillMastery = {
  key: HearingSkillKey;
  stage: MasteryStage;
  baseline: number;
  recent: number;
  trend: SkillTrend;
  confidence: number;
  reasonFa: string;
};

export type MasteryProfile = {
  precision: SkillMastery;
  consistency: SkillMastery;
  rangeHandling: SkillMastery;
  difficultyTolerance: SkillMastery;
  enoughEvidence: boolean;
};

function stageFromSkill(skill: HearingSkill, priorValue: number | null): { stage: MasteryStage; reasonFa: string } {
  if (skill.confidence < 35 || skill.sampleCount < 4) {
    return { stage: "unknown", reasonFa: "پس از چند راند، مرحلهٔ مهارت نمایش داده می‌شود." };
  }
  const v = skill.value;
  // Hysteresis: prefer staying in stage unless clear move
  if (v >= 78 && skill.confidence >= 60) return { stage: "advanced", reasonFa: "دقت و اطمینان بالا — مهارت تثبیت‌شده." };
  if (v >= 62 && skill.confidence >= 45) return { stage: "stable", reasonFa: "عملکرد پایدار در محدودهٔ خوب." };
  if (v >= 40) return { stage: "building", reasonFa: "در حال ساخت پایه؛ ادامه بده." };
  return { stage: "developing", reasonFa: "شروع مسیر شخصی — بدون فشار." };
}

export function computeMasteryProfile(profile: FrequencySkillProfile): MasteryProfile {
  const mk = (skill: HearingSkill): SkillMastery => {
    const { stage, reasonFa } = stageFromSkill(skill, null);
    return {
      key: skill.key,
      stage,
      baseline: skill.value,
      recent: skill.value,
      trend: skill.trend,
      confidence: skill.confidence,
      reasonFa,
    };
  };
  return {
    precision: mk(profile.precision),
    consistency: mk(profile.consistency),
    rangeHandling: mk(profile.rangeHandling),
    difficultyTolerance: mk(profile.difficultyTolerance),
    enoughEvidence: profile.enoughEvidence,
  };
}

export function masteryStageFa(stage: MasteryStage): string {
  switch (stage) {
    case "advanced": return "پیشرفته";
    case "stable": return "پایدار";
    case "building": return "در حال ساخت";
    case "developing": return "در حال رشد";
    default: return "داده ناکافی";
  }
}

const FOCUS_TITLE: Record<TrainingFocus, string> = {
  precision: "دقت تشخیص",
  consistency: "پایداری پاسخ‌ها",
  difficulty: "تحمل سختی",
  range: "گستره فرکانسی",
  general: "تمرین عمومی",
};

export type SessionPlan = {
  focus: TrainingFocus;
  focusTitleFa: string;
  suggestedRounds: number;
  structureFa: string;
  goalFa: string;
  avoidFa: string | null;
  exercisePreference: "precision" | "range" | "stability" | "challenge" | "general";
  confidence: number;
  isPersonalized: boolean;
  summaryFa: string;
};

export function buildSessionPlan(opts: {
  profile: FrequencySkillProfile | null;
  mastery?: MasteryProfile | null;
  effectiveness?: TrainingEffectiveness | null;
  recentFocuses?: TrainingFocus[];
}): SessionPlan {
  const { profile, effectiveness, recentFocuses = [] } = opts;

  if (!profile || !profile.enoughEvidence) {
    return {
      focus: "general",
      focusTitleFa: FOCUS_TITLE.general,
      suggestedRounds: 8,
      structureFa: "شروع ساده · چند راند عمومی · بدون فشار",
      goalFa: "ساخت اولین شواهد شنیداری شخصی",
      avoidFa: null,
      exercisePreference: "general",
      confidence: profile ? Math.min(40, profile.overallSamples * 6) : 10,
      isPersonalized: false,
      summaryFa: "تمرین را شروع کنید تا پروفایل شنیداری شکل بگیرد.",
    };
  }

  const focusSug = suggestTrainingFocus(profile);
  let focus = focusSug.focus;

  // Balance: avoid repeating same focus 3+ times
  const sameCount = recentFocuses.filter((f) => f === focus).length;
  if (sameCount >= 2) {
    const skills = [
      { f: "precision" as TrainingFocus, v: profile.precision.value, c: profile.precision.confidence },
      { f: "consistency" as TrainingFocus, v: profile.consistency.value, c: profile.consistency.confidence },
      { f: "range" as TrainingFocus, v: profile.rangeHandling.value, c: profile.rangeHandling.confidence },
      { f: "difficulty" as TrainingFocus, v: profile.difficultyTolerance.value, c: profile.difficultyTolerance.confidence },
    ].filter((s) => s.c >= 30 && s.f !== focus);
    skills.sort((a, b) => a.v - b.v);
    if (skills[0]) focus = skills[0].f;
  }

  const exercisePreference =
    focus === "precision" ? "precision"
    : focus === "consistency" ? "stability"
    : focus === "range" ? "range"
    : focus === "difficulty" ? "challenge"
    : "general";

  const suggestedRounds = focus === "difficulty" ? 12 : focus === "consistency" ? 10 : 8;

  let avoidFa: string | null = null;
  if (profile.precision.value >= 75 && profile.precision.confidence >= 50 && focus !== "precision") {
    avoidFa = "دقت فعلاً قوی است؛ نیازی به تمرکز صرف روی آن نیست.";
  }

  let goalFa = `تقویت ${FOCUS_TITLE[focus]}`;
  if (effectiveness?.enoughEvidence && effectiveness.summaryFa) {
    goalFa = effectiveness.guidanceFa;
  }

  return {
    focus,
    focusTitleFa: FOCUS_TITLE[focus],
    suggestedRounds,
    structureFa: "گرم‌کردن · تمرین اصلی · چالش کوتاه (اختیاری)",
    goalFa,
    avoidFa,
    exercisePreference,
    confidence: focusSug.confidence,
    isPersonalized: true,
    summaryFa: `تمرکز پیشنهادی: ${FOCUS_TITLE[focus]} · حدود ${suggestedRounds} راند`,
  };
}
