/**
 * Phase 8.5–11 — Frequency Memory exercises.
 * Exercise selection = WHAT to train. Adaptive difficulty = HOW HARD.
 * No second difficulty engine. Anti-memorization via history-aware randomness.
 */
import { clamp, frequencyToleranceHz, listenSeconds, pick, seeded, safeHz, safeNumber } from "./difficulty";
import { formatHz } from "./scoring";
import type {
  FrequencySkillProfile,
  HearingSkillKey,
  TrainingFocus,
  TrainingEffectiveness,
} from "./frequency-mastery";
import type { AudioProgram, DspChain } from "@/lib/practice-exercises/types";

type FreqGameRound = {
  gameId: string;
  mode: "slider";
  prompt: string;
  hint: string;
  reviewText: string;
  source: AudioProgram;
  challengeDsp: DspChain;
  targetHz: number;
  sliderMin: number;
  sliderMax: number;
  toleranceHz: number;
  itemKey: string;
  level: number;
};

export type FreqExerciseType =
  | "precision"
  | "range"
  | "stability"
  | "challenge"
  | "relative"
  | "octave"
  | "general";

export type FreqExerciseMeta = {
  type: FreqExerciseType;
  titleFa: string;
  purposeFa: string;
};

export const FREQ_EXERCISES: Record<FreqExerciseType, FreqExerciseMeta> = {
  precision: { type: "precision", titleFa: "دقت تشخیص", purposeFa: "کاهش خطای تخمین فرکانس" },
  range: { type: "range", titleFa: "گستره فرکانسی", purposeFa: "شناخت بهتر در محدودهٔ بم تا زیر" },
  stability: { type: "stability", titleFa: "پایداری پاسخ", purposeFa: "کاهش نوسان بین پاسخ‌های متوالی" },
  challenge: { type: "challenge", titleFa: "چالش شنیداری", purposeFa: "حفظ دقت در شرایط سخت‌تر" },
  relative: { type: "relative", titleFa: "نسبت فرکانسی", purposeFa: "تشخیص فاصله نسبت به فرکانس قبلی" },
  octave: { type: "octave", titleFa: "اکتاو و کلاس صدا", purposeFa: "بازشناسی همان pitch در اکتاو دیگر" },
  general: { type: "general", titleFa: "تمرین عمومی", purposeFa: "تقویت کلی حافظهٔ فرکانس" },
};

const FULL_POOL = [80, 110, 160, 220, 330, 440, 660, 880, 1200, 2000, 3000, 5000, 8000];
const LOW_POOL = [80, 110, 160, 220, 330];
const HIGH_POOL = [2000, 3000, 5000, 8000];
const MID_POOL = [330, 440, 660, 880, 1200];

function key(parts: Array<string | number>) {
  return parts.join("|").slice(0, 180);
}

/** Avoid exact target repeats, ABA, and empty/NaN pools. */
export function pickTargetHz(
  pool: number[],
  seed: number,
  recentTargets: number[] = [],
): number {
  const safePool = (pool || []).map((hz) => safeHz(hz, 0)).filter((hz) => hz > 0);
  const base = safePool.length ? safePool : [440];
  const recent = (recentTargets || []).map((hz) => safeHz(hz, 0)).filter((hz) => hz > 0).slice(-8);
  const banned = new Set(recent.slice(-4));
  const candidates = base.filter((hz) => !banned.has(hz));
  const use = candidates.length >= 2 ? candidates : base;
  const last = recent[recent.length - 1];
  if (last && use.length > 2) {
    const prefer = use.filter((hz) => {
      const ratio = hz / last;
      if (!(ratio > 0)) return true;
      return Math.abs(Math.log2(ratio)) > 0.4;
    });
    if (prefer.length >= 2) return pick(prefer, seed);
  }
  if (recent.length >= 2 && use.length > 2) {
    const a = recent[recent.length - 2];
    const b = recent[recent.length - 1];
    if (a !== b) {
      const antiAba = use.filter((hz) => hz !== a);
      if (antiAba.length >= 2) return pick(antiAba, seed);
    }
  }
  return pick(use, seed);
}

export function selectFreqExercise(opts: {
  profile: FrequencySkillProfile | null;
  focus: TrainingFocus;
  effectiveness?: TrainingEffectiveness | null;
  recentExerciseTypes?: FreqExerciseType[];
  sessionRoundIndex: number;
  totalRounds: number;
}): FreqExerciseType {
  const { profile, focus, recentExerciseTypes = [], sessionRoundIndex, totalRounds } = opts;

  if (!profile || !profile.enoughEvidence || profile.overallSamples < 6) {
    return "general";
  }
  const lastTypes = recentExerciseTypes.slice(-2);

  let preferred: FreqExerciseType =
    focus === "precision"
      ? "precision"
      : focus === "consistency"
        ? "stability"
        : focus === "range"
          ? "range"
          : focus === "difficulty"
            ? "challenge"
            : "general";

  const recentCount = recentExerciseTypes.filter((t) => t === preferred).length;
  if (recentCount >= 2 && profile.enoughEvidence) {
    const skills: Array<{ key: HearingSkillKey; type: FreqExerciseType; value: number }> = [
      { key: "precision", type: "precision", value: profile.precision.value },
      { key: "consistency", type: "stability", value: profile.consistency.value },
      { key: "rangeHandling", type: "range", value: profile.rangeHandling.value },
      { key: "difficultyTolerance", type: "challenge", value: profile.difficultyTolerance.value },
    ];
    const alt = [...skills].filter((s) => s.type !== preferred).sort((a, b) => a.value - b.value)[0];
    if (alt) preferred = alt.type;
  }

  if (
    sessionRoundIndex >= Math.max(4, totalRounds - 2) &&
    profile.precision.value >= 70 &&
    profile.precision.confidence >= 50 &&
    preferred === "general"
  ) {
    preferred = "challenge";
  }

  const last3 = recentExerciseTypes.slice(-3);
  if (last3.length >= 2 && last3.every((t) => t === preferred)) {
    const fallback: FreqExerciseType[] = [
      "general", "precision", "stability", "range", "challenge", "relative", "octave",
    ];
    const next = fallback.find((t) => t !== preferred);
    if (next) preferred = next;
  }

  if (lastTypes.includes(preferred) && lastTypes.length >= 1) {
    const fallback: FreqExerciseType[] = [
      "general", "precision", "stability", "range", "challenge", "relative", "octave",
    ];
    const next = fallback.find((t) => !lastTypes.includes(t));
    if (next) preferred = next;
  }

  if (!(preferred in FREQ_EXERCISES)) preferred = "general";
  return preferred;
}

export function generateFreqExerciseRound(
  level: number,
  seed: number,
  exercise: FreqExerciseType,
  recentTargets: number[] = [],
): FreqGameRound {
  const tolBase = frequencyToleranceHz(level);
  const dur = listenSeconds(level);

  let pool = FULL_POOL;
  let tol = tolBase;
  let prompt = "فرکانس را بشنو، بعد با اسلایدر همان pitch را بازسازی کن";
  let hint =
    level < 12
      ? "اول محدوده را حدس بزن، بعد دقیق‌تر تنظیم کن"
      : "گوش را روی رنگ تون قفل کن؛ اسلایدر را آرام حرکت بده";

  switch (exercise) {
    case "precision":
      pool = MID_POOL;
      tol = Math.max(6, tolBase * 0.85);
      prompt = "با دقت بالا همان فرکانس را بازسازی کن";
      hint = "روی تفاوت‌های کوچک تمرکز کن؛ اسلایدر را آهسته حرکت بده";
      break;
    case "range": {
      const lowBias = seeded(seed + 11) > 0.5;
      pool = lowBias ? [...LOW_POOL, ...MID_POOL.slice(0, 2)] : [...HIGH_POOL, ...MID_POOL.slice(-2)];
      prompt = lowBias ? "فرکانس‌های بم‌تر را تشخیص بده" : "فرکانس‌های زیرتر را تشخیص بده";
      hint = "محدودهٔ کلی را اول پیدا کن، بعد دقیق شو";
      break;
    }
    case "stability":
      pool = FULL_POOL;
      prompt = "پاسخ پایدار بده — نوسان بین حدس‌ها را کم کن";
      hint = "همان روش گوش‌دادن را تکرار کن؛ عجله نکن";
      break;
    case "challenge":
      pool = FULL_POOL;
      tol = Math.max(5, tolBase * 0.7);
      prompt = "چالش: فرکانس را در شرایط سخت‌تر بازسازی کن";
      hint = "تحمل کمتر است؛ با تمرکز گوش کن";
      break;
    case "relative":
      pool = FULL_POOL;
      prompt = "نسبت به راند قبل، pitch را بازسازی کن";
      hint = "فاصلهٔ نسبی را حس کن؛ عجله نکن";
      break;
    case "octave":
      pool = MID_POOL.length ? MID_POOL : FULL_POOL;
      prompt = "همان pitch را در اکتاو دیگر تشخیص بده";
      hint = "کلاس صدا (chroma) را قفل کن، نه فقط ارتفاع";
      break;
    default:
      break;
  }

  const targetHz = pickTargetHz(pool, seed, recentTargets);
  let finalTarget = safeHz(targetHz, 440);
  if (exercise === "stability" && recentTargets.length) {
    const last = recentTargets[recentTargets.length - 1];
    const near = FULL_POOL.filter(
      (hz) => hz !== last && Number.isFinite(hz) && hz > 0 && Math.abs(Math.log2(hz / last)) < 1.2,
    );
    if (near.length && seeded(seed + 29) > 0.35) {
      finalTarget = pickTargetHz(near, seed + 3, recentTargets);
    }
  }
  if (exercise === "relative" && recentTargets.length) {
    const last = safeHz(recentTargets[recentTargets.length - 1], finalTarget);
    const semis = pick([2, 3, 4, 5, 7, -2, -3, -4, -5, -7], seed + 41);
    const candidate = last * Math.pow(2, semis / 12);
    if (candidate >= 60 && candidate <= 10000) finalTarget = safeHz(candidate, finalTarget);
  }
  if (exercise === "octave") {
    const dir = seeded(seed + 53) > 0.5 ? 2 : 0.5;
    const shifted = finalTarget * dir;
    if (shifted >= 60 && shifted <= 10000) finalTarget = safeHz(shifted, finalTarget);
  }

  finalTarget = safeHz(finalTarget, 440);
  tol = clamp(safeNumber(tol, 40), 4, 400);
  const spanMul = exercise === "challenge" ? 0.45 : exercise === "precision" ? 0.5 : 0.55;
  const span = Math.max(tol * 6, finalTarget * spanMul);
  const min = Math.max(40, Math.round(finalTarget - span));
  const max = Math.min(12000, Math.round(finalTarget + span));
  const known: FreqExerciseType = exercise in FREQ_EXERCISES ? exercise : "general";
  const meta = FREQ_EXERCISES[known];

  return {
    gameId: "freq-memory",
    mode: "slider",
    prompt,
    hint: `${hint} · ${meta.purposeFa}`,
    reviewText: `هدف ${formatHz(finalTarget)} · تحمل ±${Math.round(tol)} Hz · ${meta.titleFa}`,
    source: {
      kind: "harmonic",
      fundamental: finalTarget,
      partials: [1, 0.18],
      duration: exercise === "challenge" ? Math.max(0.55, dur * 0.85) : dur,
    } as AudioProgram,
    challengeDsp: { type: "none" } as DspChain,
    targetHz: finalTarget,
    sliderMin: min,
    sliderMax: max,
    toleranceHz: tol,
    itemKey: key(["freq-memory", known, level, finalTarget, seed]),
    level,
  };
}
