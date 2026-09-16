"use client";

import { adminStats } from "@/lib/demo-data";

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
        این اعداد فعلاً دمو هستند و از همان منطق «گزارش امروز» ربات الهام گرفته‌اند.
        پس از اتصال API، از OwnerDashboardService خوانده می‌شوند.
      </div>
    </div>
  );
}
