import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Music2, SlidersHorizontal, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "خدمات تنظیم آثار موسیقی | ArtistYar",
  description:
    "سفارش تنظیم آثار موسیقی در ArtistYar؛ تنظیم اختصاصی قطعه، بازتنظیم پروژه، طراحی ساختار، انتخاب صدا و آماده‌سازی پروژه برای میکس.",
  keywords: [
    "تنظیم آثار موسیقی",
    "سفارش تنظیم آهنگ",
    "تنظیم موسیقی",
    "تنظیم اختصاصی",
    "بازتنظیم آهنگ",
    "ArtistYar",
  ],
  alternates: { canonical: "/arrangement" },
  openGraph: {
    title: "خدمات تنظیم آثار موسیقی | ArtistYar",
    description:
      "خدمات تخصصی تنظیم آثار موسیقی برای خواننده‌ها و هنرمندان؛ از ایده و دمو تا پروژه آماده میکس.",
    type: "website",
    url: "/arrangement",
  },
};

const services = [
  {
    icon: Music2,
    title: "تنظیم اختصاصی قطعه",
    description:
      "تبدیل دمو، ملودی یا ایده اولیه به یک تنظیم کامل با ساختار مشخص و متناسب با سبک اثر.",
  },
  {
    icon: SlidersHorizontal,
    title: "بازتنظیم و تکمیل پروژه",
    description:
      "بررسی پروژه موجود، اصلاح ساختار و تکمیل بخش‌هایی که برای رسیدن به نتیجه نهایی نیاز به تنظیم دارند.",
  },
  {
    icon: Sparkles,
    title: "طراحی صدا و انتخاب المان‌ها",
    description:
      "انتخاب و چیدمان سازها، درام‌ها، بیس، پدها و المان‌های مناسب برای هویت صوتی قطعه.",
  },
];

const workflow = [
  "دریافت دمو، ایده یا پروژه اولیه",
  "بررسی سبک، مرجع و هدف قطعه",
  "طراحی ساختار و تنظیم",
  "ارسال نسخه پروژه برای بازبینی",
  "تحویل فایل‌های پروژه و خروجی‌های مورد توافق",
];

export default function ArrangementPage() {
  return (
    <main className="container-ay py-14 sm:py-18">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        <div>
          <p className="eyebrow">/ خدمات تنظیم آثار موسیقی</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-[1.35] text-sand-50 sm:text-5xl">
            ایده‌ات را به یک
            <br />
            <span className="gold-shimmer">تنظیم واقعی و قابل تولید</span>
            تبدیل کن.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-8 text-ink-300 sm:text-base">
            ArtistYar برای سفارش تنظیم آثار موسیقی، از دمو و ایده اولیه تا طراحی ساختار،
            انتخاب المان‌ها و آماده‌سازی پروژه برای مرحله میکس، یک مسیر مشخص ارائه می‌دهد.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="mailto:hello@artistyar.dev?subject=درخواست%20تنظیم%20اثر%20موسیقی"
              className="btn-primary gap-2"
            >
              درخواست تنظیم اثر
              <ArrowLeft size={16} aria-hidden />
            </a>
            <Link href="/gallery" className="btn-ghost gap-2">
              دیدن نمونه‌کارها
              <ArrowLeft size={16} aria-hidden />
            </Link>
          </div>

          <p className="mt-4 text-xs leading-6 text-ink-500">
            برای شروع، دمو یا توضیح پروژه‌ات را همراه با سبک و مرجع صوتی ارسال کن تا جزئیات کار بررسی شود.
          </p>
        </div>

        <div className="card-ay relative overflow-hidden p-6 sm:p-8">
          <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-gold-500/10 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gold-400/20 bg-gold-400/10 text-gold-300">
                <Music2 size={20} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-ink-500">ArtistYar Studio</p>
                <h2 className="mt-1 text-lg font-medium text-sand-50">تنظیم آثار موسیقی</h2>
              </div>
            </div>

            <div className="mt-7 space-y-3">
              {[
                "تنظیم اختصاصی برای قطعه و دمو",
                "بازتنظیم و تکمیل پروژه موجود",
                "طراحی ساختار و انتخاب المان‌های موسیقی",
                "آماده‌سازی پروژه برای ورود به مرحله میکس",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5 text-sm text-ink-300">
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-gold-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-16 sm:mt-20">
        <div className="mb-7">
          <p className="eyebrow">/ خدمات</p>
          <h2 className="mt-2 text-2xl font-medium text-sand-50">آنچه در سفارش تنظیم ارائه می‌شود</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <article key={service.title} className="card-ay p-6">
                <Icon size={20} className="text-gold-400" />
                <h3 className="mt-5 text-base font-medium text-sand-50">{service.title}</h3>
                <p className="mt-3 text-sm leading-7 text-ink-400">{service.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-16 grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <p className="eyebrow">/ روند همکاری</p>
          <h2 className="mt-2 text-2xl font-medium text-sand-50">از دمو تا پروژه تنظیم‌شده</h2>
          <p className="mt-3 text-sm leading-7 text-ink-400">
            قبل از شروع، نیاز پروژه، سبک، رفرنس و خروجی مورد انتظار مشخص می‌شود تا محدوده کار روشن باشد.
          </p>
        </div>

        <div className="card-ay p-6 sm:p-8">
          <ol className="space-y-4">
            {workflow.map((step, index) => (
              <li key={step} className="flex items-start gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 text-xs text-gold-400">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="pt-1 text-sm leading-6 text-ink-300">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mt-16 card-ay border-gold-400/10 p-7 sm:p-9">
        <p className="eyebrow">/ شروع پروژه</p>
        <h2 className="mt-3 text-2xl font-medium text-sand-50">برای سفارش تنظیم، پروژه‌ات را معرفی کن.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-400">
          نام قطعه، سبک، وضعیت فعلی پروژه، رفرنس‌های مدنظر و هر توضیحی که برای درک ایده لازم است را ارسال کن.
          بعد از بررسی، جزئیات همکاری مشخص می‌شود.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="mailto:hello@artistyar.dev?subject=درخواست%20تنظیم%20اثر%20موسیقی"
            className="btn-primary gap-2"
          >
            شروع درخواست
            <ArrowLeft size={16} aria-hidden />
          </a>
          <Link href="/contact" className="btn-ghost">
            تماس و مشاوره
          </Link>
        </div>
      </section>
    </main>
  );
}
