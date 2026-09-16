"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export default function RegisterPage() {
  const { register, user, ready } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");

  if (ready && user) router.replace("/panel");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const result = register({
      fullName: String(fd.get("fullName") || ""),
      username: String(fd.get("username") || ""),
      password: String(fd.get("password") || ""),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/panel");
  }

  return (
    <section className="container-ay flex justify-center py-16">
      <div className="card-ay w-full max-w-md p-8">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-gold-500">
          شروع مسیر
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-sand-50">ثبت‌نام هنرجو</h1>
        <p className="mt-2 text-sm leading-7 text-ink-400">
          حسابت را بساز تا مسیرهای آموزشی، درخواست کلاس و پیشرفتت را یک‌جا دنبال کنی.
        </p>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-2 block text-xs text-ink-400">نام کامل</label>
            <input className="input-ay" name="fullName" required />
          </div>
          <div>
            <label className="mb-2 block text-xs text-ink-400">نام کاربری</label>
            <input className="input-ay" name="username" required />
          </div>
          <div>
            <label className="mb-2 block text-xs text-ink-400">رمز عبور</label>
            <input className="input-ay" type="password" name="password" required />
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button type="submit" className="btn-primary w-full">
            شروع یادگیری
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-ink-500">
          قبلاً ثبت‌نام کرده‌اید؟{" "}
          <Link href="/login" className="text-gold-400">
            ورود
          </Link>
        </p>
      </div>
    </section>
  );
}
