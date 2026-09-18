"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { CommunityLinks } from "@/components/CommunityLinks";

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
    try {
      const fd = new FormData(e.currentTarget);
      const username = String(fd.get("username") || "");
      const password = String(fd.get("password") || "");
      const result = await login(username, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(result.user.role === "admin" ? "/admin" : "/panel");
    } catch {
      setError("ورود انجام نشد. لطفاً دوباره تلاش کن.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="container-ay flex justify-center py-14 sm:py-16">
      <div className="w-full max-w-md space-y-6">
        <div className="card-ay p-7 sm:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-gold-500">ArtistYar</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-sand-50">ورود به آرتیست‌یار</h1>
          <p className="mt-2 text-sm leading-7 text-ink-400">
            با حساب ادمین یا حساب هنرجویی که در سایت ساخته‌ای وارد شو.
          </p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <div>
              <label htmlFor="login-username" className="mb-2 block text-xs text-ink-400">
                نام کاربری
              </label>
              <input id="login-username" className="input-ay" name="username" autoComplete="username" required />
            </div>
            <div>
              <label htmlFor="login-password" className="mb-2 block text-xs text-ink-400">
                رمز عبور
              </label>
              <input
                className="input-ay"
                type="password"
                id="login-password"
                name="password"
                autoComplete="current-password"
                required
              />
            </div>
            {error ? (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" className="btn-primary w-full min-h-[52px]" disabled={loading}>
              {loading ? "در حال ورود…" : "ورود"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-ink-500">
            حساب ندارید؟{" "}
            <Link href="/register" className="text-gold-400 hover:text-gold-300">
              ثبت‌نام
            </Link>
          </p>
        </div>

        <div className="px-1">
          <p className="mb-3 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-ink-500">
            قبل از ورود هم می‌توانی
          </p>
          <CommunityLinks variant="pills" className="justify-center" />
        </div>
      </div>
    </section>
  );
}
