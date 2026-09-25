"use client";

import { ArrowRight, Crown, Sparkles } from "lucide-react";
import Link from "next/link";

type Props = {
  onBack?: () => void;
  title?: string;
  body?: string;
};

/**
 * Gate shown when a free user tries to open a Pro-only practice lab.
 * Pro is subscription-period based (not stage-based).
 */
export function ProGate({
  onBack,
  title = "دسترسی Pro",
  body = "این بخش مخصوص مشترکین Practice Pro است. با اشتراک Pro محدودیت روزانه نداری و تمام مسیرهای حرفه‌ای باز می‌شود.",
}: Props) {
  return (
    <section dir="rtl" className="mt-10">
      {onBack ? (
        <button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>
          <ArrowRight size={14} /> بازگشت
        </button>
      ) : null}
      <div className="mt-5 overflow-hidden rounded-3xl border border-gold-400/25 bg-gradient-to-br from-gold-400/[.12] via-white/[.03] to-violet-500/[.08] p-6 sm:p-10">
        <div className="flex items-center gap-2 text-gold-300">
          <Crown size={18} />
          <p className="eyebrow">PRACTICE PRO</p>
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-sand-50">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-300">{body}</p>
        <ul className="mt-5 space-y-2 text-sm text-ink-200">
          <li className="flex items-start gap-2">
            <Sparkles size={14} className="mt-1 shrink-0 text-gold-300" />
            دسترسی نامحدود در مدت اشتراک (نه محدودیت مرحله‌ای)
          </li>
          <li className="flex items-start gap-2">
            <Sparkles size={14} className="mt-1 shrink-0 text-gold-300" />
            Professional Audio Skills، Adaptive Workout و آزمایشگاه‌های پیشرفته
          </li>
          <li className="flex items-start gap-2">
            <Sparkles size={14} className="mt-1 shrink-0 text-gold-300" />
            XP، استریک، چالش روزانه و پروفایل پیشرفت کامل
          </li>
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/practice#pro" className="btn-primary !px-5 !py-2.5 text-sm">
            فعال‌سازی Pro
          </Link>
          {onBack ? (
            <button type="button" className="btn-ghost !px-5 !py-2.5 text-sm" onClick={onBack}>
              ادامه با تمرین رایگان
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default ProGate;
