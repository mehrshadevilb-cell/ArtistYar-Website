"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Crown, UserRound } from "lucide-react";
import { PracticeProgressPanel } from "@/components/PracticeProgressPanel";
import { SkillEngineDashboard } from "@/components/SkillEngineDashboard";
import { useAuth } from "@/components/AuthProvider";
import {
  PRACTICE_GAMES,
  loadLocalLevel,
  loadLocalStats,
  bandForLevel,
  BAND_LABEL,
  practiceGameTitleFa,
} from "@/lib/practice-game";

export default function PracticeProfilePage() {
  const { user } = useAuth();
  const [pro, setPro] = useState(false);
  const [proExpires, setProExpires] = useState<string | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number | null>(5);
  const [used, setUsed] = useState(0);
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [stats, setStats] = useState({ xp: 0, streak: 0, bestStreak: 0, plays: 0 });

  useEffect(() => {
    const map: Record<string, number> = {};
    for (const g of PRACTICE_GAMES) map[g.id] = loadLocalLevel(g.id);
    setLevels(map);
    setStats(loadLocalStats());
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    fetch("/api/practice/status?userId=" + encodeURIComponent(user.id), {
      cache: "no-store",
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d?.ok) return;
        setPro(Boolean(d.pro));
        setProExpires(d.proExpiresAt || null);
        setDailyLimit(d.pro ? null : Math.max(1, Number(d.dailyLimit) || 5));
        setUsed(Number(d.used) || 0);
      })
      .catch(() => {});
  }, [user?.id]);

  return (
    <main className="container-ay py-12 sm:py-16" dir="rtl">
      <Link href="/practice" className="btn-ghost !px-4 !py-2 text-xs">
        <ArrowRight size={14} /> بازگشت به تمرین‌ها
      </Link>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400/10 text-gold-300">
          <UserRound size={22} />
        </span>
        <div>
          <span className="eyebrow">PROFILE · PRACTICE</span>
          <h1 className="mt-1 text-2xl font-semibold text-sand-50">پروفایل تمرین و رکوردها</h1>
          <p className="mt-1 text-sm text-ink-400">{user?.fullName || user?.username || "مهمان"}</p>
        </div>
      </div>

      <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-400">
        رکوردهای بازی‌ها، XP، اشتراک Pro و جایگاه جدول امتیازات اینجا جمع می‌شوند. هر تغییری که ادمین روی اشتراک
        اعمال کند، در همین پروفایل دیده می‌شود.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="card-ay p-4">
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <Crown size={14} className={pro ? "text-emerald-300" : "text-gold-300"} />
            اشتراک Practice
          </div>
          <strong className="mt-2 block text-lg text-sand-50">{pro ? "Pro فعال" : "رایگان"}</strong>
          <span className="text-xs text-ink-500">
            {pro && proExpires
              ? `تا ${new Date(proExpires).toLocaleDateString("fa-IR")}`
              : "۵ مرحله برای هر تمرین در روز · ارتقا برای دسترسی بدون سقف"}
          </span>
        </div>
        <div className="card-ay p-4">
          <span className="text-xs text-ink-500">سهمیه امروز</span>
          <strong className="mt-2 block text-lg text-sand-50">
            {used} / {dailyLimit === null ? "∞" : dailyLimit}
          </strong>
          <span className="text-xs text-ink-500">{pro ? "دسترسی بدون سقف تا پایان اشتراک" : "مرحله مصرف‌شده"}</span>
        </div>
        <div className="card-ay p-4">
          <span className="text-xs text-ink-500">پیشرفت محلی</span>
          <strong className="mt-2 block text-lg text-sand-50">{stats.xp.toLocaleString()} XP</strong>
          <span className="text-xs text-ink-500">
            {stats.plays} جلسه · استریک {stats.streak}
          </span>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-sand-50">سطح شش بازی اصلی</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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

      <SkillEngineDashboard />
      <div className="mt-8">
        <PracticeProgressPanel />
      </div>
    </main>
  );
}
