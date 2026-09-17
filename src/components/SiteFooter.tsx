import Link from "next/link";
import { BrandMark } from "./BrandMark";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-white/[0.06] bg-black/20">
      <div className="container-ay grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <BrandMark />
          <p className="mt-4 max-w-md text-sm leading-7 text-ink-400">
            آرتیست‌یار — آموزش تنظیم، میکس و مسترینگ با مسیر روشن، کلاس آنلاین و دستیار هوشمند راه‌یار AI.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/assistant"
              className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/30 bg-gold-500/[0.08] px-3.5 py-1.5 text-xs font-medium text-gold-300 transition hover:border-gold-500/50 hover:bg-gold-500/[0.14] hover:text-gold-200"
            >
              سؤال از راه‌یار AI
            </Link>
            <a
              href="https://rahyar-academy-management-system-v14.onrender.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-sm text-ink-400 transition hover:text-gold-300"
            >
              سامانه آکادمی راه‌یار ←
            </a>
          </div>
        </div>
        <div>
          <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-ink-500">
            مسیرها
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-ink-300">
            <li>
              <Link href="/courses" className="rounded-sm transition-colors hover:text-sand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300">
                دوره‌ها
              </Link>
            </li>
            <li>
              <Link href="/free-player" className="rounded-sm transition-colors text-gold-400 hover:text-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300">
                آموزش‌های رایگان
              </Link>
            </li>
            <li>
              <Link href="/online" className="rounded-sm transition-colors hover:text-sand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300">
                کلاس آنلاین
              </Link>
            </li>
            <li>
              <Link href="/assistant" className="rounded-sm font-medium text-gold-400 transition-colors hover:text-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300">
                راه‌یار AI
              </Link>
            </li>
            <li>
              <Link href="/track" className="rounded-sm transition-colors hover:text-sand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300">
                پیگیری سفارش
              </Link>
            </li>
            <li>
              <Link href="/login" className="rounded-sm transition-colors hover:text-sand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300">
                ورود هنرجو
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-ink-500">
            ارتباط
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-ink-300">
            <li>
              <Link href="/about" className="rounded-sm transition-colors hover:text-sand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300">
                درباره آکادمی
              </Link>
            </li>
            <li>
              <Link href="/contact" className="rounded-sm transition-colors hover:text-sand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300">
                پشتیبانی
              </Link>
            </li>
            <li>
              <a href="https://www.instagram.com/prodbymehrshad/" target="_blank" rel="noreferrer" className="rounded-sm text-gold-400 transition-colors hover:text-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300">
                آموزش‌های اینستاگرام
              </a>
            </li>
            <li className="text-ink-500">همراه با راه‌یار</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/[0.05] py-6 text-center text-xs text-ink-500">
        © {new Date().getFullYear()} آرتیست‌یار · یادگیری جدی با مسیر روشن و راه‌یار AI
      </div>
    </footer>
  );
}
