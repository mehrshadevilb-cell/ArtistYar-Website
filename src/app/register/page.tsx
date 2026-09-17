"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

const errorMessages: Record<string, string> = {
  invalid_phone: "شماره موبایل معتبر نیست.",
  phone_already_registered: "این شماره قبلاً ثبت‌نام کرده است. از صفحه ورود وارد شو.",
  registration_backend_unavailable: "ارتباط با سامانه ثبت‌نام برقرار نشد؛ دوباره تلاش کن.",
};

export default function RegisterPage() {
  const { user, ready, register } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace(user.role === "admin" ? "/admin" : "/panel");
  }, [ready, router, user]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const password = String(form.get("password") || "");
    try {
      const response = await fetch("/api/rahyar/students/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, phone, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setError(errorMessages[data.detail || data.error] || "ثبت‌نام انجام نشد. اطلاعات را بررسی کن.");
        return;
      }
      const localResult = register({ username: data.user?.phone || phone, password, fullName });
      if (localResult.ok) {
        router.replace("/panel");
      } else {
        setError(localResult.error || "ثبت‌نام انجام شد؛ از صفحه ورود وارد شو.");
      }
    } catch {
      setError("ارتباط با سامانه ثبت‌نام برقرار نشد؛ دوباره تلاش کن.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="container-ay flex justify-center py-16">
      <div className="card-ay w-full max-w-md p-8">
        <p className="text-xs font-medium uppercase tracking-[.22em] text-gold-500">شروع مسیر</p>
        <h1 className="mt-3 text-2xl font-semibold text-sand-50">ثبت‌نام هنرجو</h1>
        <p className="mt-2 text-sm leading-7 text-ink-400">فقط نام، شماره موبایل و یک رمز عبور انتخاب کن. شماره با حساب‌ها و دسترسی‌های SpotPlayer تطبیق داده می‌شود.</p>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block"><span className="mb-2 block text-xs text-ink-400">نام و نام خانوادگی</span><input className="input-ay" name="fullName" autoComplete="name" required minLength={2} /></label>
          <label className="block"><span className="mb-2 block text-xs text-ink-400">شماره موبایل</span><input className="input-ay" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0912…" required minLength={10} /></label>
          <label className="block"><span className="mb-2 block text-xs text-ink-400">انتخاب رمز عبور</span><input className="input-ay" type="password" name="password" autoComplete="new-password" required minLength={6} /></label>
          {error ? <p className="text-sm leading-6 text-red-400" role="alert">{error}</p> : null}
          <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? "در حال ثبت‌نام…" : "ثبت‌نام و ورود"}</button>
        </form>
        <p className="mt-6 text-center text-xs text-ink-500">قبلاً ثبت‌نام کرده‌اید؟ <Link href="/login" className="text-gold-400">ورود</Link></p>
      </div>
    </section>
  );
}
