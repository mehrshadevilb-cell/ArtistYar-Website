import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ورود",
};

export default function LoginPage() {
  return (
    <section className="container-ay flex justify-center py-16">
      <div className="card-ay w-full max-w-md p-8">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-gold-500">
          Account
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-sand-50">ورود به آرتیست‌یار</h1>
        <p className="mt-2 text-sm leading-7 text-ink-400">
          ورود با نام کاربری و رمز عبور. در فاز بعد می‌توانید حساب را با اکانت ربات
          تلگرام همگام کنید.
        </p>

        <form className="mt-8 space-y-4">
          <div>
            <label className="mb-2 block text-xs text-ink-400">نام کاربری</label>
            <input className="input-ay" name="username" autoComplete="username" />
          </div>
          <div>
            <label className="mb-2 block text-xs text-ink-400">رمز عبور</label>
            <input
              className="input-ay"
              type="password"
              name="password"
              autoComplete="current-password"
            />
          </div>
          <button type="button" className="btn-primary w-full">
            ورود (اتصال API در فاز بعد)
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-ink-500">
          حساب ندارید؟ ثبت‌نام و لینک به ربات به‌زودی فعال می‌شود.{" "}
          <Link href="/contact" className="text-gold-400 hover:text-gold-300">
            پشتیبانی
          </Link>
        </p>
      </div>
    </section>
  );
}
