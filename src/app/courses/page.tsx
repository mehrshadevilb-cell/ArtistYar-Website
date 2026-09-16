"use client";

import { FormEvent, useEffect, useState } from "react";
import { SectionHeading } from "@/components/SectionHeading";

type Item = {
  id: number;
  title?: string;
  name?: string;
  description?: string | null;
  price?: number;
  tag?: string;
};

export default function CoursesPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [source, setSource] = useState("...");
  const [selected, setSelected] = useState<Item | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/rahyar/products")
      .then((r) => r.json())
      .then((data) => {
        setSource(data.source || "unknown");
        setItems(data.items || []);
      })
      .catch(() => setSource("error"));
  }, []);

  async function onOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setMsg("");
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
  }

  return (
    <section className="container-ay py-16">
      <SectionHeading
        eyebrow="Courses"
        title="مسیرهای آموزشی آرتیست‌یار"
        subtitle={`منبع داده: ${source === "rahyar" ? "زنده از راه‌یار" : source === "demo" ? "دمو (API وصل نیست)" : source}`}
      />

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const title = item.title || item.name || "دوره";
          return (
            <article key={item.id} className="card-ay flex flex-col p-6">
              <h3 className="text-xl font-semibold text-sand-50">{title}</h3>
              <p className="mt-3 flex-1 text-sm leading-7 text-ink-400">
                {item.description || "—"}
              </p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-gold-400">
                  {item.price
                    ? `${item.price.toLocaleString("fa-IR")} تومان`
                    : "قیمت پس از اتصال"}
                </span>
                <button
                  type="button"
                  className="text-xs text-sand-100 underline-offset-4 hover:underline"
                  onClick={() => {
                    setSelected(item);
                    setMsg("");
                  }}
                >
                  ثبت سفارش
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {selected ? (
        <div className="card-ay mx-auto mt-12 max-w-lg p-7">
          <h3 className="text-lg font-medium text-sand-50">
            سفارش: {selected.title || selected.name}
          </h3>
          <p className="mt-2 text-xs text-ink-500">
            پرداخت پس از ثبت، در پنل تلگرام ادمین تأیید می‌شود (همان قانون ربات).
          </p>
          <form className="mt-5 space-y-3" onSubmit={onOrder}>
            <input className="input-ay" name="full_name" placeholder="نام کامل" required />
            <input className="input-ay" name="phone" placeholder="09xxxxxxxxx" required />
            <input className="input-ay" name="note" placeholder="توضیح اختیاری" />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1" disabled={busy}>
                {busy ? "..." : "ثبت سفارش"}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setSelected(null)}
              >
                بستن
              </button>
            </div>
          </form>
          {msg ? (
            <pre className="mt-4 whitespace-pre-wrap text-xs leading-6 text-gold-400">{msg}</pre>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
