"use client";

import { useEffect, useState } from "react";

type OrderRow = {
  id: number;
  student?: string;
  full_name?: string;
  product?: string;
  product_title?: string;
  amount?: number | string;
  status?: string;
};

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/rahyar/orders", { cache: "no-store" });
        if (!res.ok) throw new Error("دریافت سفارش‌ها از راه‌یار ناموفق بود.");
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.items || data.orders || [];
        if (!cancelled) setRows(list);
      } catch (e) {
        if (!cancelled) {
          setRows([]);
          setError(e instanceof Error ? e.message : "خطا در دریافت داده");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-sand-50">پرداخت‌ها</h2>
      <p className="text-xs leading-6 text-ink-500">داده آزمایشی حذف شده. منبع: API راه‌یار.</p>
      {loading ? <p className="text-sm text-ink-400">در حال بارگذاری…</p> : null}
      {error ? (
        <div className="card-ay p-5 text-sm leading-7 text-ink-400">
          {error}
          <br />
          وقتی endpoint سفارش‌های ادمین روی backend آماده باشد، اینجا پر می‌شود.
        </div>
      ) : null}
      {!loading && !error && !rows.length ? (
        <div className="card-ay p-5 text-sm text-ink-400">فعلاً سفارشی از راه‌یار دریافت نشد.</div>
      ) : null}
      <div className="space-y-3">
        {rows.map((p) => (
          <div key={p.id} className="card-ay flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-sm text-sand-50">
                #{p.id} · {p.student || p.full_name || "—"}
              </p>
              <p className="mt-1 text-xs text-ink-400">
                {p.product || p.product_title || "—"} · {p.amount ?? "—"} · {p.status || "—"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
