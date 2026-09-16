"use client";

import { adminReservations } from "@/lib/demo-data";

export default function AdminReservationsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-sand-50">رزروهای در انتظار</h2>
      <div className="space-y-3">
        {adminReservations.map((r) => (
          <div key={r.id} className="card-ay flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-sm text-sand-50">
                {r.student} · {r.course}
              </p>
              <p className="mt-1 text-xs text-ink-400">
                {r.when} · {r.status}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-primary !px-4 !py-2 text-xs">
                تأیید
              </button>
              <button type="button" className="btn-ghost !px-4 !py-2 text-xs">
                رد
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
