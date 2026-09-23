"use client";

import { useState } from "react";
import { CoreEarGym } from "@/components/CoreEarGym";

type Props = { onBack?: () => void; mode?: "workout" | "practice" };
const GAMES = ["tone", "eq", "compressor", "phase"] as const;

export function AdaptiveWorkoutLab({ onBack, mode = "workout" }: Props) {
  const [round, setRound] = useState(0);
  const [finished, setFinished] = useState(false);
  const targetRounds = mode === "workout" ? 5 : 1;

  if (finished) return (
    <section className="container-ay py-8" dir="rtl">
      <div className="card-ay p-8 text-center">
        <p className="eyebrow text-gold-300">PRACTICE COMPLETE</p>
        <h1 className="mt-3 text-2xl font-semibold text-sand-50">{mode === "workout" ? "تمرین هوشمند امروز تمام شد" : "تمرین آزاد تمام شد"}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-ink-400">نتیجه‌ها در صورت ورود به حساب ذخیره شده‌اند.</p>
        <button type="button" className="btn-primary mt-6" onClick={onBack}>بازگشت به تمرین‌خانه</button>
      </div>
    </section>
  );

  return (
    <section dir="rtl">
      <div className="container-ay flex items-center justify-between gap-3 pt-5">
        <button type="button" className="btn-ghost !px-3 !py-2 text-xs" onClick={onBack}>بازگشت</button>
        <span className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1 text-[11px] text-ink-400">
          {mode === "workout" ? "ورک‌اوت تطبیقی · راند " + (round + 1) + " از " + targetRounds : "تمرین آزاد"}
        </span>
      </div>
      <CoreEarGym
        key={round}
        initialGame={GAMES[round % GAMES.length]}
        title={mode === "workout" ? "تمرین هوشمند امروز" : "تمرین آزاد"}
        onBack={onBack}
        onComplete={() => round + 1 >= targetRounds ? setFinished(true) : setRound((v) => v + 1)}
      />
    </section>
  );
}
