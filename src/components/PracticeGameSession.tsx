"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Play, RotateCcw, X } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { usePracticeAccess } from "@/components/usePracticeAccess";
import { FrequencyMemoryDial } from "@/components/FrequencyMemoryDial";
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
  buildSessionPlan,
  FREQ_EXERCISES,
} from "@/lib/practice-game";
import "@/styles/practice-shell.css";

type Phase = "intro" | "play" | "result" | "summary" | "ready";
type FreqSub = "listen" | "remember" | "recreate";
type ReadyWord = "ready" | "set" | "go";

const REMEMBER_MS = 2000;
const FM_TIMING = {
  readyMs: 700,
  setMs: 600,
  goMs: 500,
} as const;

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
  const [freqSub, setFreqSub] = useState<FreqSub>("listen");
  const freqSubRef = useRef<FreqSub>("listen");
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
  const [rememberLeft, setRememberLeft] = useState(0);
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
  const rememberTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rememberTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [sessionPlan, setSessionPlan] = useState<SessionPlan | null>(null);
  const [activeExercise, setActiveExercise] = useState<FreqExerciseType>("general");
  const [lastGuessHz, setLastGuessHz] = useState<number | null>(null);
  const submitLockRef = useRef(false);
  const sessionStartedRef = useRef(false);
  const [readyWord, setReadyWord] = useState<ReadyWord>("ready");
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userId = user?.id || null;
  const isFreq = gameId === "freq-memory";
  const isInterval = gameId === "interval-recognition";
  const totalRounds = Math.max(1, maxRounds ?? (isFreq ? 5 : game?.rounds ?? 8));
  const freeLocked = !accessLoading && !pro && roundIndex + 1 > (stageLimit || 5);

  const clearTimers = () => {
    if (playTimerRef.current) {
      clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }
    if (rememberTimerRef.current) {
      clearTimeout(rememberTimerRef.current);
      rememberTimerRef.current = null;
    }
    if (rememberTickRef.current) {
      clearInterval(rememberTickRef.current);
      rememberTickRef.current = null;
    }
    if (readyTimerRef.current) {
      clearTimeout(readyTimerRef.current);
      readyTimerRef.current = null;
    }
  };

  useEffect(() => {
    sessionStartedRef.current = false;
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
      clearTimers();
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

  const enterRemember = useCallback((durationMs = REMEMBER_MS) => {
    stopLiveTone();
    stopPracticePlayback();
    setPlaying(false);
    freqSubRef.current = "remember";
    setFreqSub("remember");
    const total = Math.max(1200, Math.min(3000, Math.round(durationMs * 0.9)));
    setRememberLeft(Math.ceil(total / 1000));
    if (rememberTickRef.current) clearInterval(rememberTickRef.current);
    rememberTickRef.current = setInterval(() => {
      setRememberLeft((s) => Math.max(0, s - 1));
    }, 1000);
    if (rememberTimerRef.current) clearTimeout(rememberTimerRef.current);
    rememberTimerRef.current = setTimeout(() => {
      if (rememberTickRef.current) {
        clearInterval(rememberTickRef.current);
        rememberTickRef.current = null;
      }
      setRememberLeft(0);
      freqSubRef.current = "recreate";
      setFreqSub("recreate");
      startedAt.current = Date.now();
    }, total);
  }, []);

  const buildRound = useCallback(
    (lvl: number, idx: number) => {
      clearTimers();
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
      submitLockRef.current = false;
      setLastGuessHz(null);
      setFeedback(null);
      setAudioError(null);
      setPlaying(false);
      setFreqSub("listen");
      freqSubRef.current = "listen";
      stopLiveTone();
      stopPracticePlayback();
      setGuessHz(r.targetHz ? Math.round(((r.sliderMin || 0) + (r.sliderMax || 0)) / 2) : 440);
      startedAt.current = Date.now();
    },
    [gameId, maxRounds, game?.rounds],
  );

  const startSession = () => {
    sessionStartedRef.current = true;
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
    if (!autoStart || !game || isFreq) return;
    const id = window.setTimeout(() => startSession(), 0);
    return () => window.clearTimeout(id);
  }, [autoStart, gameId]);

  const playAudio = useCallback(async () => {
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
      const ms = Math.round((src.duration || src.seconds || 1.2) * 1000) + 80;
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
      playTimerRef.current = setTimeout(() => {
        setPlaying(false);
        playTimerRef.current = null;
        if (isFreq && freqSubRef.current === "listen") {
          enterRemember(ms);
        }
      }, ms);
    } catch {
      setPlaying(false);
      setAudioError("خطا در پخش صوت.");
    }
  }, [enterRemember, isFreq, round]);

  useEffect(() => {
    if (
      !isFreq ||
      phase !== "play" ||
      freqSub !== "listen" ||
      !round ||
      heard ||
      freeLocked ||
      quotaBlocked ||
      !sessionStartedRef.current
    ) {
      return;
    }
    const id = window.setTimeout(() => {
      void playAudio();
    }, 0);
    return () => window.clearTimeout(id);
  }, [freeLocked, freqSub, heard, isFreq, phase, playAudio, quotaBlocked, round]);

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
    if (!round || picked || submitLockRef.current || freeLocked || quotaBlocked || !round.targetHz) return;
    if (isFreq && freqSub !== "recreate") return;
    if (!isFreq && !heard) return;
    submitLockRef.current = true;
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
    if (!round || picked || submitLockRef.current || !heard || freeLocked || quotaBlocked) return;
    submitLockRef.current = true;
    setPicked(optionId);
    const correct = optionId === round.correctOptionId;
    await finishRound(correct, choiceAccuracy(correct), correct ? "درست" : `پاسخ: ${round.reviewText}`);
  };

  const beginNextFromReady = useCallback(() => {
    clearTimers();
    const idx = roundIndex + 1;
    setRoundIndex(idx);
    setReadyWord("ready");
    setPhase("play");
    buildRound(idx < (game?.warmup ?? 2) ? Math.max(1, level - 6) : level, idx);
  }, [roundIndex, game?.warmup, level, buildRound]);

  const runReadySequence = useCallback(() => {
    clearTimers();
    setReadyWord("ready");
    setPhase("ready");
    readyTimerRef.current = setTimeout(() => {
      setReadyWord("set");
      readyTimerRef.current = setTimeout(() => {
        setReadyWord("go");
        readyTimerRef.current = setTimeout(() => {
          beginNextFromReady();
        }, FM_TIMING.goMs);
      }, FM_TIMING.setMs);
    }, FM_TIMING.readyMs);
  }, [beginNextFromReady]);

  const advanceToNextRound = () => {
    stopLiveTone();
    stopPracticePlayback();
    setPlaying(false);
    clearTimers();
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
    if (isFreq) {
      runReadySequence();
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
    acc >= 97
      ? "دقیق؛ تقریباً بی‌نقص."
      : acc >= 90
        ? "همان حوالی است؛ کمی دیگر دقت کن."
        : acc >= 78
          ? "نزدیک بود؛ اما هنوز همان زیر و بمی نیست."
          : acc >= 55
            ? "خیابان اشتباه؛ دوباره گوش بده."
            : acc >= 30
              ? "فاصله زیاد است؛ دوباره امتحان کن."
              : "در طیف گم شدی؛ از نو گوش بده.";
  const freqSummaryLine = (score: number, max: number) => {
    const r = max > 0 ? score / max : 0;
    if (r >= 0.9) return "نزدیک به کمال — انگار پشیمانی می‌شنوی.";
    if (r >= 0.7) return "مسیر درست است؛ دقت هنوز جا دارد.";
    if (r >= 0.5) return "شروع قابل قبول. با تکرار بهتر می‌شود.";
    return "این دور گرم‌کردن بود.";
  };
  const band = bandForLevel(level);

  // Dialed-style result dwell: let the score count-up and result overlay
  // remain visible briefly, then advance automatically into ready/set/go.
  useEffect(() => {
    if (!isFreq || phase !== "result" || !feedback) return;
    const id = window.setTimeout(() => {
      advanceToNextRound();
    }, 2000);
    return () => window.clearTimeout(id);
  }, [advanceToNextRound, feedback, isFreq, phase]);

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

  // Reference parity: the listen/remember wave follows the heard target's
  // frequency visually, while the recreate wave follows the user's guess.
  // The numeric target remains hidden until the result state.
  const waveHz = isFreq && round && (freqSub === "listen" || freqSub === "remember")
    ? round.targetHz
    : guessHz;
  const safeWaveHz = Number.isFinite(waveHz) && waveHz > 0 ? waveHz : guessHz;

  return (
    <main className={`practice-shell container-ay relative pb-16 pt-6 sm:pt-10 ${isFreq && phase === "play" ? "practice-focus" : ""}`} dir="rtl">
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
        <section className={isFreq ? "fm-intro-card" : "card-ay mx-auto max-w-md space-y-4 p-5 sm:p-6"}>
          <p className={isFreq ? "fm-intro-eyebrow" : "text-[11px] font-medium tracking-wide text-cyan-300/90"}>
            {isFreq ? "حافظهٔ فرکانس · تطبیقی" : game.title}
          </p>
          <h2 className={isFreq ? "fm-intro-title" : "text-lg font-semibold text-sand-50"}>{game.titleFa}</h2>
          <p className={isFreq ? "fm-intro-copy" : "text-[13px] leading-7 text-ink-400"}>
            {isFreq
              ? "بشنو، به‌خاطر بسپار، بعد با کشیدن روی صفحه همان زیر و بمی را بازسازی کن."
              : game.tagline}
          </p>
          {!pro && <p className={isFreq ? "fm-intro-copy" : "text-[12px] text-amber-200/80"}>رایگان: تا {stageLimit || 5} مرحله در روز</p>}
          {isFreq && <div className="fm-intro-meta" aria-label="وضعیت تمرین"><span>۵ راند</span><span>سطح {level}/50</span><span>{BAND_LABEL[band]}</span></div>}
          <button type="button" className={isFreq ? "fm-intro-cta" : "btn-ay btn-ay-primary w-full"} onClick={startSession}>
            شروع تمرین
          </button>
        </section>
      )}

      {phase === "play" && round && isFreq && (
        <div className="fm-dialed-wrap">
          {freqSub === "remember" && (
            <p className="fm-remember-count" aria-live="polite">
              سکوت… به‌خاطر بسپار{rememberLeft > 0 ? ` · ${rememberLeft}` : ""}
            </p>
          )}
          <FrequencyMemoryDial
            minHz={round.sliderMin || 100}
            maxHz={round.sliderMax || 2000}
            valueHz={guessHz}
            waveHz={safeWaveHz}
            mode={freqSub}
            playing={playing}
            disabled={freeLocked || quotaBlocked}
            targetHz={round.targetHz}
            audioError={audioError}
            onChangeHz={setGuessHz}
            onLock={() => void submitSlider()}
            onReplay={() => void playAudio()}
            showReplay={freqSub === "listen" || (freqSub === "recreate" && heard)}
            replayLabel={freqSub === "listen" ? (heard ? "پخش دوباره هدف" : "پخش هدف") : "پخش دوباره هدف"}
            roundLabel={`${roundIndex + 1} / ${totalRounds}`}
            brandLabel="ArtistYar"
          />
          {freeLocked && <p className="mt-3 text-center text-[12px] text-amber-200/80">محدودیت رایگان امروز تمام شد.</p>}
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
            <div className="grid gap-2">
              {round.options.map((opt) => (
                <button key={opt.id} type="button" className="btn-ay w-full text-right" onClick={() => void submitChoice(opt.id)}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {phase === "result" && feedback && isFreq && (
        <div className="fm-dialed-wrap">
          <FrequencyMemoryDial
            minHz={round?.sliderMin || 100}
            maxHz={round?.sliderMax || 2000}
            valueHz={lastGuessHz ?? guessHz}
            waveHz={lastGuessHz ?? guessHz}
            mode="result"
            disabled
            targetHz={round?.targetHz}
            revealTarget
            onChangeHz={() => {}}
            resultScore={freqRoundScore(feedback.accuracy)}
            resultFeedback={freqResultLine(feedback.accuracy)}
            roundLabel={`${roundIndex + 1} / ${totalRounds}`}
            brandLabel="ArtistYar"
          />
        </div>
      )}

      {phase === "result" && feedback && !isFreq && (
        <section className="card-ay space-y-3 p-5">
          <p className={feedback.correct ? "text-emerald-400" : "text-rose-400"}>{feedback.correct ? "درست" : "نادرست"}</p>
          <p className="text-[13px] text-ink-400">{feedback.detail}</p>
          <button type="button" className="btn-ay btn-ay-primary" onClick={advanceToNextRound}>
            ادامه
          </button>
        </section>
      )}

      {phase === "ready" && isFreq && (
        <div className="fm-rsgo" dir="rtl" key={readyWord}>
          <span className="fm-rsgo-top">
            {roundIndex + 2} / {totalRounds}
          </span>
          <span className="fm-rsgo-word">
            {readyWord === "ready" ? "آماده" : readyWord === "set" ? "تنظیم" : "برو"}
          </span>
        </div>
      )}

      {phase === "summary" && isFreq && (
        <div className="fm-glass-card">
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
    </main>
  );
}
