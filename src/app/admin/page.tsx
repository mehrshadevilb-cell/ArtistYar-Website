"use client";

import { StatusChip } from "@/components/StatusChip";
import { licenseStats, spotplayerLicensesImportedAt, spotplayerLicensesSource } from "@/data/spotplayer-licenses";

export default function AdminHomePage() {
  const stats = licenseStats();
  const cards = [
    { label: "لایسنس SpotPlayer", value: String(stats.total) },
    { label: "فعال‌شده", value: String(stats.activated) },
    { label: "فعال‌نشده", value: String(stats.inactive) },
    { label: "ساعت تماشا (تقریبی)", value: String(stats.watchHours) },
    { label: "دانلود تجمعی (GB)", value: String(stats.downloadGb) },
    { label: "منبع داده", value: "Excel واقعی" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.05] p-4">
        <p className="text-sm leading-7 text-ink-300">
          آمار از خروجی واقعی SpotPlayer ({spotplayerLicensesSource} · {spotplayerLicensesImportedAt}) خوانده می‌شود. اعداد آزمایشی حذف شده‌اند.
        </p>
        <StatusChip tone="ok">داده واقعی</StatusChip>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card-ay p-5">
            <p className="text-xs text-ink-500">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-sand-50">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="card-ay p-6 text-sm leading-7 text-ink-400">
        پرداخت و رزرو زنده از API راه‌یار در صفحات مربوطه وصل می‌شود. برای import کامل لایسنس‌ها داخل دیتابیس ربات، از
        <code className="mx-1 text-gold-400">scripts/import_spotplayer_licenses.py --apply</code>
        روی backend استفاده کن.
      </div>
    </div>
  );
}
