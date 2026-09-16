import Link from "next/link";
import { BrandMark } from "./BrandMark";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-white/[0.06] bg-black/20">
      <div className="container-ay grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <BrandMark />
          <p className="mt-4 max-w-md text-sm leading-7 text-ink-400">
            آکادمی آرتیست‌یار — آموزش دقیق، مسیر شفاف، و تجربه‌ای مینیمال برای
            هنرجویانی که موسیقی را جدی می‌گیرند.
          </p>
        </div>
        <div>
          <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-ink-500">
            مسیرها
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-ink-300">
            <li>
              <Link href="/courses" className="hover:text-sand-50">
                دوره‌ها
              </Link>
            </li>
            <li>
              <Link href="/online" className="hover:text-sand-50">
                کلاس آنلاین
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-sand-50">
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
              <Link href="/about" className="hover:text-sand-50">
                درباره آکادمی
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-sand-50">
                پشتیبانی
              </Link>
            </li>
            <li className="text-ink-500">همگام با ربات تلگرام راه‌یار</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/[0.05] py-6 text-center text-xs text-ink-500">
        © {new Date().getFullYear()} آرتیست‌یار · طراحی مینیمال برای یادگیری جدی
      </div>
    </footer>
  );
}
