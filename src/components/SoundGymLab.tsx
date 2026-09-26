"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { PRACTICE_GAMES, loadLocalLevel, bandForLevel, BAND_LABEL } from "@/lib/practice-game";
import { PracticeGameSession } from "@/components/PracticeGameSession";

type Props = { onBack?: () => void; initialExercise?: string };

const ACCENT: Record<string, string> = {
  cyan: "border-cyan-400/25 bg-cyan-400/5",
  amber: "border-amber-400/25 bg-amber-400/5",
  rose: "border-rose-400/25 bg-rose-400/5",
  violet: "border-violet-400/25 bg-violet-400/5",
  emerald: "border-emerald-400/25 bg-emerald-400/5",
  gold: "border-amber-300/25 bg-amber-300/5",
};

export function SoundGymLab({ onBack, initialExercise }: Props) {
  const initial =
    PRACTICE_GAMES.find((g) => g.id === initialExercise || g.apiGameId === initialExercise)?.id ||
    null;
  const [active, setActive] = useState<string | null>(initial);
  const [levels, setLevels] = useState<Record<string, number>>({});

  useEffect(() => {
    const map: Record<string, number> = {};
    for (const g of PRACTICE_GAMES) map[g.id] = loadLocalLevel(g.id);
    setLevels(map);
  }, [active]);

  if (active) {
    return <PracticeGameSession gameId={active} onBack={() => setActive(null)} />;
  }

  return (
    <main className="practice-shell container-ay relative pb-16 pt-6 sm:pt-10" dir="rtl">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1 text-xs text-ink-500 hover:text-ink-300"
        >
          <ArrowRight size={14} aria-hidden /> بازگشت
        </button>
      )}
      <header className="mb-6">
        <p className="text-[11px] font-medium text-amber-300/90">باشگاه گوش</p>
        <h1 className="mt-1 text-xl font-semibold text-sand-50 sm:text-2xl">شش بازی حرفه‌ای</h1>
        <p className="mt-2 max-w-xl text-[13px] leading-6 text-ink-500">
          هر بازی سطح ۱ تا ۵۰ دارد. سختی با دقت و سرعتت بالا می‌رود — نه تصادفی.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {PRACTICE_GAMES.map((g) => {
          const lvl = levels[g.id] ?? 1;
          const band = bandForLevel(lvl);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setActive(g.id)}
              className={`card-ay flex w-full items-start gap-3 p-4 text-right transition active:scale-[0.99] sm:p-5 ${ACCENT[g.accent] || ACCENT.cyan}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-medium tracking-wide text-ink-500">{g.title}</span>
                <strong className="mt-0.5 block text-[15px] text-sand-50 sm:text-base">{g.titleFa}</strong>
                <span className="mt-1 block text-[11px] leading-5 text-ink-500 sm:text-xs">{g.tagline}</span>
                <span className="mt-2 block text-[10px] text-ink-600">
                  سطح {lvl} · {BAND_LABEL[band]}
                </span>
              </span>
              <ChevronLeft className="mt-1 h-4 w-4 shrink-0 text-ink-600" aria-hidden />
            </button>
          );
        })}
      </div>
    </main>
  );
}
