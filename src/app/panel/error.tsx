"use client";

import { useEffect } from "react";

export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Student panel error", error);
  }, [error]);

  return (
    <section className="container-ay py-20">
      <div className="card-ay mx-auto max-w-xl p-8 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-500">Student Panel</p>
        <h1 className="mt-3 text-xl font-semibold text-sand-50">بارگذاری پنل با مشکل روبه‌رو شد</h1>
        <p className="mt-3 text-sm leading-7 text-ink-400">
          نشست شما حفظ شده است. صفحه را دوباره بارگذاری کن یا به نمای اصلی پنل برگرد.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={() => reset()} className="btn-primary !py-2 text-sm">تلاش دوباره</button>
          <a href="/panel" className="btn-ghost !py-2 text-sm">نمای اصلی پنل</a>
        </div>
      </div>
    </section>
  );
}
