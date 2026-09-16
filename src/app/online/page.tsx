"use client";

import { FormEvent, useEffect, useState } from "react";
import { SectionHeading } from "@/components/SectionHeading";

type ClassItem = {
  id: number;
  name: string;
  description?: string | null;
};

export default function OnlinePage() {
  const [items, setItems] = useState<ClassItem[]>([]);
  const [source, setSource] = useState("...");
  const [selected, setSelected] = useState<ClassItem | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/rahyar/classes")
      .then((r) => r.json())
      .then((data) => {
        setSource(data.source || "unknown");
        setItems(data.items || []);
      })
      .catch(() => setSource("error"));
  }, []);

  async function onInquiry(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/rahyar/class-inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        course_id: selected.id,
        full_name: fd.get("full_name"),
        phone: fd.get("phone"),
        message: fd.get("message") || undefined,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok || data.ok === false) {
      setMsg(data.error || data.detail || "ثبت درخواست ناموفق بود.");
      return;
    }
    setMsg(data.message || "ثبت شد.");
  }

  return (
    <section className="container-ay py-16">
      <SectionHeading
        eyebrow="Online Classes"
        title="کلاس یک‌به‌یک"
        subtitle={`منبع: ${source === "rahyar" ? "زنده از راه‌یار" : source === "demo" ? "دمو" : source}`}
      />

      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <article key={c.id} className="card-ay p-6">
            <h3 className="text-lg font-medium text-sand-50">{c.name}</h3>
            <p className="mt-3 text-sm leading-7 text-ink-400">{c.description || "کلاس آنلاین آکادمی"}</p>
            <button
              type="button"
              className="btn-primary mt-5 !py-2 text-xs"
              onClick={() => {
                setSelected(c);
                setMsg("");
              }}
            >
              درخواست ثبت‌نام
            </button>
          </article>
        ))}
      </div>

      {selected ? (
        <div className="card-ay mx-auto mt-12 max-w-lg p-7">
          <h3 className="text-lg font-medium text-sand-50">درخواست: {selected.name}</h3>
          <form className="mt-5 space-y-3" onSubmit={onInquiry}>
            <input className="input-ay" name="full_name" placeholder="نام کامل" required />
            <input className="input-ay" name="phone" placeholder="09xxxxxxxxx" required />
            <textarea className="input-ay min-h-24" name="message" placeholder="توضیح" />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1" disabled={busy}>
                {busy ? "..." : "ارسال درخواست"}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setSelected(null)}>
                بستن
              </button>
            </div>
          </form>
          {msg ? <p className="mt-4 text-xs text-gold-400">{msg}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
