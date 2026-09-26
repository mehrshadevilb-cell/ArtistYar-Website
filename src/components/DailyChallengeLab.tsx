"use client";

import { useMemo, useState } from "react";
import { PracticeGameSession } from "@/components/PracticeGameSession";
import { PRACTICE_GAMES } from "@/lib/practice-game";

type Props = { onBack?: () => void };

/** Fixed 5-game daily rotation from the professional catalog. */
const CHALLENGE_GAMES = [
  "freq-memory",
  "eq-detective",
  "comp-detective",
  "stereo-space",
  "pitch-lab",
] as const;

export function DailyChallengeLab({ onBack }: Props) {
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0, xp: 0 });

  const gameId = CHALLENGE_GAMES[index] || CHALLENGE_GAMES[0];
  const title = useMemo(
    () => PRACTICE_GAMES.find((g) => g.id === gameId)?.titleFa || gameId,
    [gameId],
  );

  if (finished) {
    return (
      <section className="container-ay py-8" dir="rtl">
        <div className="card-ay space-y-3 p-8 text-center">
          <p className="text-[11px] font-medium text-rose-300">چالش روزانه</p>
          <h1 className="text-2xl font-semibold text-sand-50">چالش امروز تکمیل شد</h1>
          <p className="mx-auto max-w-md text-sm leading-7 text-ink-400">
            {score.correct} از {score.total} درست · XP تقریبی +{score.xp}
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
        <span className="rounded-full border border-rose-400/20 bg-rose-400/[.05] px-3 py-1 text-[11px] text-rose-200">
          چالش روزانه · {index + 1}/۵ · {title}
        </span>
      </div>
      <PracticeGameSession
        key={gameId + "-" + index}
        gameId={gameId}
        maxRounds={1}
        autoStart
        hideBack
        onBack={onBack || (() => undefined)}
        onSessionEnd={(summary) => {
          setScore((s) => ({
            correct: s.correct + summary.correct,
            total: s.total + summary.total,
            xp: s.xp + summary.xp,
          }));
          if (index >= CHALLENGE_GAMES.length - 1) setFinished(true);
          else setIndex((i) => i + 1);
        }}
      />
    </section>
  );
}
