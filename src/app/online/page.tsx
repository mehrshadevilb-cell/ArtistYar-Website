"use client";

import { FormEvent, useEffect, useState } from "react";
import { CalendarDays, Clock3, GraduationCap, UserRound } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import type { ApiClass } from "@/lib/rahyar-api";

const toman = new Intl.NumberFormat("fa-IR");

function formatPrice(price?: number | null) {
  return price && price > 0 ? `${toman.format(price)} تومان` : "هماهنگی پس از مشاوره";
}

export default function OnlinePage() {
  const [items, setItems] = useState<ApiClass[]>([]);
  const [source, setSource] = useState("در حال بارگذاری…");
  const [selected, setSelected] = useState<ApiClass | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
    if (!selected || submitted) return;
    setBusy(true);
    setMsg("");
    const fd = new FormData(e.currentTarget);
    try {
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        setMsg(data.error || data.detail || "ثبت درخواست ناموفق بود.");
        return;
      }
      setSubmitted(true);
      setMsg(data.message || "درخواست ثبت شد. تیم راه‌یار برای ادامه هماهنگی می‌کند.");
    } catch {
      setMsg("ارتباط با راه‌یار برقرار نشد. لطفاً دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  function chooseClass(course: ApiClass) {
    setSelected(course);
    setMsg("");
    setSubmitted(false);
  }

  return (
    <section className="container-ay py-16">
      <SectionHeading
        eyebrow="کلاس‌های آنلاین"
        title="با پروژه خودت یاد بگیر"
        subtitle="اگر می‌خواهی تنظیم، میکس یا مسترینگ را روی کار خودت جلو ببری، اینجا می‌توانیم دقیق‌تر روی همان پروژه کار کنیم. قیمت و تعداد جلسه را قبل از ثبت درخواست ببین."
      />

      <p className="mt-5 text-xs text-ink-500" aria-live="polite">
        {source === "rahyar" ? "کلاس‌های فعال راه‌یار" : source}
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {!items.length && source === "در حال بارگذاری…" ? (
          [1, 2, 3].map((item) => <div key={item} className="card-ay h-64 animate-pulse bg-white/[.02]" aria-hidden="true" />)
        ) : null}
        {!items.length && source !== "در حال بارگذاری…" ? (
          <div className="card-ay col-span-full p-7 text-sm leading-7 text-ink-400">
            فعلاً کلاس فعالی برای نمایش نیست. برای مشاوره مسیر آموزشی با پشتیبانی راه‌یار در تماس باش.
          </div>
        ) : null}
        {items.map((course) => (
          <article key={course.id} className="card-ay flex min-h-[20rem] flex-col p-6">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-medium text-sand-50">{course.name}</h3>
              <span className="rounded-full border border-gold-500/20 bg-gold-500/[.08] px-2.5 py-1 text-[10px] text-gold-300">کلاس آنلاین</span>
            </div>
            <p className="mt-3 flex-1 text-sm leading-7 text-ink-400">{course.description || "جلسه‌ای کاربردی برای جلو بردن پروژه موسیقی خودت با بازخورد دقیق."}</p>
            <dl className="mt-5 grid gap-2 border-y border-white/[.07] py-4 text-xs text-ink-300">
              <div className="flex items-center gap-2"><UserRound size={14} className="text-gold-400" aria-hidden="true" /><dt className="sr-only">مدرس</dt><dd>مدرس: {course.teacher || "با هماهنگی راه‌یار"}</dd></div>
              <div className="flex items-center gap-2"><Clock3 size={14} className="text-gold-400" aria-hidden="true" /><dt className="sr-only">مدت جلسه</dt><dd>هر جلسه: {course.duration_minutes || 60} دقیقه</dd></div>
              <div className="flex items-center gap-2"><CalendarDays size={14} className="text-gold-400" aria-hidden="true" /><dt className="sr-only">جلسات ماهانه</dt><dd>{course.monthly_sessions || 4} جلسه در پلن ماهانه</dd></div>
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-white/[.035] p-3"><span className="block text-[10px] text-ink-500">ماهانه</span><strong className="mt-1 block text-gold-300">{formatPrice(course.monthly_price)}</strong></div>
              <div className="rounded-xl bg-white/[.035] p-3"><span className="block text-[10px] text-ink-500">ترمی{course.term_sessions ? ` · ${course.term_sessions} جلسه` : ""}</span><strong className="mt-1 block text-gold-300">{formatPrice(course.term_price)}</strong></div>
            </div>
            <button type="button" className="btn-primary mt-5 !py-2 text-xs" onClick={() => chooseClass(course)}>
              درخواست مشاوره <GraduationCap size={15} aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>

      {selected ? (
        <div className="card-ay mx-auto mt-12 max-w-lg p-7">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs text-gold-400">درخواست مشاوره</p><h2 className="mt-2 text-lg font-medium text-sand-50">{selected.name}</h2></div>
            <span className="text-xs text-ink-400">{selected.duration_minutes || 60} دقیقه</span>
          </div>
          <p className="mt-3 text-xs leading-6 text-ink-400">درخواستت برای تیم راه‌یار ثبت می‌شود. ثبت درخواست به معنی ثبت‌نام یا فعال‌شدن دسترسی نیست.</p>
          {submitted ? (
            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.07] p-4 text-sm leading-7 text-emerald-200" role="status">{msg}</div>
          ) : (
            <form className="mt-5 space-y-3" onSubmit={onInquiry}>
              <label className="sr-only" htmlFor="online-full-name">نام کامل</label>
              <input id="online-full-name" className="input-ay" name="full_name" placeholder="نام کامل…" autoComplete="name" minLength={2} maxLength={100} required />
              <label className="sr-only" htmlFor="online-phone">شماره موبایل</label>
              <input id="online-phone" className="input-ay" name="phone" type="tel" inputMode="tel" placeholder="09xxxxxxxxx…" autoComplete="tel" minLength={10} maxLength={20} required />
              <label className="sr-only" htmlFor="online-message">توضیحات پروژه</label>
              <textarea id="online-message" className="input-ay min-h-24" name="message" maxLength={1000} placeholder="بگو روی چه پروژه‌ای کار می‌کنی و کجا گیر کردی…" />
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1" disabled={busy}>{busy ? "در حال ارسال…" : "ارسال برای بررسی"}</button>
                <button type="button" className="btn-ghost" onClick={() => setSelected(null)} disabled={busy}>بستن</button>
              </div>
              {msg ? <p className="text-xs leading-6 text-red-300" aria-live="polite">{msg}</p> : null}
            </form>
          )}
          {submitted ? <button type="button" className="btn-ghost mt-4 w-full" onClick={() => setSelected(null)}>بستن</button> : null}
        </div>
      ) : null}
    </section>
  );
}
