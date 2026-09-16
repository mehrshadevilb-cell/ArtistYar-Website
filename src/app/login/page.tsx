"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && user) {
      router.replace(user.role === "admin" ? "/admin" : "/panel");
    }
  }, [ready, router, user]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const username = String(fd.get("username") || "");
    const password = String(fd.get("password") || "");
    const result = login(username, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const role = username === "admin" ? "admin" : "student";
    router.push(role === "admin" ? "/admin" : "/panel");
  }

  return (
    <section className="container-ay flex justify-center py-16">
      <div className="card-ay w-full max-w-md p-8">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-gold-500">
          ArtistYar / هنرجو
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-sand-50">ورود به آرتیست‌یار</h1>
        <p className="mt-2 text-sm leading-7 text-ink-400">
          برای دیدن مسیرها، پیگیری درخواست‌ها و ادامه یادگیری وارد حساب هنرجویی‌ات شو.
        </p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-2 block text-xs text-ink-400">نام کاربری</label>
            <input className="input-ay" name="username" autoComplete="username" required />
          </div>
          <div>
            <label className="mb-2 block text-xs text-ink-400">رمز عبور</label>
            <input
              className="input-ay"
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "..." : "ورود"}
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs leading-6 text-ink-400">
          <p className="font-medium text-ink-300">حساب‌های نمونه</p>
          <p>هنرجو: <code className="text-gold-400">student</code> / <code className="text-gold-400">student123</code></p>
          <p>ادمین: <code className="text-gold-400">admin</code> / <code className="text-gold-400">admin123</code></p>
        </div>

        <p className="mt-6 text-center text-xs text-ink-500">
          حساب ندارید؟{" "}
          <Link href="/register" className="text-gold-400 hover:text-gold-300">
            ثبت‌نام
          </Link>
        </p>
      </div>
    </section>
  );
}
