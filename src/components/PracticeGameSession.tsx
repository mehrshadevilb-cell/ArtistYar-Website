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

  const totalRounds = Math.max(1, maxRounds ?? game?.rounds ?? 8);
  const stageNumber = roundIndex + 1;
  const freeLocked = !accessLoading && !pro && stageNumber > (stageLimit || 5);

  useEffect(() => {
    setLevel(loadLocalLevel(gameId));
    const stats = loadLocalStats();
    setStreak(stats.streak);
    return () => stopPracticePlayback();
  }, [gameId]);

  const buildRound = useCallback(
    (lvl: number, idx: number) => {
      const entropy = Math.floor(Math.random() * 1_000_000_000) ^ (Date.now() & 0xffffffff);
      const seed = (seedBase.current + idx * 97 + lvl * 13 + entropy) >>> 0;
      const r = generateRoundForGame(gameId, lvl, seed);
      setRound(r);
      setHeard(false);
      setPicked(null);
      setFeedback(null);
      setAudioError(null);
      setPlaying(false);
      stopPracticePlayback();
      setGuessHz(r.targetHz ? Math.round((r.sliderMin! + r.sliderMax!) / 2) : 440);
      startedAt.current = Date.now();
    },
    [gameId],
  );

  const startSession = () => {
    void unlockPracticeAudio();
    setPhase("play");
    setRoundIndex(0);
    setOutcomes([]);
    setSessionXp(0);
    setQuotaBlocked(false);
    seedBase.current = Date.now();
    const warm = Math.max(1, level - (game?.warmup ? 6 : 0));
    buildRound(warm, 0);
  };

  useEffect(() => {
    if (!autoStart || !game) return;
    const id = window.setTimeout(() => startSession(), 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const handle = await playExerciseRound({
        source: round.source,
        dsp,
      });
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
      window.setTimeout(() => setPlaying(false), ms);
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
    const { accuracy, hzErr, cents, perfect } = frequencyAccuracy(
      round.targetHz,
      guessHz,
      round.toleranceHz || 40,
    );
    const correct = sliderPass(accuracy) || perfect;
    const detail = `${formatHz(guessHz)} در برابر ${formatHz(round.targetHz)} · خطای ${Math.round(hzErr)} Hz (${formatCents(cents)})`;
    await finishRound(correct, accuracy, detail);
  };

  const finishRound = async (correct: boolean, accuracy: number, detail: string) => {
    if (!round) return;
    const responseTimeMs = Math.max(1, Date.now() - startedAt.current);
    const nextStreak = correct ? streak + 1 : 0;
    const xp = roundPreviewXp({
      correct,
      accuracy,
      level,
      responseTimeMs,
      streak: nextStreak,
    });
    setStreak(nextStreak);
    setSessionXp((x) => x + Math.max(0, xp));
    setFeedback({ correct, accuracy, detail, xp });

    const outcome: RoundOutcome = { correct, accuracy, responseTimeMs };
    const nextOutcomes = [...outcomes, outcome];
    setOutcomes(nextOutcomes);

    const newLevel = nextLevel(level, nextOutcomes);
    setLevel(newLevel);
    saveLocalLevel(gameId, newLevel);

    const stats = loadLocalStats();
    stats.xp += Math.max(0, xp);
    stats.plays += 1;
    stats.streak = nextStreak;
    stats.bestStreak = Math.max(stats.bestStreak, nextStreak);
    saveLocalStats(stats);

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
        extra: { mode: round.mode, guessHz: round.mode === "slider" ? guessHz : undefined },
      });
      if (!res.ok && res.quota) setQuotaBlocked(true);
    }

    setPhase("result");
  };

  const goNext = () => {
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
            <button
              type="button"
              onClick={onBack}
              className="mb-2 inline-flex items-center gap-1 text-xs text-ink-500 hover:text-ink-300"
            >
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
        <section className="card-ay space-y-4 p-6">
          <p className="text-sm leading-7 text-ink-300">
            {totalRounds} راند · {game.warmup} راند گرم‌آپ در سطوح پایین‌تر آسان‌تر است. سختی بر اساس
            دقت و سرعتت تنظیم می‌شود — تصادفی نیست.
          </p>
          <ul className="space-y-2 text-[13px] text-ink-400">
            <li>۱) گوش بده</li>
            <li>۲) تصمیم بگیر</li>
            <li>۳) بازخورد ببین و سطح بالا برود</li>
          </ul>
          {!pro && (
            <p className="text-[12px] text-amber-200/80">رایگان: تا {stageLimit || 5} مرحله در روز</p>
          )}
          <button type="button" className="btn-ay btn-ay-primary w-full sm:w-auto" onClick={startSession}>
            شروع بازی
          </button>
        </section>
      )}

      {phase === "play" && round && (
        <section className="space-y-4">
          <div className="flex items-center justify-between text-[11px] text-ink-500">
            <span>
              راند {stageNumber} از {totalRounds}
            </span>
            <span>استریک {streak}</span>
          </div>
          {freeLocked && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
              سقف رایگان امروز پر شد. برای ادامه Pro فعال کن یا فردا برگرد.
            </div>
          )}
          {quotaBlocked && (
            <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">
              محدودیت روزانه اعمال شد.
            </div>
          )}
          <div className="card-ay p-5 sm:p-6">
            <p className="text-[15px] font-medium text-sand-50">{round.prompt}</p>
            <p className="mt-2 text-[12px] leading-6 text-ink-500">{round.hint}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {round.referenceDsp ? (
                <>
                  <button
                    type="button"
                    className="btn-ay inline-flex items-center gap-2"
                    onClick={() => void playAudio("reference")}
                    disabled={freeLocked}
                  >
                    <Play size={16} aria-hidden />
                    {playing ? "…" : "A · اصلی"}
                  </button>
                  <button
                    type="button"
                    className="btn-ay btn-ay-primary inline-flex items-center gap-2"
                    onClick={() => void playAudio("challenge")}
                    disabled={freeLocked}
                  >
                    <Play size={16} aria-hidden />
                    {playing ? "…" : "B · تغییر یافته"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn-ay inline-flex items-center gap-2"
                  onClick={() => void playAudio("challenge")}
                  disabled={freeLocked}
                >
                  <Play size={16} aria-hidden />
                  {playing ? "در حال پخش…" : heard ? "پخش دوباره" : "پخش نمونه"}
                </button>
              )}
              {audioError && <p className="w-full text-[12px] text-rose-300">{audioError}</p>}
            </div>

            {!heard && (
              <p className="mt-4 text-[12px] text-ink-500">اول نمونه را پخش کن، بعد پاسخ بده.</p>
            )}

            {round.mode === "slider" && heard && (
              <div className="mt-6 space-y-3">
                <label className="block text-[12px] text-ink-400">
                  فرکانس حدسی: <strong className="text-sand-50">{formatHz(guessHz)}</strong>
                </label>
                <input
                  type="range"
                  min={round.sliderMin}
                  max={round.sliderMax}
                  value={guessHz}
                  onChange={(e) => setGuessHz(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                  aria-label="اسلایدر فرکانس"
                />
                <div className="flex justify-between text-[10px] text-ink-600">
                  <span>{formatHz(round.sliderMin || 40)}</span>
                  <span>{formatHz(round.sliderMax || 8000)}</span>
                </div>
                <button
                  type="button"
                  className="btn-ay btn-ay-primary"
                  onClick={() => void submitSlider()}
                  disabled={!!picked}
                >
                  ثبت پاسخ
                </button>
              </div>
            )}

            {round.mode === "choice" && heard && (
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {(round.options || []).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={!!picked || freeLocked}
                    onClick={() => void submitChoice(opt.id)}
                    className={`rounded-xl border px-4 py-3 text-right text-sm transition ${
                      picked === opt.id
                        ? "border-amber-400/50 bg-amber-400/10 text-sand-50"
                        : "border-white/10 bg-white/[0.03] text-ink-200 hover:border-white/20"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {phase === "result" && feedback && (
        <section className="card-ay space-y-4 p-6">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${
              feedback.correct ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"
            }`}
          >
            {feedback.correct ? <Check size={16} /> : <X size={16} />}
            {feedback.correct ? "درست" : "غلط"} · دقت {feedback.accuracy}%
          </div>
          <p className="text-sm text-ink-300">{feedback.detail}</p>
          <p className="text-[12px] text-ink-500">
            XP این راند: {feedback.xp > 0 ? `+${feedback.xp}` : feedback.xp} · سطح فعلی {level}
          </p>
          {round?.reviewText && (
            <p className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[13px] text-ink-400">
              {round.reviewText}
            </p>
          )}
          <button type="button" className="btn-ay btn-ay-primary" onClick={goNext}>
            {roundIndex + 1 >= totalRounds ? "پایان جلسه" : "راند بعد"}
          </button>
        </section>
      )}

      {phase === "summary" && (
        <section className="card-ay space-y-4 p-6">
          <h2 className="text-lg font-semibold text-sand-50">پایان جلسه</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="راند" value={String(outcomes.length)} />
            <Stat label="صحیح" value={String(outcomes.filter((o) => o.correct).length)} />
            <Stat label="XP جلسه" value={`+${sessionXp}`} />
            <Stat label="سطح" value={String(level)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-ay btn-ay-primary inline-flex items-center gap-2"
              onClick={startSession}
            >
              <RotateCcw size={14} /> دوباره
            </button>
            <button type="button" className="btn-ay" onClick={onBack}>
              بازگشت به منو
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[10px] text-ink-500">{label}</p>
      <p className="mt-1 text-base text-sand-50">{value}</p>
    </div>
  );
}
