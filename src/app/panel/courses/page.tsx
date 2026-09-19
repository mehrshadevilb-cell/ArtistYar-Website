"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { fetchLicenses, type ApiLicense } from "@/lib/rahyar-api";
import { CommunityLinks } from "@/components/CommunityLinks";

const PHONE_KEY = "artistyar_account_phone";

export default function PanelCoursesPage() {
  const [phone, setPhone] = useState("");
  const [draft, setDraft] = useState("");
  const [licenses, setLicenses] = useState<ApiLicense[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("شماره موبایلی را که با آن سفارش ثبت کرده‌ای وارد کن.");

  useEffect(() => {
    let saved = "";
    try {
      saved = window.localStorage.getItem(PHONE_KEY) || "";
    } catch {
      setMessage("ذخیره‌سازی مرورگر در دسترس نیست؛ شماره را دوباره وارد کن.");
    }
    setPhone(saved);
    setDraft(saved);
    if (saved) void load(saved);
  }, []);

  async function load(value: string) {
    if (!value) return;
    setLoading(true);
    setMessage("");
    try {
      setLicenses(await fetchLicenses(value));
    } catch {
      setMessage("دریافت دسترسی‌ها ناموفق بود. شماره موبایل را بررسی کن.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = draft.trim();
    try {
      window.localStorage.setItem(PHONE_KEY, value);
    } catch {
      setMessage("ذخیره‌سازی مرورگر در دسترس نیست؛ اما بررسی شماره ادامه پیدا می‌کند.");
    }
    setPhone(value);
    void load(value);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-medium tracking-tight text-sand-50">دوره‌ها و لایسنس‌های من</h2>
        <p className="mt-2 text-xs leading-6 text-ink-400">
          بعد از تأیید پرداخت توسط ادمین، لایسنس اینجا نمایش داده می‌شود.
        </p>
      </div>

      <form className="card-ay flex flex-col gap-3 p-5 sm:flex-row sm:items-center" onSubmit={onSubmit}>
        <input
          className="input-ay flex-1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="شماره موبایل سفارش، مثلا 0912…"
          inputMode="tel"
          required
        />
        <button className="btn-primary min-h-11 shrink-0" type="submit" disabled={loading}>
          {loading ? "در حال بررسی…" : "همگام‌سازی"}
        </button>
      </form>

      {message ? <p className="text-xs leading-6 text-ink-500">{message}</p> : null}

      {phone && !loading && licenses.length === 0 ? (
        <div className="card-ay p-6 text-sm leading-7 text-ink-300">
          هنوز لایسنسی برای این شماره پیدا نشد. اگر رسید را ارسال کرده‌ای، پس از تأیید ادمین این صفحه را دوباره
          همگام‌سازی کن.
        </div>
      ) : null}

      {licenses.map((license) => (
        <article key={license.id} className="card-ay p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-medium text-sand-50">{license.product_title}</h3>
              <p className="mt-2 text-xs text-ink-400">وضعیت: {license.status}</p>
            </div>
            {license.payment_id ? <span className="text-xs text-ink-500">پرداخت #{license.payment_id}</span> : null}
          </div>
          <Link href={"/panel/courses/"+license.product_id} className="btn-primary mt-4 inline-flex text-xs">مشاهده محتوای آموزشی</Link>\n          {license.license_key ? (
            <div className="mt-5 rounded-xl border border-gold-500/20 bg-gold-500/[.06] p-4">
              <p className="text-xs text-ink-400">کلید دسترسی</p>
              <code className="mt-2 block break-all text-sm text-gold-300">{license.license_key}</code>
              {license.license_url ? (
                <a
                  className="mt-3 inline-flex text-xs text-sand-100 underline underline-offset-4"
                  href={license.license_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  باز کردن دسترسی
                </a>
              ) : null}
            </div>
          ) : null}
        </article>
      ))}

      <div className="pt-4">
        <CommunityLinks variant="pills" />
      </div>
    </div>
  );
}
