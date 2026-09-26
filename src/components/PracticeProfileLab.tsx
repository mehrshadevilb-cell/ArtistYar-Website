"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { PracticeProgressPanel } from "@/components/PracticeProgressPanel";
import {
  PRACTICE_GAMES,
  loadLocalLevel,
  loadLocalStats,
  bandForLevel,
  BAND_LABEL,
  practiceGameTitleFa,
} from "@/lib/practice-game";

type Props = { onBack?: () => void };

export function PracticeProfileLab({ onBack }: Props) {
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [stats, setStats] = useState({ xp: 0, streak: 0, bestStreak: 0, plays: 0 });

  useEffect(() => {
    const map: Record<string, number> = {};
    for (const g of PRACTICE_GAMES) map[g.id] = loadLocalLevel(g.id);
    setLevels(map);
    setStats(loadLocalStats());
  }, []);

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
        <p className="text-[11px] font-medium text-amber-300/90">پروفایل تمرین</p>
        <h1 className="mt-1 text-xl font-semibold text-sand-50 sm:text-2xl">پیشرفت و لیدربورد</h1>
        <p className="mt-2 max-w-xl text-[13px] leading-6 text-ink-500">
          XP، سطح بازی‌ها، استریک و جدول آنلاین — با ورود به حساب همگام می‌شود.
        </p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="XP محلی" value={String(stats.xp)} />
        <Stat label="جلسات" value={String(stats.plays)} />
        <Stat label="استریک" value={String(stats.streak)} />
        <Stat label="بهترین استریک" value={String(stats.bestStreak)} />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-sand-50">سطح بازی‌ها</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {PRACTICE_GAMES.map((g) => {
            const lvl = levels[g.id] ?? 1;
            return (
              <div
                key={g.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <div>
                  <p className="text-sm text-sand-50">{practiceGameTitleFa(g.id)}</p>
                  <p className="text-[11px] text-ink-500">{BAND_LABEL[bandForLevel(lvl)]}</p>
                </div>
                <span className="text-sm tabular-nums text-amber-200">{lvl}/50</span>
              </div>
            );
          })}
        </div>
      </section>

      <PracticeProgressPanel />
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
