"use client";

import Link from "next/link";
import { studentCourses, studentReservations } from "@/lib/demo-data";

export default function PanelHomePage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "دوره فعال", value: String(studentCourses.length) },
          { label: "رزرو پیش‌رو", value: String(studentReservations.length) },
          { label: "وضعیت", value: "فعال" },
        ].map((item) => (
          <div key={item.label} className="card-ay p-5">
            <p className="text-xs text-ink-500">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-sand-50">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="card-ay p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-sand-50">رزروهای نزدیک</h2>
          <Link href="/panel/reservations" className="text-xs text-gold-400">
            همه
          </Link>
        </div>
        <ul className="mt-4 space-y-3">
          {studentReservations.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-sm"
            >
              <span className="text-sand-100">
                {r.course} · {r.date} · {r.time}
              </span>
              <span className="text-xs text-ink-400">{r.status}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card-ay p-6">
        <h2 className="text-lg font-medium text-sand-50">اقدام سریع</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/online" className="btn-ghost !py-2 text-xs">
            رزرو کلاس جدید
          </Link>
          <Link href="/panel/profile" className="btn-primary !py-2 text-xs">
            اتصال به ربات
          </Link>
        </div>
      </div>
    </div>
  );
}
