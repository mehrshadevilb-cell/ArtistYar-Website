import Link from "next/link";
import { BrandMark } from "./BrandMark";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-white/[0.06] bg-black/20">
      <div className="container-ay grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <BrandMark />
          <p className="mt-4 max-w-md text-sm leading-7 text-ink-400">
            آرتیست‌یار — آموزش تنظیم، میکس و مسترینگ برای هنرجویی که می‌خواهد موسیقی را درست و اصولی یاد بگیرد.
          </p>
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
                  <Link href="/online" className="rounded-sm transition-colors hover:text-sand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300">
                کلاس آنلاین
              </Link>
            </li>
            <li>
                  <Link href="/assistant" className="rounded-sm transition-colors hover:text-sand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300">
                راه‌یار؛ دستیار آموزشی
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
        © {new Date().getFullYear()} آرتیست‌یار · طراحی مینیمال برای یادگیری جدی
      </div>
    </footer>
  );
}
