"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

type Check = { id: string; label: string; ok: boolean; detail: string };
type Diagnostics = {
  ok: boolean;
  checks: Check[];
  backend: string;
  session: { username: string } | null;
};

export default function AdminSystemPage() {
  const [data, setData] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/diagnostics", { cache: "no-store", credentials: "include" });
      const json = await res.json();
      if (!res.ok && !json.checks) throw new Error(json.message || json.error || "خطا");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "دریافت وضعیت ناموفق بود");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">/ تشخیص سیستم</p>
          <h2 className="mt-3 text-2xl font-semibold text-sand-50">وضعیت پنل و اتصالات</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-400">
            اگر هنرجوها، آپلود یا آمار کار نمی‌کند، اول این صفحه را چک کن. هر ردیف قرمز یعنی یک env یا سرویس مشکل دارد.
          </p>
        </div>
        <button type="button" className="btn-ghost !px-4" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          بررسی دوباره
        </button>
      </header>

      {error ? (
        <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      {data ? (
        <div
          className={`rounded-2xl border p-4 ${
            data.ok ? "border-emerald-400/20 bg-emerald-400/[.05]" : "border-amber-400/20 bg-amber-400/[.05]"
          }`}
        >
          <p className="text-sm text-ink-200">
            {data.ok ? "همهٔ چک‌ها سبز هستند." : "یک یا چند اتصال ناقص است — جزئیات زیر."}
          </p>
          <p className="mt-1 text-xs text-ink-500">backend: {data.backend}</p>
        </div>
      ) : null}

      <div className="space-y-3">
        {(data?.checks || []).map((check) => (
          <div key={check.id} className="card-ay flex items-start gap-3 p-4">
            {check.ok ? (
              <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-400" size={18} />
            ) : (
              <XCircle className="mt-0.5 shrink-0 text-red-400" size={18} />
            )}
            <div>
              <p className="font-medium text-sand-50">{check.label}</p>
              <p className="mt-1 text-xs leading-6 text-ink-400">{check.detail}</p>
            </div>
          </div>
        ))}
        {loading && !data ? (
          <p className="card-ay p-5 text-sm text-ink-500">در حال بررسی…</p>
        ) : null}
      </div>

      <div className="card-ay space-y-2 p-5 text-xs leading-7 text-ink-400">
        <p className="flex items-center gap-2 text-ink-300">
          <AlertTriangle size={14} className="text-gold-400" />
          چک‌لیست env روی Render
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <code className="text-gold-400">ARTISTYAR_ADMIN_USERNAME</code> +{" "}
            <code className="text-gold-400">ARTISTYAR_ADMIN_PASSWORD</code> — ورود ادمین
          </li>
          <li>
            <code className="text-gold-400">WEB_ADMIN_API_KEY</code> — باید با کلید backend راه‌یار یکی باشد
          </li>
          <li>
            <code className="text-gold-400">SUPABASE_URL</code> + <code className="text-gold-400">SUPABASE_SECRET_KEY</code> — آپلود مستقیم سروری؛ Upload Token لازم نیست
          </li>
          <li>
            <code className="text-gold-400">RAHYAR_API_URL</code> — آدرس backend زنده
          </li>
        </ul>
      </div>
    </div>
  );
}
