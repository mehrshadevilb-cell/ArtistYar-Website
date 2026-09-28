"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Play, RotateCcw, X } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { usePracticeAccess } from "@/components/usePracticeAccess";
import {
  playExerciseRound,
  stopPracticePlayback,
  unlockPracticeAudio,
  startLiveTone,
  setLiveToneHz,
  stopLiveTone,
} from "@/lib/practice-audio-engine";
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
  const [feedback, setFeedback] = useState<{ correct: boolean; accuracy: number; detail: string; xp: number } | null>(null);
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
  const [lastGuessHz, setLastGuessHz] = useState<number | null>(null);
  const userId = user?.id || null;
  const isFreq = gameId === "freq-memory";
  const isInterval = gameId === "interval-recognition";
  const totalRounds = Math.max(1, maxRounds ?? game?.rounds ?? 8);
  const freeLocked = !accessLoading && !pro && roundIndex + 1 > (stageLimit || 5);

  useEffect(() => {
    setLevel(loadLocalLevel(gameId, userId));
    setStreak(loadLocalStats(userId).streak);
    if (gameId === "freq-memory" && !sessionPlanRef.current) {
      try {
        const plan = buildSessionPlan({ profile: null, recentFocuses: [] });
        sessionPlanRef.current = plan;
        setSessionPlan(plan);
        trainingFocusRef.current = plan.focus || "general";
      } catch {
        /* */
      }
    }
    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
      stopPracticePlayback();
      stopLiveTone();
    };
  }, [gameId, userId]);

  useEffect(() => {
    if (gameId !== "freq-memory" || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/practice/skills?userId=${encodeURIComponent(userId)}`, { credentials: "include" });
        if (!res.ok || cancelled) return;
        const data = await res.json().catch(() => null);
        if (cancelled || !data?.ok) return;
        const profile = data.frequencySkills as FrequencySkillProfile | undefined;
        if (profile && typeof profile.overallSamples === "number") skillProfileRef.current = profile;
        if (data.sessionPlan && typeof data.sessionPlan === "object") {
          sessionPlanRef.current = data.sessionPlan as SessionPlan;
          setSessionPlan(data.sessionPlan as SessionPlan);
        }
      } catch {
        /* */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gameId, userId]);

  const buildRound = useCallback(
    (lvl: number, idx: number) => {
      const seed = (seedBase.current + idx * 97 + lvl * 13 + Math.floor(Math.random() * 1e9)) >>> 0;
      let exerciseType: FreqExerciseType | undefined;
      if (gameId === "freq-memory") {
        try {
          exerciseType =
            selectFreqExercise({
              profile: skillProfileRef.current,
              focus: sessionPlanRef.current?.focus || trainingFocusRef.current || "general",
              recentExerciseTypes: recentExercisesRef.current,
              sessionRoundIndex: idx,
              totalRounds: Math.max(1, maxRounds ?? game?.rounds ?? 8),
            }) || "general";
        } catch {
          exerciseType = "general";
        }
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
      if (typeof r.targetHz === "number" && r.targetHz > 0) {
        recentTargetsRef.current = [...recentTargetsRef.current.slice(-7), r.targetHz];
      }
      if (gameId === "interval-recognition" && r.correctOptionId) {
        recentIntervalIdsRef.current = [...recentIntervalIdsRef.current.slice(-6), r.correctOptionId];
      }
      setRound(r);
      setHeard(false);
      setPicked(null);
      setFeedback(null);
      setAudioError(null);
      setPlaying(false);
      stopLiveTone();
      stopPracticePlayback();
      setGuessHz(r.targetHz ? Math.round(((r.sliderMin || 0) + (r.sliderMax || 0)) / 2) : 440);
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
    sessionIdRef.current = `fm-${Date.now().toString(36)}`;
    difficultyStartRef.current = level;
    recentTargetsRef.current = [];
    recentExercisesRef.current = [];
    recentIntervalIdsRef.current = [];
    recentDirectionsRef.current = [];
    if (gameId === "freq-memory") {
      try {
        const plan = sessionPlanRef.current?.isPersonalized
          ? sessionPlanRef.current
          : buildSessionPlan({ profile: skillProfileRef.current, recentFocuses: [] });
        sessionPlanRef.current = plan;
        setSessionPlan(plan);
        trainingFocusRef.current = plan.focus || "general";
      } catch {
        trainingFocusRef.current = "general";
      }
    }
    buildRound(Math.max(1, level - (game?.warmup ? 6 : 0)), 0);
  };

  useEffect(() => {
    if (!autoStart || !game) return;
    const id = window.setTimeout(() => startSession(), 0);
    return () => window.clearTimeout(id);
  }, [autoStart, gameId]);

  const playAudio = async () => {
    if (!round) return;
    stopLiveTone();
    stopPracticePlayback();
    setAudioError(null);
    setPlaying(true);
    try {
      if (!(await unlockPracticeAudio())) {
        setAudioError("مرورگر اجازهٔ صدا نداد. یک‌بار صفحه را لمس کن.");
        setPlaying(false);
        return;
      }
      const handle = await playExerciseRound({ source: round.source, dsp: round.challengeDsp });
      if (!handle) {
        setAudioError("پخش شروع نشد.");
        setPlaying(false);
        return;
      }
      setHeard(true);
      const src = round.source as { duration?: number; seconds?: number };
      const ms = Math.round((src.duration || src.seconds || 1.2) * 1000) + 250;
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
      playTimerRef.current = setTimeout(() => setPlaying(false), ms);
    } catch {
      setPlaying(false);
      setAudioError("خطا در پخش صوت.");
    }
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
      accuracy: Math.max(0, Math.min(100, accuracy)),
      responseTimeMs,
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
          sessionId: sessionIdRef.current,
          exerciseType: isFreq ? activeExercise : undefined,
        },
      });
      if (!res.ok && res.quota) setQuotaBlocked(true);
    }
    stopLiveTone();
    setPhase("result");
  };

  const submitSlider = async () => {
    if (!round || picked || !heard || freeLocked || quotaBlocked || !round.targetHz) return;
    setPicked("slider");
    setLastGuessHz(guessHz);
    const { accuracy, hzErr, cents, perfect } = frequencyAccuracy(round.targetHz, guessHz, round.toleranceHz || 40);
    const correct = sliderPass(accuracy) || perfect;
    await finishRound(
      correct,
      accuracy,
      `${formatHz(guessHz)} در برابر ${formatHz(round.targetHz)} · خطای ${Math.round(hzErr)} Hz (${formatCents(cents)})`,
    );
  };

  const submitChoice = async (optionId: string) => {
    if (!round || picked || !heard || freeLocked || quotaBlocked) return;
    setPicked(optionId);
    const correct = optionId === round.correctOptionId;
    await finishRound(correct, choiceAccuracy(correct), correct ? "درست" : `پاسخ: ${round.reviewText}`);
  };

  const goNext = () => {
    stopLiveTone();
    stopPracticePlayback();
    setPlaying(false);
    if (roundIndex + 1 >= totalRounds || quotaBlocked) {
      if (onSessionEnd) {
        onSessionEnd({
          correct: outcomes.filter((o) => o.correct).length,
          total: outcomes.length,
          xp: sessionXp,
          gameId,
        });
        return;
      }
      setPhase("summary");
      return;
    }
    const idx = roundIndex + 1;
    setRoundIndex(idx);
    setPhase("play");
    buildRound(idx < (game?.warmup ?? 2) ? Math.max(1, level - 6) : level, idx);
  };

  const freqRoundScore = (acc: number) => Math.round((Math.max(0, Math.min(100, acc)) / 10) * 100) / 100;
  const freqSessionScore = outcomes.reduce((s, o) => s + freqRoundScore(o.accuracy), 0);
  const freqSessionMax = Math.max(1, outcomes.length) * 10;
  const freqResultLine = (acc: number) =>
    acc >= 95
      ? "تقریباً کامل. گوش‌ات درست شنید."
      : acc >= 85
        ? "خیلی نزدیک — یک قدم تا کمال."
        : acc >= 70
          ? "قبول شد؛ هنوز کمی بافر می‌خواهد."
          : acc >= 45
            ? "جهت درست، مقدار نه."
            : "گوش هنوز بافر می‌کند.";
  const freqSummaryLine = (score: number, max: number) => {
    const r = max > 0 ? score / max : 0;
    if (r >= 0.9) return "نزدیک به کمال — انگار پشیمانی می‌شنوی.";
    if (r >= 0.7) return "مسیر درست است؛ دقت هنوز جا دارد.";
    if (r >= 0.5) return "شروع قابل قبول. با تکرار بهتر می‌شود.";
    return "این دور گرم‌کردن بود.";
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
              <ArrowRight size={14} /> بازگشت
            </button>
          )}
          <p className="text-[11px] font-medium text-amber-300/90">{game.title}</p>
          <h1 className="mt-0.5 text-xl font-semibold text-sand-50 sm:text-2xl">{game.titleFa}</h1>
        </div>
        {phase === "intro" && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-[11px] text-ink-400">
            <div>سطح {level}/50</div>
            <div>{BAND_LABEL[band]}</div>
          </div>
        )}
      </header>

      {phase === "intro" && (
        <section className="card-ay mx-auto max-w-md space-y-4 p-5 sm:p-6">
          <p className="text-[11px] font-medium tracking-wide text-cyan-300/90">
            {isFreq ? "Frequency Memory · تطبیقی" : game.title}
          </p>
          <h2 className="text-lg font-semibold text-sand-50">{game.titleFa}</h2>
          <p className="text-[13px] leading-7 text-ink-400">
            {isFreq ? "بشنو، به‌خاطر بسپار و با اسلایدر همان pitch را بازسازی کن. سختی با عملکردت تنظیم می‌شود." : game.tagline}
          </p>
          {!pro && <p className="text-[12px] text-amber-200/80">رایگان: تا {stageLimit || 5} مرحله در روز</p>}
          <button type="button" className="btn-ay btn-ay-primary w-full" onClick={startSession}>
            شروع تمرین
          </button>
        </section>
      )}

      {phase === "play" && round && isFreq && (
        <div className="mx-auto w-full max-w-md">
          <div className="overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-ink-950 px-5 py-6 shadow-[0_24px_80px_-32px_rgba(0,0,0,.85)] sm:px-7">
            <div className="flex justify-between text-[11px] font-mono text-ink-500">
              <span>
                {roundIndex + 1} / {totalRounds}
              </span>
              <span>استریک {streak}</span>
            </div>

            <div className="pointer-events-none relative mx-auto mt-6 h-44 w-full max-w-[11rem]" aria-hidden>
              <svg viewBox="0 0 100 200" className="h-full w-full">
                <defs>
                  <linearGradient id="fmWaveG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5eead4" stopOpacity="0.95" />
                    <stop offset="45%" stopColor="#a78bfa" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#d4af37" stopOpacity="0.85" />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3, 4].map((i) => (
                  <path
                    key={i}
                    d={`M ${50 + (i - 2) * 9} 6 C ${78 + i * 3} 45, ${22 - i * 2} 85, ${50 + (i - 2) * 7} 110 C ${80 - i} 140, ${24 + i * 2} 165, ${50 + (i - 2) * 5} 194`}
                    fill="none"
                    stroke="url(#fmWaveG)"
                    strokeWidth={1.15 + i * 0.18}
                    opacity={0.32 + i * 0.12}
                    className={playing ? "origin-center animate-pulse" : ""}
                  />
                ))}
              </svg>
            </div>

            <p className="mt-1 text-center text-[11px] font-medium tracking-[0.16em] text-gold-500">
              {!heard ? "گوش بده" : "بازسازی کن"}
            </p>
            <p className="mt-2 text-center text-[15px] font-medium leading-7 text-sand-50">
              {!heard ? "یک‌بار هدف را پخش کن و pitch را به خاطر بسپار." : "اسلایدر را بکش — صدای حدست زنده پخش می‌شود."}
            </p>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                className={`btn-ay inline-flex items-center gap-2 ${!heard ? "btn-ay-primary" : ""}`}
                onClick={() => void playAudio()}
                disabled={playing}
              >
                <Play size={16} />
                {playing ? "در حال پخش…" : heard ? "پخش دوباره" : "پخش هدف"}
              </button>
            </div>
            {audioError && <p className="mt-3 text-center text-[12px] text-rose-400">{audioError}</p>}

            {round.mode === "slider" && heard && !picked && (
              <div className="mt-8 space-y-5">
                <div className="text-center">
                  <p className="text-[10px] font-medium tracking-[0.14em] text-ink-500">GUESS</p>
                  <p className="mt-1 font-mono text-4xl font-semibold tabular-nums tracking-tight text-sand-50 sm:text-5xl">
                    {formatHz(guessHz)}
                  </p>
                </div>
                <input
                  type="range"
                  min={round.sliderMin}
                  max={round.sliderMax}
                  step={1}
                  value={guessHz}
                  aria-label="تنظیم فرکانس حدس"
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-gold-500"
                  onPointerDown={() => {
                    void startLiveTone(guessHz);
                  }}
                  onChange={(e) => {
                    const hz = Number(e.target.value);
                    setGuessHz(hz);
                    setLiveToneHz(hz);
                    void startLiveTone(hz);
                  }}
                />
                <div className="flex justify-between font-mono text-[11px] text-ink-600">
                  <span>{formatHz(round.sliderMin || 0)}</span>
                  <span>{formatHz(round.sliderMax || 0)}</span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    className="btn-ay btn-ay-primary flex-1"
                    onClick={() => {
                      stopLiveTone();
                      void submitSlider();
                    }}
                  >
                    قفل پاسخ
                  </button>
                  <button type="button" className="btn-ay" onClick={() => void startLiveTone(guessHz)}>
                    پخش حدس
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {phase === "play" && round && !isFreq && (
        <section className="card-ay space-y-4 p-5">
          <div className="flex justify-between text-[12px] text-ink-500">
            <span>
              راند {roundIndex + 1} از {totalRounds}
            </span>
            <span>استریک {streak}</span>
          </div>
          <p className="text-[14px] font-medium text-sand-50">{round.prompt}</p>
          <button type="button" className="btn-ay inline-flex items-center gap-2" onClick={() => void playAudio()} disabled={playing}>
            <Play size={16} /> {playing ? "پخش…" : heard ? "پخش دوباره" : "پخش نمونه"}
          </button>
          {audioError && <p className="text-[12px] text-rose-400">{audioError}</p>}
          {round.mode === "choice" && round.options && heard && !picked && (
            <div className="grid gap-2 sm:grid-cols-2">
              {round.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-right text-[13px] text-sand-50"
                  onClick={() => void submitChoice(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {phase === "result" && feedback && isFreq && (
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-[1.75rem] border border-white/[0.08] bg-ink-950 px-5 py-6 sm:px-7">
            <div className="flex justify-between text-[11px] font-mono text-ink-500">
              <span>
                {roundIndex + 1} / {totalRounds}
              </span>
              <span className={feedback.correct ? "text-emerald-400" : ""}>{feedback.correct ? "قبول" : "رد"}</span>
            </div>
            <p className="mt-6 text-center font-mono text-5xl font-semibold tabular-nums text-sand-50 sm:text-6xl">
              {freqRoundScore(feedback.accuracy).toFixed(2)}
            </p>
            <p className="mt-1 text-center text-[12px] text-ink-500">از ۱۰</p>
            <p className="mt-4 text-center text-[14px] leading-7 text-ink-300">{freqResultLine(feedback.accuracy)}</p>
            {lastGuessHz != null && round?.targetHz != null && (
              <div className="mt-8 space-y-2 border-t border-white/[0.06] pt-6">
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] tracking-[0.14em] text-ink-500">TARGET</span>
                  <span className="font-mono text-2xl text-ink-400">{formatHz(round.targetHz)}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] tracking-[0.14em] text-ink-500">GUESS</span>
                  <span className="font-mono text-3xl font-semibold text-sand-50">{formatHz(lastGuessHz)}</span>
                </div>
              </div>
            )}
            <button type="button" className="btn-ay btn-ay-primary mt-8 w-full" onClick={goNext}>
              {roundIndex + 1 >= totalRounds ? "نتیجه جلسه" : "راند بعد"}
            </button>
          </div>
        </div>
      )}

      {phase === "result" && feedback && !isFreq && (
        <section className="card-ay space-y-3 p-5">
          <div className="flex items-center gap-2">
            {feedback.correct ? <Check className="text-emerald-300" size={20} /> : <X className="text-rose-300" size={20} />}
            <p className="text-[15px] font-medium text-sand-50">{feedback.correct ? "درست" : "نادرست"}</p>
          </div>
          <p className="text-[13px] text-ink-400">{feedback.detail}</p>
          <button type="button" className="btn-ay btn-ay-primary" onClick={goNext}>
            ادامه
          </button>
        </section>
      )}

      {phase === "summary" && isFreq && (
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-[1.75rem] border border-white/[0.08] bg-ink-950 px-5 py-6 sm:px-7">
            <p className="text-[11px] text-ink-500">
              سطح {level}/50 · {BAND_LABEL[band]}
            </p>
            <p className="mt-4 font-mono text-5xl font-semibold tabular-nums text-sand-50 sm:text-6xl">
              {freqSessionScore.toFixed(2)}
              <span className="text-2xl text-ink-500">/{freqSessionMax}</span>
            </p>
            <p className="mt-3 text-[14px] leading-7 text-ink-300">{freqSummaryLine(freqSessionScore, freqSessionMax)}</p>
            <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
              {outcomes.map((o, i) => (
                <div key={i} className="min-w-[4.25rem] flex-1 rounded-xl border border-white/[0.07] bg-white/[0.03] px-2 py-3 text-center">
                  <p className="font-mono text-[12px] text-sand-50">{freqRoundScore(o.accuracy).toFixed(2)}</p>
                  <svg viewBox="0 0 16 40" className="mx-auto mt-2 h-10 w-4" aria-hidden>
                    <path d="M8 2 C12 10, 4 18, 8 26 C12 32, 6 36, 8 38" fill="none" stroke={o.correct ? "#5eead4" : "#a78bfa"} strokeWidth="1.4" />
                  </svg>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[12px] text-ink-500">
              {outcomes.filter((o) => o.correct).length} از {outcomes.length} قبول · {sessionXp} XP
            </p>
            <div className="mt-6 flex gap-2">
              <button type="button" className="btn-ay btn-ay-primary flex-1" onClick={startSession}>
                <RotateCcw size={16} className="ml-1 inline" /> دوباره
              </button>
              <button type="button" className="btn-ay flex-1" onClick={onBack}>
                بازگشت
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "summary" && !isFreq && (
        <section className="card-ay space-y-3 p-5">
          <h2 className="text-lg font-semibold text-sand-50">خلاصه</h2>
          <p className="text-[13px] text-ink-400">
            {outcomes.filter((o) => o.correct).length} از {outcomes.length} درست · {sessionXp} XP
          </p>
          <button type="button" className="btn-ay btn-ay-primary" onClick={startSession}>
            دوباره
          </button>
        </section>
      )}

      {freeLocked && phase === "play" && (
        <p className="mt-4 text-[12px] text-amber-200/80">محدودیت رایگان امروز تمام شد.</p>
      )}
    </main>
  );
}
