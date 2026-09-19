"use client";

import Link from "next/link";
import { studentReservations } from "@/lib/demo-data";
import { CommunityLinks } from "@/components/CommunityLinks";

export default function PanelReservationsPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-medium tracking-tight text-sand-50">رزرو کلاس‌ها</h2>
          <p className="mt-2 text-xs leading-6 text-ink-400">
            رزرو زنده پس از اتصال کامل API به سیستم راه‌یار فعال می‌شود.
          </p>
        </div>
        <Link href="/online" className="btn-primary min-h-11 !py-2 text-xs">
          درخواست کلاس جدید
        </Link>
      </div>

      <div className="card-ay overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-right text-sm">
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
      </div>

      <CommunityLinks variant="pills" />
    </div>
  );
}
