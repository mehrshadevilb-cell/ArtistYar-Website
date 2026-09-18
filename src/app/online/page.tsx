"use client";

import { FormEvent, useEffect, useState } from "react";
import { SectionHeading } from "@/components/SectionHeading";
import { CommunityLinks } from "@/components/CommunityLinks";
import { communityLinks } from "@/data/community";

type ClassItem = {
  id: number;
  name: string;
  description?: string | null;
};

export default function OnlinePage() {
  const [items, setItems] = useState<ClassItem[]>([]);
  const [source, setSource] = useState("در حال بارگذاری…");
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
      .catch(() => setSource("خطا در دریافت کلاس‌ها"));
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
    <section className="container-ay py-14 sm:py-16">
      <SectionHeading
        eyebrow="کلاس‌های آنلاین"
        title="با پروژه خودت یاد بگیر"
        subtitle="اگر می‌خواهی تنظیم، میکس یا مسترینگ را روی کار خودت جلو ببری، اینجا می‌توانیم دقیق‌تر روی همان پروژه کار کنیم."
      />

      <p className="mt-5 text-xs text-ink-500" aria-live="polite">
        {source === "rahyar" ? "کلاس‌های فعال راه‌یار" : source}
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {!items.length && source === "در حال بارگذاری…"
          ? [1, 2, 3].map((item) => (
              <div key={item} className="card-ay h-52 animate-pulse bg-white/[.02]" aria-hidden="true" />
            ))
          : null}
        {items.map((c) => (
          <article key={c.id} className="card-ay p-6">
            <h3 className="text-lg font-medium text-sand-50">{c.name}</h3>
            <p className="mt-3 text-sm leading-7 text-ink-400">
              {c.description || "جلسه‌ای کاربردی برای جلو بردن پروژه موسیقی خودت."}
            </p>
            <button
              type="button"
              className="btn-primary mt-5 min-h-11 !py-2 text-xs"
              onClick={() => {
                setSelected(c);
                setMsg("");
              }}
            >
              درخواست مشاوره
            </button>
          </article>
        ))}
      </div>

      {selected ? (
        <div className="card-ay mx-auto mt-12 max-w-lg p-7">
          <h3 className="text-lg font-medium text-sand-50">مشاوره برای: {selected.name}</h3>
          <form className="mt-5 space-y-3" onSubmit={onInquiry}>
            <label className="sr-only" htmlFor="online-full-name">
              نام کامل
            </label>
            <input
              id="online-full-name"
              className="input-ay"
              name="full_name"
              placeholder="نام کامل…"
              autoComplete="name"
              required
            />
            <label className="sr-only" htmlFor="online-phone">
              شماره موبایل
            </label>
            <input
              id="online-phone"
              className="input-ay"
              name="phone"
              type="tel"
              inputMode="tel"
              placeholder="09xxxxxxxxx…"
              autoComplete="tel"
              required
            />
            <label className="sr-only" htmlFor="online-message">
              توضیحات پروژه
            </label>
            <textarea
              id="online-message"
              className="input-ay min-h-24"
              name="message"
              placeholder="بگو روی چه پروژه‌ای کار می‌کنی و کجا گیر کردی…"
            />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary min-h-11 flex-1" disabled={busy}>
                {busy ? "در حال ارسال…" : "ارسال برای بررسی"}
              </button>
              <button type="button" className="btn-ghost min-h-11" onClick={() => setSelected(null)}>
                بستن
              </button>
            </div>
          </form>
          {msg ? (
            <p className="mt-4 text-xs leading-6 text-gold-400" aria-live="polite">
              {msg}
            </p>
          ) : null}
          <p className="mt-4 text-xs text-ink-500">
            سؤال عمومی؟{" "}
            <a
              href={communityLinks.telegramGroup.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-400 hover:text-gold-300"
            >
              گروه ProAudiosGP
            </a>
          </p>
        </div>
      ) : null}

      <div className="mt-16 border-t border-white/[0.06] pt-12">
        <CommunityLinks />
      </div>
    </section>
  );
}
