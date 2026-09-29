"use client";

import Link from "next/link";
import { Activity, Bot, FileText, Image, LineChart, ListChecks, Settings, ShieldCheck, Sparkles, Workflow } from "lucide-react";

const groups = [
  {
    title: "مدیریت سایت",
    description: "محتوا، رسانه و تنظیمات نمایشی سایت را از یک نقطه مدیریت کن.",
    items: [
      ["/admin/content", "محتوا و آموزش", FileText],
      ["/admin/media", "رسانه‌ها", Image],
      ["/admin/seo", "سئو", Sparkles],
    ],
  },
  {
    title: "ابزارها",
    description: "ابزارهای عملیاتی که در کار روزانه لازم داری.",
    items: [
      ["/admin/ai", "راه‌یار / AI", Bot],
      ["/admin/music-generator", "Music Generator", Sparkles],
      ["/admin/plugins", "Telegram Plugins", Workflow],
      ["/admin/analytics", "تحلیل و آمار", LineChart],
    ],
  },
  {
    title: "سیستم",
    description: "سلامت، خطاها، فعالیت‌های حساس و تنظیمات امنیتی.",
    items: [
      ["/admin/system", "سلامت سیستم", Activity],
      ["/admin/problems", "مشکلات", ListChecks],
      ["/admin/audit", "گزارش فعالیت‌ها", ShieldCheck],
      ["/admin/automation", "اتوماسیون", Workflow],
      ["/admin/settings", "تنظیمات", Settings],
    ],
  },
] as const;

export default function AdminManagePage() {
  return (
    <div className="space-y-6" dir="rtl">
      <header>
        <p className="eyebrow">/ مدیریت</p>
        <h1 className="mt-2 text-2xl font-semibold text-sand-50">مدیریت سایت و سیستم</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-400">
          Navigation اصلی عمداً کوچک نگه داشته شده؛ ابزارهای تخصصی از همین مرکز در دسترس هستند و دیگر Sidebar را شلوغ نمی‌کنند.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {groups.map((group) => (
          <section key={group.title} className="card-ay p-5">
            <h2 className="text-base font-medium text-sand-50">{group.title}</h2>
            <p className="mt-2 text-xs leading-6 text-ink-500">{group.description}</p>
            <div className="mt-4 space-y-2">
              {group.items.map(([href, label, Icon]) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.02] p-3 transition hover:border-gold-400/30 hover:bg-white/[.04]"
                >
                  <Icon size={16} className="shrink-0 text-gold-400" />
                  <span className="text-sm text-sand-100">{label}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
