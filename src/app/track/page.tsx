"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { SectionHeading } from "@/components/SectionHeading";
import { StatusChip } from "@/components/StatusChip";

type OrderStatus = {
  payment_id: number;
  product_title: string;
  amount: number;
  status: string;
  created_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "در انتظار بررسی",
  approved: "تأیید شده",
  rejected: "رد شده",
  cancelled: "لغو شده",
};

export default function TrackOrderPage() {
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get("payment_id");
    if (paymentId) {
      const input = document.querySelector<HTMLInputElement>("input[name=payment_id]");
      if (input) input.value = paymentId;
    }
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setOrder(null);
    const form = new FormData(event.currentTarget);
    const paymentId = String(form.get("payment_id") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const response = await fetch(
      `/api/rahyar/orders/status?payment_id=${encodeURIComponent(paymentId)}&phone=${encodeURIComponent(phone)}`,
    );
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setError(data.error || "سفارش پیدا نشد یا اطلاعات واردشده نادرست است.");
      return;
    }
    setOrder(data as OrderStatus);
  }

  return (
    <section className="container-ay py-16">
      <SectionHeading
        eyebrow="پیگیری سفارش"
        title="وضعیت درخواستت را ببین"
        subtitle="شماره پرداخت و همان موبایلی را وارد کن که هنگام ثبت سفارش ثبت کردی."
      />

      <div className="card-ay mx-auto mt-10 max-w-lg p-7">
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-2 block text-xs text-ink-400">شماره پرداخت</label>
            <input className="input-ay" name="payment_id" inputMode="numeric" required />
          </div>
          <div>
            <label className="mb-2 block text-xs text-ink-400">موبایل</label>
            <input className="input-ay" name="phone" placeholder="09121234567" inputMode="tel" required />
          </div>
          {error ? <p className="text-sm leading-7 text-red-400">{error}</p> : null}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "در حال بررسی…" : "پیگیری سفارش"}
          </button>
        </form>

        {order ? (
          <div className="mt-6 rounded-2xl border border-gold-500/20 bg-gold-500/[.06] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-ink-500">پرداخت #{order.payment_id}</p>
                <h2 className="mt-2 font-medium text-sand-50">{order.product_title}</h2>
              </div>
              <StatusChip tone={order.status === "approved" ? "ok" : order.status === "rejected" ? "warn" : "gold"}>
                {STATUS_LABELS[order.status] || order.status}
              </StatusChip>
            </div>
            <p className="mt-4 text-sm text-ink-300">
              مبلغ: {Number(order.amount || 0).toLocaleString("fa-IR")} تومان
            </p>
            <p className="mt-2 text-xs leading-6 text-ink-500">
              پس از تأیید ادمین، دسترسی دوره از مسیر راه‌یار فعال می‌شود.
            </p>
          </div>
        ) : null}
      </div>

      <p className="mt-8 text-center text-sm text-ink-500">
        هنوز سفارش نداری؟ <Link href="/courses" className="text-gold-400">دیدن مسیرها</Link>
      </p>
    </section>
  );
}

