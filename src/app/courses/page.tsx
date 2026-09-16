"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import type { LiveProduct } from "@/components/LiveProductCard";
import { SectionHeading } from "@/components/SectionHeading";
import { StatusChip } from "@/components/StatusChip";

export default function CoursesPage() {
  const [items, setItems] = useState<LiveProduct[]>([]);
  const [source, setSource] = useState("در حال بارگذاری…");
  const [selected, setSelected] = useState<LiveProduct | null>(null);
  const [msg, setMsg] = useState("");
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/rahyar/products")
      .then((r) => r.json())
      .then((data) => {
        setSource(data.source || "unknown");
        setItems(data.items || []);
      })
      .catch(() => setSource("خطا در دریافت مسیرها"));
  }, []);

  async function onOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setMsg("");
    setPaymentId(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/rahyar/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: selected.id,
        full_name: fd.get("full_name"),
        phone: fd.get("phone"),
        note: fd.get("note") || undefined,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok || data.ok === false) {
      setMsg(data.error || data.detail || "ثبت سفارش ناموفق بود.");
      return;
    }
    const card = data.card?.number
      ? `\nکارت: ${data.card.number} — ${data.card.holder || ""}`
      : "";
    setMsg(
      `${data.message || "ثبت شد."}\nشماره پرداخت: ${data.payment_id}\nمبلغ: ${Number(data.amount || 0).toLocaleString("fa-IR")} تومان${card}`,
    );
    setPaymentId(Number(data.payment_id));
  }

  return (
    <section className="container-ay py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow="مسیرهای آموزشی"
          title="تنظیم، میکس و مسترینگ؛ درست و اصولی"
          subtitle="مسیرت را انتخاب کن، تمرین کن و هر چیزی که یاد می‌گیری روی پروژه واقعی اجرا کن."
        />
        <StatusChip tone={source === "rahyar" ? "ok" : "warn"}>
          {source === "rahyar" ? "کاتالوگ زنده" : source}
        </StatusChip>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.id}
            id={`p-${item.id}`}
            className="card-ay flex h-full flex-col p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <StatusChip tone="gold">مسیر یادگیری</StatusChip>
              <StatusChip tone={item.is_active === false ? "warn" : "ok"}>
                {item.is_active === false ? "غیرفعال" : "فعال"}
              </StatusChip>
            </div>
            <h3 className="mt-5 text-xl font-semibold text-sand-50">{item.title}</h3>
            <p className="mt-3 flex-1 text-sm leading-7 text-ink-400">
                {item.description || "آموزش کاربردی برای ساختن موسیقی بهتر."}
            </p>
            <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4">
              <span className="text-sm font-medium text-gold-400">
                {item.price > 0
                  ? `${item.price.toLocaleString("fa-IR")} تومان`
                  : "—"}
              </span>
              <button
                type="button"
                className="text-xs text-sand-100 underline-offset-4 hover:text-gold-300 hover:underline"
                aria-label={`شروع مسیر ${item.title}`}
                disabled={item.is_active === false}
                onClick={() => {
                  setSelected(item);
                  setMsg("");
                }}
              >
                شروع مسیر
              </button>
            </div>
          </article>
        ))}
      </div>

      {selected ? (
        <div className="card-ay mx-auto mt-12 max-w-lg p-7">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-medium text-sand-50">شروع مسیر: {selected.title}</h3>
            <StatusChip tone="gold">ثبت درخواست</StatusChip>
          </div>
          <p className="mt-2 text-xs leading-6 text-ink-500">
            اطلاعاتت را بفرست تا برای شروع مسیر و جزئیات ثبت‌نام باهات هماهنگ کنیم.
          </p>
          <form className="mt-5 space-y-3" onSubmit={onOrder}>
            <label className="sr-only" htmlFor="course-full-name">نام کامل</label>
            <input id="course-full-name" className="input-ay" name="full_name" placeholder="نام کامل…" autoComplete="name" required />
            <label className="sr-only" htmlFor="course-phone">شماره موبایل</label>
            <input id="course-phone" className="input-ay" name="phone" type="tel" inputMode="tel" placeholder="09xxxxxxxxx…" autoComplete="tel" required />
            <label className="sr-only" htmlFor="course-note">توضیحات</label>
            <input id="course-note" className="input-ay" name="note" placeholder="الان روی چه چیزی کار می‌کنی؟ (اختیاری)…" />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1" disabled={busy}>
                {busy ? "در حال ارسال…" : "ارسال درخواست"}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setSelected(null)}>
                بستن
              </button>
            </div>
          </form>
          {msg ? (
            <pre className="mt-4 whitespace-pre-wrap text-xs leading-6 text-gold-400" aria-live="polite">{msg}</pre>
          ) : null}
          {paymentId ? (
            <Link
              href={`/track?payment_id=${paymentId}`}
              className="mt-4 inline-flex text-xs text-sand-100 underline decoration-gold-500/60 underline-offset-4 hover:text-gold-300"
            >
              پیگیری وضعیت سفارش
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
