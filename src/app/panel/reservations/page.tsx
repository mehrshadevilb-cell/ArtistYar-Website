"use client";

import { studentReservations } from "@/lib/demo-data";

export default function PanelReservationsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-sand-50">رزرو کلاس‌ها</h2>
      <div className="card-ay overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-white/[0.06] text-xs text-ink-500">
            <tr>
              <th className="px-4 py-3 font-medium">دوره</th>
              <th className="px-4 py-3 font-medium">تاریخ</th>
              <th className="px-4 py-3 font-medium">ساعت</th>
              <th className="px-4 py-3 font-medium">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {studentReservations.map((r) => (
              <tr key={r.id} className="border-b border-white/[0.04] last:border-0">
                <td className="px-4 py-3 text-sand-100">{r.course}</td>
                <td className="px-4 py-3 text-ink-300">{r.date}</td>
                <td className="px-4 py-3 text-ink-300">{r.time}</td>
                <td className="px-4 py-3 text-ink-400">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-500">
        رزرو زنده پس از اتصال API به سیستم راه‌یار فعال می‌شود.
      </p>
    </div>
  );
}
