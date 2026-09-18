"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

type Props = { onUpgrade: () => void };

/** Pro status banner for Practice Engine hub. */
export function PracticeProBanner({ onUpgrade }: Props) {
  const { user } = useAuth();
  const [pro, setPro] = useState(false);
  const [proExpires, setProExpires] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (user?.role === "admin") {
      setPro(true);
      setReady(true);
      return;
    }
    if (!user?.id) {
      setPro(false);
      setReady(true);
      return;
    }
    fetch("/api/practice/status?userId=" + encodeURIComponent(user.id), {
      cache: "no-store",
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setPro(Boolean(d?.pro));
        setProExpires(d?.proExpiresAt || null);
      })
      .catch(() => {
        if (!cancelled) setPro(false);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  if (!ready) return null;

  if (pro) {
    return (
      <div className="rounded-2xl border border-emerald-400/25 bg-gradient-to-l from-emerald-400/[.12] to-gold-400/[.06] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="eyebrow text-emerald-200">PRO ACTIVE</span>
            <h2 className="mt-2 text-lg font-medium text-sand-50">اشتراک Pro فعال است</h2>
            <p className="mt-1 text-xs leading-6 text-ink-400">
              Free: ۵ مرحله · Pro: ۴۰ مرحله تا پایان اشتراک فعال · Professional Audio Skills · Voicing روزانه
              {proExpires ? ` · تا ${new Date(proExpires).toLocaleDateString("fa-IR")}` : ""}
            </p>
          </div>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-medium text-emerald-200">
            PRO USER
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gold-400/25 bg-gradient-to-l from-gold-400/[.14] to-white/[.03] p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span className="eyebrow">PRACTICE PRO · ۴۰٬۰۰۰ تومان / ماه</span>
          <h2 className="mt-2 text-lg font-medium text-sand-50">برای تمرین حرفه‌ای، Pro شو</h2>
          <ul className="mt-2 space-y-1 text-xs leading-6 text-ink-400">
            <li>· تا ۵ مرحله رایگان؛ با Pro تا ۴۰ مرحله، در تمام مدت فعال بودن اشتراک</li>
            <li>· Professional Audio Skills (Reverb / Saturation / Masking / Transient)</li>
            <li>· ۱ Voicing پیانو روزانه · تحلیل‌های AI با سهمیه جداگانه</li>
          </ul>
        </div>
        <button type="button" className="btn-primary shrink-0 !px-5 !py-2.5 text-xs" onClick={onUpgrade}>
          ارتقا به Pro
        </button>
      </div>
    </div>
  );
}
