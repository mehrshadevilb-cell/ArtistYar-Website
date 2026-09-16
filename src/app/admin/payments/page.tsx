"use client";

import { adminPayments } from "@/lib/demo-data";

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-sand-50">پرداخت‌های در انتظار</h2>
      <div className="space-y-3">
        {adminPayments.map((p) => (
          <div key={p.id} className="card-ay flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-sm text-sand-50">
                #{p.id} · {p.student}
              </p>
              <p className="mt-1 text-xs text-ink-400">
                {p.product} · {p.amount} تومان
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
