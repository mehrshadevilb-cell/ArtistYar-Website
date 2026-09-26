"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { usePracticeAccess } from "@/components/usePracticeAccess";
import { FrequencySkillOverview } from "@/components/FrequencySkillOverview";
import { playExerciseRound, stopPracticePlayback, unlockPracticeAudio } from "@/lib/practice-audio-engine";
import {
  BAND_LABEL,
  bandForLevel,
  getPracticeGame,
  generateRoundForGame,
  type GameRound,
  loadLocalLevel,
  loadLocalStats,
  nextLevel,
  persistPracticeRound,
  roundPreviewXp,
  saveLocalLevel,
  saveLocalStats,
  frequencyAccuracy,
  sliderPass,
  choiceAccuracy,
  formatHz,
  formatCents,
  type RoundOutcome,
  selectFreqExercise,
  type FreqExerciseType,
  type SessionPlan,
  type FrequencySkillProfile,
  type TrainingEffectiveness,
  buildSessionPlan,
  FREQ_EXERCISES,
} from "@/lib/practice-game";

type Phase = "intro" | "play" | "result" | "summary";

export function PracticeGameSession({
  gameId,
  onBack,
  maxRounds,
  onSessionEnd,
  hideBack,
  autoStart = false,
}: {
  gameId: string;
  onBack: () => void;
  maxRounds?: number;
  onSessionEnd?: (summary: { correct: number; total: number; xp: number; gameId: string }) => void;
  hideBack?: boolean;
  autoStart?: boolean;
}) {
  const game = getPracticeGame(gameId);
  const { user } = useAuth();
  const { pro, stageLimit, loading: accessLoading } = usePracticeAccess();
  const [level, setLevel] = useState(1);
  const [phase, setPhase] = useState<Phase>("intro");
  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState<GameRound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [heard, setHeard] = useState(false);
  const [guessHz, setGuessHz] = useState(440);
  const [picked, setPicked] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    accuracy: number;
    detail: string;
    xp: number;
  } | null>(null);
  const [outcomes, setOutcomes] = useState<RoundOutcome[]>([]);
  const [sessionXp, setSessionXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [quotaBlocked, setQuotaBlocked] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const startedAt = useRef(0);
  const seedBase = useRef(Date.now());
  const sessionIdRef = useRef(`fm-${Date.now().toString(36)}`);
  const difficultyStartRef = useRef(1);
  const trainingFocusRef = useRef<"precision" | "consistency" | "difficulty" | "range" | "general">("general");
  const recentTargetsRef = useRef<number[]>([]);
  const recentExercisesRef = useRef<FreqExerciseType[]>([]);
  const recentIntervalIdsRef = useRef<string[]>([]);
  const recentDirectionsRef = useRef<Array<"ascending" | "descending">>([]);
  const sessionPlanRef = useRef<SessionPlan | null>(null);
  const skillProfileRef = useRef<FrequencySkillProfile | null>(null);
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sessionPlan, setSessionPlan] = useState<SessionPlan | null>(null);
  const [activeExercise, setActiveExercise] = useState<FreqExerciseType>("general");
  const [skillProfile, setSkillProfile] = useState<FrequencySkillProfile | null>(null);
  const [effectiveness, setEffectiveness] = useState<TrainingEffectiveness | null>(null);
  const [curriculumFeedbackFa, setCurriculumFeedbackFa] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [lastGuessHz, setLastGuessHz] = useState<number | null>(null);
  const userId = user?.id || null;
  const isFreq = gameId === "freq-memory";
  const isInterval = gameId === "interval-recognition";

  const totalRounds = Math.max(1, maxRounds ?? game?.rounds ?? 8);
  const stageNumber = roundIndex + 1;
  const freeLocked = !accessLoading && !pro && stageNumber > (stageLimit || 5);

  useEffect(() => {
    setLevel(loadLocalLevel(gameId, userId));
    const stats = loadLocalStats(userId);
    setStreak(stats.streak);
    return () => {
      if (playTimerRef.current) {
        clearTimeout(playTimerRef.current);
        playTimerRef.current = null;
      }
      stopPracticePlayback();
    };
  }, [gameId, userId]);

  // Load evidence-based skill profile for returning users (guidance only — never blocks play).
  useEffect(() => {
    if (gameId !== "freq-memory" || !userId) {
      skillProfileRef.current = null;
      setSkillProfile(null);
      setEffectiveness(null);
      setCurriculumFeedbackFa(null);
      setProfileLoading(false);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/practice/skills?userId=${encodeURIComponent(userId)}`, {
          credentials: "include",
        });
        if (!res.ok || cancelled) {
          if (!cancelled) setProfileLoading(false);
          return;
        }
        const data = await res.json().catch(() => null);
        if (cancelled || !data?.ok) {
          if (!cancelled) setProfileLoading(false);
          return;
        }
        const profile = data.frequencySkills as FrequencySkillProfile | undefined;
        if (profile && typeof profile.overallSamples === "number") {
          skillProfileRef.current = profile;
          setSkillProfile(profile);
        }
        if (data.trainingEffectiveness && typeof data.trainingEffectiveness === "object") {
          setEffectiveness(data.trainingEffectiveness as TrainingEffectiveness);
        }
        if (typeof data.curriculumFeedbackFa === "string" && data.curriculumFeedbackFa) {
          setCurriculumFeedbackFa(data.curriculumFeedbackFa);
        }
        if (data.sessionPlan && typeof data.sessionPlan === "object") {
          sessionPlanRef.current = data.sessionPlan as SessionPlan;
          setSessionPlan(data.sessionPlan as SessionPlan);
          if (data.sessionPlan.focus) {
            trainingFocusRef.current = data.sessionPlan.focus;
          }
        } else if (profile) {
          try {
            const plan = buildSessionPlan({ profile, recentFocuses: [] });
            sessionPlanRef.current = plan;
            setSessionPlan(plan);
            trainingFocusRef.current = plan.focus || "general";
          } catch {
            /* keep prior */
          }
        }
      } catch {
        /* personalization failure must not break the game */
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gameId, userId]);

  const buildRound = useCallback(
    (lvl: number, idx: number) => {
      const entropy = Math.floor(Math.random() * 1_000_000_000) ^ (Date.now() & 0xffffffff);
      const seed = (seedBase.current + idx * 97 + lvl * 13 + entropy) >>> 0;
      let exerciseType: FreqExerciseType | undefined;
      if (gameId === "freq-memory") {
        try {
          const plan = sessionPlanRef.current;
          const profile = skillProfileRef.current;
          exerciseType = selectFreqExercise({
            profile,
            focus: plan?.focus || trainingFocusRef.current || "general",
            recentExerciseTypes: recentExercisesRef.current,
            sessionRoundIndex: idx,
            totalRounds: Math.max(1, maxRounds ?? game?.rounds ?? 8),
          });
          if (plan?.isPersonalized && plan.exercisePreference) {
            if (recentExercisesRef.current.slice(-2).every((t) => t !== plan.exercisePreference)) {
              exerciseType = plan.exercisePreference;
            }
          }
        } catch {
          exerciseType = "general";
        }
        if (!exerciseType) exerciseType = "general";
        recentExercisesRef.current = [...recentExercisesRef.current.slice(-6), exerciseType];
        setActiveExercise(exerciseType);
      }
      let r: GameRound;
      try {
        r = generateRoundForGame(gameId, lvl, seed, {
          exerciseType,
          recentTargets: gameId === "freq-memory" ? recentTargetsRef.current : undefined,
          recentIntervalIds: gameId === "interval-recognition" ? recentIntervalIdsRef.current : undefined,
          recentDirections: gameId === "interval-recognition" ? recentDirectionsRef.current : undefined,
        });
      } catch {
        r = generateRoundForGame(gameId, lvl, seed);
      }
      if (gameId === "freq-memory" && typeof r.targetHz === "number" && Number.isFinite(r.targetHz) && r.targetHz > 0) {
        recentTargetsRef.current = [...recentTargetsRef.current.slice(-7), r.targetHz];
      }
      if (gameId === "interval-recognition" && r.correctOptionId) {
        recentIntervalIdsRef.current = [...recentIntervalIdsRef.current.slice(-6), r.correctOptionId];
        const keyParts = String(r.itemKey || "").split("|");
        const dirRaw = keyParts[3];
        const dir = dirRaw === "descending" ? ("descending" as const) : ("ascending" as const);
        recentDirectionsRef.current = [...recentDirectionsRef.current.slice(-4), dir];
      }
      setRound(r);
      setHeard(false);
      setPicked(null);
      setFeedback(null);
      setAudioError(null);
      setPlaying(false);
      if (playTimerRef.current) {
        clearTimeout(playTimerRef.current);
        playTimerRef.current = null;
      }
      stopPracticePlayback();
      setGuessHz(r.targetHz ? Math.round((r.sliderMin! + r.sliderMax!) / 2) : 440);
      startedAt.current = Date.now();
    },
    [gameId, maxRounds, game?.rounds],
  );

  const startSession = () => {
    void unlockPracticeAudio();
    setPhase("play");
    setRoundIndex(0);
    setOutcomes([]);
    setSessionXp(0);
    setQuotaBlocked(false);
    seedBase.current = Date.now();
    sessionIdRef.current = `fm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    difficultyStartRef.current = level;
    recentTargetsRef.current = [];
    recentExercisesRef.current = [];
    recentIntervalIdsRef.current = [];
    recentDirectionsRef.current = [];
    setActiveExercise("general");
    if (gameId === "freq-memory") {
      try {
        const profile = skillProfileRef.current;
        const existing = sessionPlanRef.current;
        const plan =
          existing?.isPersonalized
            ? existing
            : buildSessionPlan({ profile, recentFocuses: [] });
        sessionPlanRef.current = plan;
        setSessionPlan(plan);
        trainingFocusRef.current = plan.focus || "general";
      } catch {
        sessionPlanRef.current = null;
        setSessionPlan(null);
        trainingFocusRef.current = "general";
      }
    } else {
      sessionPlanRef.current = null;
      setSessionPlan(null);
      trainingFocusRef.current = "general";
    }
    const warm = Math.max(1, level - (game?.warmup ? 6 : 0));
    buildRound(warm, 0);
  };

  useEffect(() => {
    if (!autoStart || !game) return;
    const id = window.setTimeout(() => startSession(), 0);
    return () => window.clearTimeout(id);
  }, [autoStart, gameId]);

  const playAudio = async (which: "challenge" | "reference" = "challenge") => {
    if (!round) return;
    stopPracticePlayback();
    setAudioError(null);
    setPlaying(true);
    try {
      const unlocked = await unlockPracticeAudio();
      if (!unlocked) {
        setAudioError("مرورگر اجازهٔ صدا نداد. یک‌بار صفحه را لمس کن و دوباره پخش را بزن.");
        setPlaying(false);
        return;
      }
      const dsp = which === "reference" && round.referenceDsp ? round.referenceDsp : round.challengeDsp;
      const handle = await playExerciseRound({ source: round.source, dsp });
      if (!handle) {
        setAudioError("پخش شروع نشد. اجازهٔ صدا را در مرورگر فعال کن و دوباره بزن.");
        setPlaying(false);
        return;
      }
      setHeard(true);
      const src = round.source as { duration?: number; seconds?: number; intervalHz?: number };
      const base = src.duration || src.seconds || 1.2;
      const factor = src.intervalHz ? 2.2 : 1;
      const hits = (round.source as { hits?: number }).hits;
      const percMs = hits ? hits * ((round.source as { spacing?: number }).spacing || 0.38) * 1000 + 400 : 0;
      const ms = Math.max(percMs, Math.round(base * factor * 1000) + 250);
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
      playTimerRef.current = setTimeout(() => {
        setPlaying(false);
        playTimerRef.current = null;
      }, ms);
    } catch {
      setPlaying(false);
      setAudioError("خطا در پخش صوت. دوباره تلاش کن.");
    }
  };

  const submitChoice = async (optionId: string) => {
    if (!round || picked || !heard || freeLocked || quotaBlocked) return;
    setPicked(optionId);
    const correct = optionId === round.correctOptionId;
    const accuracy = choiceAccuracy(correct);
    await finishRound(correct, accuracy, correct ? "درست" : `پاسخ: ${round.reviewText}`);
  };

  const submitSlider = async () => {
    if (!round || picked || !heard || freeLocked || quotaBlocked || !round.targetHz) return;
    setPicked("slider");
    setLastGuessHz(guessHz);
    const { accuracy, hzErr, cents, perfect } = frequencyAccuracy(round.targetHz, guessHz, round.toleranceHz || 40);
    const correct = sliderPass(accuracy) || perfect;
    const detail = `${formatHz(guessHz)} در برابر ${formatHz(round.targetHz)} · خطای ${Math.round(hzErr)} Hz (${formatCents(cents)})`;
    await finishRound(correct, accuracy, detail);
  };

  const finishRound = async (correct: boolean, accuracy: number, detail: string) => {
    if (!round) return;
    const responseTimeMs = Math.max(1, Date.now() - startedAt.current);
    const nextStreak = correct ? streak + 1 : 0;
    const xp = roundPreviewXp({ correct, accuracy, level, responseTimeMs, streak: nextStreak });
    setStreak(nextStreak);
    setSessionXp((x) => x + Math.max(0, xp));
    setFeedback({ correct, accuracy, detail, xp });

    const outcome: RoundOutcome = {
      correct,
      accuracy: Math.max(0, Math.min(100, Number.isFinite(accuracy) ? accuracy : 0)),
      responseTimeMs: Math.max(1, Math.min(120000, Number.isFinite(responseTimeMs) ? responseTimeMs : 3000)),
    };
    const nextOutcomes = [...outcomes, outcome].slice(-24);
    setOutcomes(nextOutcomes);

    const newLevel = nextLevel(level, nextOutcomes);
    setLevel(newLevel);
    saveLocalLevel(gameId, newLevel, userId);

    const stats = loadLocalStats(userId);
    stats.xp += Math.max(0, xp);
    stats.plays += 1;
    stats.streak = nextStreak;
    stats.bestStreak = Math.max(stats.bestStreak, nextStreak);
    saveLocalStats(stats, userId);

    if (user?.id) {
      const res = await persistPracticeRound({
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        telegramId: user.telegramId,
        gameId: round.gameId,
        level,
        correct,
        accuracy,
        responseTimeMs,
        itemKey: round.itemKey,
        source: "practice_game_session",
        extra: {
          mode: round.mode,
          guessHz: round.mode === "slider" ? guessHz : undefined,
          targetHz: round.targetHz,
          errorHz: round.mode === "slider" && round.targetHz ? Math.abs(guessHz - round.targetHz) : undefined,
          hzErr: round.mode === "slider" && round.targetHz ? Math.abs(guessHz - round.targetHz) : undefined,
          sessionId: sessionIdRef.current,
          trainingFocus: trainingFocusRef.current,
          difficultyStart: difficultyStartRef.current,
          difficultyEnd: level,
          exerciseType: gameId === "freq-memory" ? activeExercise : undefined,
        },
      });
      if (!res.ok && res.quota) setQuotaBlocked(true);
    }

    setPhase("result");
  };

  const goNext = () => {
    if (playTimerRef.current) {
      clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }
    stopPracticePlayback();
    setPlaying(false);
    seedBase.current = Date.now() ^ Math.floor(Math.random() * 1e9);
    if (roundIndex + 1 >= totalRounds || quotaBlocked) {
      const summary = {
        correct: outcomes.filter((o) => o.correct).length,
        total: outcomes.length,
        xp: sessionXp,
        gameId,
      };
      if (onSessionEnd) {
        onSessionEnd(summary);
        return;
      }
      setPhase("summary");
      return;
    }
    const idx = roundIndex + 1;
    setRoundIndex(idx);
    setPhase("play");
    const warmRounds = game?.warmup ?? 2;
    const effective = idx < warmRounds ? Math.max(1, level - 6) : level;
    buildRound(effective, idx);
  };

  const band = bandForLevel(level);

  if (!game) {
    return (
      <section className="container-ay py-10" dir="rtl">
        <p className="text-ink-400">بازی پیدا نشد.</p>
        <button type="button" className="btn-ay mt-4" onClick={onBack}>
          بازگشت
        </button>
      </section>
    );
  }

  return (
    <main className="practice-shell container-ay relative pb-16 pt-6 sm:pt-10" dir="rtl">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          {!hideBack && (
            <button type="button" onClick={onBack} className="mb-2 inline-flex items-center gap-1 text-xs text-ink-500 hover:text-ink-300">
              <ArrowRight size={14} aria-hidden /> بازگشت
            </button>
          )}
          <p className="text-[11px] font-medium text-amber-300/90">{game.title}</p>
          <h1 className="mt-0.5 text-xl font-semibold text-sand-50 sm:text-2xl">{game.titleFa}</h1>
          <p className="mt-1 text-[12px] text-ink-500">{game.tagline}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-[11px] text-ink-400">
          <div>سطح {level}/50</div>
          <div className="text-ink-500">{BAND_LABEL[band]}</div>
        </div>
      </header>

      {phase === "intro" && (
        <div className="space-y-4">
          {isFreq ? (
            <>
              <section className="card-ay space-y-4 p-5 sm:p-6">
                <div>
                  <h2 className="text-lg font-semibold text-sand-50 sm:text-xl">حافظهٔ فرکانس</h2>
                  <p className="mt-2 text-[13px] leading-7 text-ink-400">
                    بشنو، به‌خاطر بسپار و همان pitch را با دقت بازسازی کن.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-500">
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                    سطح {level} / ۵۰
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                    {BAND_LABEL[band]}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                    {sessionPlan?.suggestedRounds || totalRounds} راند
                  </span>
                </div>
                <p className="text-[12px] leading-6 text-ink-500">
                  سختی تمرین بر اساس عملکردت تنظیم می‌شود — نه تصادفی.
                </p>
                {profileLoading && (
                  <p className="text-[12px] text-ink-500" aria-live="polite">
                    در حال آماده‌سازی تمرین شخصی…
                  </p>
                )}
                {!pro && (
                  <p className="text-[12px] text-amber-200/80">رایگان: تا {stageLimit || 5} مرحله در روز</p>
                )}
                <p className="text-[11px] leading-6 text-ink-600">
                  برای فعال‌شدن صدا در موبایل، دکمهٔ «شروع تمرین» یا «پخش» را با لمس خودت بزن.
                </p>
                <button
                  type="button"
                  className="btn-ay btn-ay-primary w-full sm:w-auto"
                  onClick={startSession}
                >
                  شروع تمرین
                </button>
              </section>

              {sessionPlan && (
                <section className="card-ay space-y-3 p-5" aria-label="جلسه پیشنهادی">
                  <p className="text-[11px] font-medium text-cyan-300/90">
                    {sessionPlan.isPersonalized ? "تمرکز امروز · جلسه پیشنهادی" : "جلسه پیشنهادی"}
                  </p>
                  <p className="text-[15px] font-medium text-sand-50">{sessionPlan.focusTitleFa}</p>
                  <p className="text-[13px] leading-7 text-ink-400">{sessionPlan.summaryFa}</p>
                  <ul className="space-y-1 text-[12px] leading-6 text-ink-500">
                    <li>ساختار: {sessionPlan.structureFa}</li>
                    {sessionPlan.goalFa ? <li>هدف: {sessionPlan.goalFa}</li> : null}
                    <li>حدود {sessionPlan.suggestedRounds || totalRounds} راند</li>
                  </ul>
                  <p className="text-[10px] text-ink-600">این فقط یک پیشنهاد است؛ می‌توانی آزادانه تمرین کنی.</p>
                </section>
              )}

              <FrequencySkillOverview
                profile={skillProfile}
                effectiveness={effectiveness}
                curriculumFeedbackFa={curriculumFeedbackFa}
                sessionPlan={null}
              />
            </>
          ) : (
            <section className="card-ay space-y-3 p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-sand-50">{game.titleFa}</h2>
              <p className="text-[13px] leading-7 text-ink-400">{game.tagline}</p>
              <p className="text-[12px] text-ink-500">{totalRounds} راند · سطح {level}</p>
            </section>
          )}
          <button type="button" className="btn-ay w-full sm:w-auto" onClick={startSession}>
            شروع تمرین
          </button>
        </div>
      )}

      {phase === "play" && round && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-[12px] text-ink-500">
            <span>
              راند {roundIndex + 1} از {totalRounds}
              {isFreq ? ` · ${FREQ_EXERCISES[activeExercise]?.titleFa || "تمرین عمومی"}` : ""}
            </span>
            <span>استریک {streak}</span>
          </div>
          {isFreq && activeExercise !== "general" && FREQ_EXERCISES[activeExercise] && (
            <p className="text-[12px] leading-6 text-ink-500">
              <span className="text-cyan-300/90">{FREQ_EXERCISES[activeExercise].titleFa}</span>
              {" · "}
              {FREQ_EXERCISES[activeExercise].purposeFa}
            </p>
          )}
          <section className="card-ay space-y-4 p-5">
          <section className="card-ay space-y-4 p-5">
            <p className="text-[14px] font-medium text-sand-50">{round.prompt}</p>
            {round.hint && <p className="text-[12px] text-ink-500">{round.hint}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-ay inline-flex items-center gap-2" onClick={() => void playAudio("challenge")} disabled={playing}>
                <Play size={16} /> {playing ? "در حال پخش…" : heard ? "پخش دوباره" : "پخش نمونه"}
              </button>
            </div>
            {audioError && <p className="text-[12px] text-rose-400">{audioError}</p>}
            {round.mode === "choice" && round.options && heard && !picked && (
              <div className="grid gap-2 sm:grid-cols-2">
                {round.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-right text-[13px] text-sand-50 hover:border-amber-400/40 hover:bg-amber-400/5"
                    onClick={() => void submitChoice(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            {round.mode === "slider" && heard && !picked && (
              <div className="space-y-3">
                <input
                  type="range"
                  min={round.sliderMin}
                  max={round.sliderMax}
                  value={guessHz}
                  onChange={(e) => setGuessHz(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-[11px] text-ink-500">
                  <span>{formatHz(round.sliderMin || 0)}</span>
                  <span className="text-sand-50">{formatHz(guessHz)}</span>
                  <span>{formatHz(round.sliderMax || 0)}</span>
                </div>
                <button type="button" className="btn-ay" onClick={() => void submitSlider()}>
                  ثبت پاسخ
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {phase === "result" && feedback && (
        <div className="space-y-4">
          <section className={`card-ay p-5 ${feedback.correct ? "border-emerald-500/30" : "border-rose-500/30"}`}>
            <div className="flex items-center gap-2 text-[15px] font-semibold">
              {feedback.correct ? <Check className="text-emerald-400" /> : <X className="text-rose-400" />}
              {isFreq
                ? feedback.correct
                  ? "درست بود"
                  : "این بار دقیق نبود"
                : isInterval
                  ? feedback.correct
                    ? "درست بود"
                    : "این بار دقیق نبود"
                  : feedback.correct
                    ? "درست"
                    : "غلط"}
              {" · "}دقت {Math.round(feedback.accuracy)}٪
            </div>
            {isFreq && round?.mode === "slider" && round.targetHz != null && lastGuessHz != null ? (
              <div className="space-y-1 text-[12px] text-ink-400">
                <p>حدس تو: {formatHz(lastGuessHz)}</p>
                <p>هدف: {formatHz(round.targetHz)}</p>
                <p>خطا: {Math.round(Math.abs(lastGuessHz - round.targetHz))} Hz</p>
              </div>
            ) : (
              <p className="mt-2 text-[13px] text-ink-400">{feedback.detail}</p>
            )}
            <p className="mt-1 text-[12px] text-amber-300/80">
              +{feedback.xp} XP · استریک {streak} · سطح {level}
            </p>
            {isFreq && (
              <p className="text-[11px] leading-5 text-ink-600">
                سختی تمرین بر اساس عملکردت تنظیم می‌شود.
              </p>
            )}
          </section>
          <button type="button" className="btn-ay" onClick={goNext}>
            {roundIndex + 1 >= totalRounds ? "خلاصه جلسه" : "راند بعد"}
          </button>
        </div>
      )}

      {phase === "summary" && (
        <div className="space-y-4">
          <section className="card-ay space-y-4 p-5">
            <h2 className="text-lg font-semibold text-sand-50">
              {isFreq ? "خلاصهٔ تمرین" : "خلاصه جلسه"}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="راند" value={String(outcomes.length)} />
              <Stat label="درست" value={String(outcomes.filter((o) => o.correct).length)} />
              <Stat label="XP جلسه" value={String(sessionXp)} />
              <Stat label="سطح پایان" value={String(level)} />
            </div>
            {isFreq && outcomes.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat
                  label="دقت میانگین"
                  value={`${Math.round(outcomes.reduce((s, o) => s + o.accuracy, 0) / outcomes.length)}٪`}
                />
                <Stat label="سطح شروع" value={String(difficultyStartRef.current)} />
                <Stat label="استریک پایانی" value={String(streak)} />
              </div>
            )}
          </section>
          {isFreq && sessionPlan?.isPersonalized && (
            <section className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] p-3 text-[12px] leading-6 text-ink-400">
              <p className="text-[11px] text-cyan-300/90">برای جلسهٔ بعد</p>
              <p className="mt-1 text-sand-100">{sessionPlan.focusTitleFa}</p>
              <p className="mt-1">{sessionPlan.summaryFa}</p>
              <p className="mt-1 text-[10px] text-ink-600">
                پیشنهاد است — سختی واقعی همچنان بر اساس عملکردت تنظیم می‌شود.
              </p>
            </section>
          )}
          {isFreq && effectiveness?.enoughEvidence && (
            <section className="rounded-xl border border-white/[.07] bg-white/[0.02] p-3 text-[12px] leading-6 text-ink-400">
              <p className="text-[11px] text-sand-200">روند شخصی</p>
              <p className="mt-1">{effectiveness.summaryFa}</p>
              <p className="mt-1 text-[11px] text-ink-500">{effectiveness.guidanceFa}</p>
            </section>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ay" onClick={startSession}>
              <RotateCcw size={14} className="ml-1 inline" /> {isFreq ? "شروع تمرین دوباره" : "تمرین دوباره"}
            </button>
            {!hideBack && (
              <button type="button" className="rounded-xl border border-white/10 px-4 py-2 text-[13px] text-ink-400" onClick={onBack}>
                بازگشت
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-center">
      <p className="text-[11px] text-ink-500">{label}</p>
      <p className="mt-1 text-base text-sand-50">{value}</p>
    </div>
  );
}
