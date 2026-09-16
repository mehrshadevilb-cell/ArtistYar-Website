"use client";

import { adminStats } from "@/lib/demo-data";
import { StatusChip } from "@/components/StatusChip";

export default function AdminHomePage() {
  const cards = [
    { label: "پرداخت در انتظار", value: adminStats.pendingPayments },
    { label: "رزرو در انتظار", value: adminStats.pendingReservations },
    { label: "کلاس امروز", value: adminStats.classesToday },
    { label: "هنرجوی فعال", value: adminStats.activeStudents },
    { label: "اقساط معوق", value: adminStats.overdueInstallments },
    { label: "درآمد امروز", value: adminStats.revenueTodayLabel },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-gold-500/20 bg-gold-500/[.05] p-4">
        <p className="text-sm leading-7 text-ink-300">برای جلوگیری از نمایش عدد ساختگی، این داشبورد فعلاً در حالت پیش‌نمایش است.</p>
        <StatusChip tone="gold">پیش‌نمایش</StatusChip>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card-ay p-5">
            <p className="text-xs text-ink-500">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-sand-50">
              {c.value}
            </p>
          </div>
        ))}
      </div>
      <div className="card-ay p-6 text-sm leading-7 text-ink-400">
        منبع دادهٔ زنده در حال آماده‌سازی است و پس از اتصال API از OwnerDashboardService خوانده می‌شود.
      </div>
    </div>
  );
}
