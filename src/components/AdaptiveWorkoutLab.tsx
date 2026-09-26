"use client";

import { useMemo, useState } from "react";
import { PracticeGameSession } from "@/components/PracticeGameSession";
import { PRACTICE_GAMES } from "@/lib/practice-game";

type Props = { onBack?: () => void; mode?: "workout" | "practice" };

const WORKOUT_GAMES = [
  "freq-memory",
  "eq-detective",
  "comp-detective",
  "pitch-lab",
  "rhythm-lab",
] as const;

export function AdaptiveWorkoutLab({ onBack, mode = "workout" }: Props) {
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0, xp: 0 });

  const targetRounds = mode === "workout" ? WORKOUT_GAMES.length : 1;
  const gameId = WORKOUT_GAMES[index % WORKOUT_GAMES.length];
  const title = useMemo(
    () => PRACTICE_GAMES.find((g) => g.id === gameId)?.titleFa || gameId,
    [gameId],
  );

  if (finished) {
    return (
      <section className="container-ay py-8" dir="rtl">
        <div className="card-ay space-y-3 p-8 text-center">
          <p className="text-[11px] font-medium text-amber-300">
            {mode === "workout" ? "ورک‌اوت هوشمند" : "تمرین آزاد"}
          </p>
          <h1 className="text-2xl font-semibold text-sand-50">
            {mode === "workout" ? "تمرین هوشمند امروز تمام شد" : "تمرین آزاد تمام شد"}
          </h1>
          <p className="mx-auto max-w-md text-sm leading-7 text-ink-400">
            {score.total > 0
              ? `${score.correct} از ${score.total} درست · XP تقریبی +${score.xp}`
              : "نتیجه‌ها در صورت ورود به حساب ذخیره شده‌اند."}
          </p>
          <button type="button" className="btn-ay btn-ay-primary mt-4" onClick={onBack}>
            بازگشت به تمرین‌خانه
          </button>
        </div>
      </section>
    );
  }

  return (
    <section dir="rtl">
      <div className="container-ay flex items-center justify-between gap-3 pt-5">
        <button type="button" className="btn-ay !px-3 !py-2 text-xs" onClick={onBack}>
          بازگشت
        </button>
        <span className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1 text-[11px] text-ink-400">
          {mode === "workout"
            ? `ورک‌اوت · ${index + 1}/${targetRounds} · ${title}`
            : `تمرین آزاد · ${title}`}
        </span>
      </div>
      <PracticeGameSession
        key={gameId + "-" + index + "-" + mode}
        gameId={gameId}
        maxRounds={mode === "workout" ? 2 : 4}
        autoStart
        hideBack
        onBack={onBack || (() => undefined)}
        onSessionEnd={(summary) => {
          setScore((s) => ({
            correct: s.correct + summary.correct,
            total: s.total + summary.total,
            xp: s.xp + summary.xp,
          }));
          if (mode === "practice" || index + 1 >= targetRounds) setFinished(true);
          else setIndex((i) => i + 1);
        }}
      />
    </section>
  );
}
