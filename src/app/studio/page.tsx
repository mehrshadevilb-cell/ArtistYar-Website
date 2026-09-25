import Link from "next/link";
import type { Metadata } from "next";
import { AudioWaveform, Scissors, Music2, Disc3, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "استودیو | خدمات تنظیم، میکس و مسترینگ",
  description:
    "ابزارهای تولید و خدمات استودیو آرتیست‌یار: تحلیل میکس، جداسازی وکال، سفارش تنظیم، میکس و مسترینگ.",
  alternates: { canonical: "/studio" },
  openGraph: { type: "website", url: "/studio", title: "استودیو آرتیست‌یار | تنظیم، میکس و مسترینگ" },
};

const tools = [
  {
    title: "تحلیل میکس و تنظیم",
    href: "/music-analyzer",
    icon: AudioWaveform,
    desc: "تحلیل فنی و پیشنهاد برای میکس و تنظیم",
  },
  {
    title: "جداسازی وکال و Stem",
    href: "/separate",
    icon: Scissors,
    desc: "جداسازی وکال و استم‌ها در مرورگر",
  },
  {
    title: "سفارش تنظیم",
    href: "/arrangement",
    icon: Music2,
    desc: "طراحی ساختار و المان‌های آهنگ",
  },
] as const;

export default function StudioPage() {
  return (
    <main className="container-ay py-10 sm:py-14">
      <p className="eyebrow">STUDIO</p>
      <h1 className="mt-2 text-3xl font-semibold text-sand-50">فضای ساخت و کار روی پروژه</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-500">
        ابزارهای تولید، تحلیل و سرویس‌های استودیو را از یک نقطه باز کن و نتیجه را داخل پروژه نگه دار.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {tools.map(({ title, href, icon: Icon, desc }) => (
          <Link key={href} href={href} className="card-ay p-6 hover:border-gold-400/25">
            <Icon size={22} className="text-cyan-300" />
            <h2 className="mt-4 text-lg text-sand-50">{title}</h2>
            <p className="mt-2 text-xs leading-6 text-ink-500">{desc}</p>
            <span className="mt-3 block text-xs text-gold-400">ورود به ابزار ←</span>
          </Link>
        ))}
      </div>

      <section id="mix-mastering" className="scroll-mt-24 mt-10">
        <div className="card-ay overflow-hidden border-gold-400/15 p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gold-400/20 bg-gold-400/10 text-gold-300">
                  <Disc3 size={20} aria-hidden />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-ink-500">Studio Service</p>
                  <h2 className="text-xl font-medium text-sand-50 sm:text-2xl">
                    میکس و <span className="text-gold-400">مسترینگ</span>
                  </h2>
                </div>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-400">
                بالانس کانال‌ها، فضاسازی، کنترل داینامیک و مستر نهایی برای استریم و انتشار.
                پروژه با مرجع صوتی و سبک موردنظر شما بررسی و تحویل داده می‌شود.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs text-ink-300">
                <span className="rounded-full border border-white/10 px-3 py-1.5">میکس حرفه‌ای</span>
                <span className="rounded-full border border-white/10 px-3 py-1.5">مسترینگ</span>
                <span className="rounded-full border border-white/10 px-3 py-1.5">آماده‌سازی انتشار</span>
                <span className="rounded-full border border-white/10 px-3 py-1.5">بازنگری تا رضایت</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 self-start">
              <a
                href="mailto:hello@artistyar.dev?subject=%D8%B3%D9%81%D8%A7%D8%B1%D8%B4%20%D9%85%DB%8C%DA%A9%D8%B3%20%D9%88%20%D9%85%D8%B3%D8%AA%D8%B1%DB%8C%D9%86%DA%AF"
                className="btn-primary inline-flex items-center justify-center gap-2"
              >
                درخواست میکس و مسترینگ
                <ArrowLeft size={16} aria-hidden />
              </a>
              <Link href="/arrangement" className="btn-ghost text-center text-xs !py-2.5">
                یا سفارش تنظیم
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
