"use client";

import { useState } from "react";
import { CoreEarGym } from "@/components/CoreEarGym";

type Props = { onBack?: () => void };
const GAMES = ["tone", "eq", "compressor", "phase", "tone"] as const;

export function DailyChallengeLab({ onBack }: Props) {
  const [round, setRound] = useState(0);
  const [finished, setFinished] = useState(false);

  if (finished) return (
    <section className="container-ay py-8" dir="rtl">
      <div className="card-ay p-8 text-center">
        <p className="eyebrow text-rose-300">DAILY CHALLENGE</p>
        <h1 className="mt-3 text-2xl font-semibold text-sand-50">چالش امروز تکمیل شد</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-ink-400">پنج راند چالش امروز ثبت شد.</p>
        <button type="button" className="btn-primary mt-6" onClick={onBack}>بازگشت به تمرین‌خانه</button>
      </div>
    </section>
  );

  return (
    <section dir="rtl">
      <div className="container-ay flex items-center justify-between gap-3 pt-5">
        <button type="button" className="btn-ghost !px-3 !py-2 text-xs" onClick={onBack}>بازگشت</button>
        <span className="rounded-full border border-rose-400/20 bg-rose-400/[.05] px-3 py-1 text-[11px] text-rose-200">چالش روزانه · راند {round + 1} از ۵</span>
      </div>
      <CoreEarGym
        key={round}
        initialGame={GAMES[round]}
        title="چالش روزانه"
        onBack={onBack}
        onComplete={() => round === 4 ? setFinished(true) : setRound((v) => v + 1)}
      />
    </section>
  );
}
