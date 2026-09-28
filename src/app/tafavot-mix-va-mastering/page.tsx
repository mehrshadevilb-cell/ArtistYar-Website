import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(/\/$/, "");
const pagePath = "/tafavot-mix-va-mastering";
const pageUrl = `${siteUrl}${pagePath}`;

export const metadata: Metadata = {
  title: "تفاوت میکس و مسترینگ چیست؟ راهنمای عملی | آرتیست‌یار",
  description:
    "تفاوت میکس و مسترینگ را به‌زبان ساده بفهم: میکس بالانس ترک‌هاست، مسترینگ آماده‌سازی نسخهٔ نهایی برای انتشار. با مثال عملی، اشتباهات رایج و مسیر یادگیری در آکادمی راه‌یار.",
  keywords: [
    "تفاوت میکس و مسترینگ",
    "میکس چیست",
    "مسترینگ چیست",
    "آموزش میکس",
    "آموزش مسترینگ",
    "میکس و مسترینگ فارسی",
    "فرق میکس با مسترینگ",
    "مسترینگ بعد از میکس",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    type: "article",
    url: pageUrl,
    title: "تفاوت میکس و مسترینگ چیست؟ | آرتیست‌یار",
    description:
      "میکس و مسترینگ دو مرحلهٔ جدا هستند. این راهنما فرق، ترتیب کار و اشتباهات رایج را روشن می‌کند.",
    siteName: "ArtistYar",
    locale: "fa_IR",
  },
  twitter: {
    card: "summary_large_image",
    title: "تفاوت میکس و مسترینگ | آرتیست‌یار",
    description: "فرق میکس با مسترینگ، ترتیب کار و مسیر یادگیری عملی.",
  },
};

const faqs = [
  {
    question: "اول میکس کنم یا مسترینگ؟",
    answer:
      "همیشه اول میکس. مسترینگ روی نسخهٔ نهایی میکس‌شده انجام می‌شود. اگر بالانس، پنینگ و فضا درست نباشد، مسترینگ فقط مشکلات را بلندتر یا سخت‌تر می‌کند.",
  },
  {
    question: "آیا می‌توان میکس و مسترینگ را هم‌زمان در یک پروژه انجام داد؟",
    answer:
      "از نظر فنی ممکن است، اما برای یادگیری و کیفیت بهتر است جدا باشند. میکس روی تک‌تک ترک‌ها تمرکز دارد؛ مسترینگ روی خروجی استریو نهایی. جدا کردن این دو مرحله تصمیم‌گیری را شفاف‌تر می‌کند.",
  },
  {
    question: "مسترینگ می‌تواند میکس ضعیف را نجات دهد؟",
    answer:
      "خیر. مسترینگ می‌تواند بلندی، تعادل تونال کلی و سازگاری با پلتفرم‌ها را بهبود دهد، اما جای بالانس بد، ماسکینگ فرکانسی یا وکال گم‌شده را نمی‌گیرد. پایه همیشه میکس درست است.",
  },
  {
    question: "برای یادگیری میکس و مسترینگ از کجا شروع کنم؟",
    answer:
      "با گوش‌دادن تحلیلی و بالانس ساده شروع کن، بعد EQ و کمپرس، سپس فضا و automation. وقتی میکس پایدار شد، به مسترینگ برو. مسیر کامل در راهنمای آموزش تنظیم، میکس و مسترینگ آرتیست‌یار و دوره‌های آکادمی آمده است.",
  },
];

const comparison = [
  {
    title: "هدف",
    mix: "ترک‌ها نسبت به هم درست شنیده شوند و داستان قطعه واضح باشد.",
    master: "نسخهٔ نهایی روی سیستم‌های مختلف پایدار و آمادهٔ انتشار باشد.",
  },
  {
    title: "ورودی کار",
    mix: "مولتی‌ترک یا استم‌ها (درام، بیس، وکال، ملودی و…).",
    master: "معمولاً یک فایل استریو میکس‌شدهٔ نهایی.",
  },
  {
    title: "ابزارهای رایج",
    mix: "ولوم، پنینگ، EQ، کمپرس، ریورب، دیلی، automation.",
    master: "EQ ظریف، کمپرس/لیمیت، کنترل لودنس، چک استریو و ترجمهٔ پخش.",
  },
  {
    title: "اشتباه رایج",
    mix: "از پلاگین زیاد شروع کردن قبل از بالانس ساده.",
    master: "بلند کردن بیش از حد بدون اصلاح میکس.",
  },
];

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "تفاوت میکس و مسترینگ چیست؟ راهنمای عملی",
  description: metadata.description,
  inLanguage: "fa-IR",
  url: pageUrl,
  author: { "@type": "Person", name: "مهرشاد بنائی", url: `${siteUrl}/about` },
  publisher: {
    "@type": "EducationalOrganization",
    name: "ArtistYar",
    alternateName: "آکادمی راه‌یار",
    url: siteUrl,
  },
  mainEntityOfPage: pageUrl,
  about: ["میکس موسیقی", "مسترینگ موسیقی", "تفاوت میکس و مسترینگ"],
  keywords: "تفاوت میکس و مسترینگ, آموزش میکس, آموزش مسترینگ",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

export default function MixVsMasteringPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <main>
        <div className="container-ay pt-8">
          <Breadcrumbs
            items={[
              { name: "آموزش", href: "/courses" },
              { name: "تفاوت میکس و مسترینگ" },
            ]}
          />
        </div>

        <section className="container-ay pb-10 pt-4 sm:pb-14 sm:pt-6">
          <p className="eyebrow">راهنمای کوتاه · تولید موسیقی</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-sand-50 sm:text-4xl md:text-5xl">
            تفاوت میکس و مسترینگ چیست؟
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-8 text-ink-300 sm:text-base">
            خیلی‌ها این دو را یکی می‌دانند؛ در عمل دو مرحلهٔ جدا با هدف متفاوت‌اند. میکس برای چیدن و بالانس
            اجزای قطعه است؛ مسترینگ برای آماده‌کردن نسخهٔ نهایی برای پخش و انتشار. این صفحه فرق را شفاف می‌کند
            تا مسیر یادگیری و سفارش خدماتت درست انتخاب شود.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/amoozesh-tanzim-mix-mastering" className="btn-primary">
              راهنمای کامل تنظیم تا مسترینگ
            </Link>
            <Link href="/studio#mix-mastering" className="btn-ghost">
              خدمات میکس و مسترینگ
            </Link>
            <Link href="/courses" className="btn-ghost">
              دوره‌های آموزشی
            </Link>
          </div>
        </section>

        <section className="container-ay pb-12 sm:pb-16">
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="card-ay p-6 sm:p-8">
              <p className="eyebrow">/ میکس</p>
              <h2 className="mt-3 text-2xl font-medium text-sand-50">میکس چه کاری می‌کند؟</h2>
              <p className="mt-4 text-sm leading-8 text-ink-300">
                در میکس، هر عنصر پروژه — درام، بیس، وکال، ملودی، افکت — نسبت به بقیه جا پیدا می‌کند. هدف این
                است که داستان قطعه شنیده شود: چه چیزی جلو باشد، چه چیزی فضا بسازد، و هیچ‌چیز بی‌دلیل ماسک نشود.
              </p>
              <ul className="mt-5 space-y-2 text-sm leading-7 text-ink-400">
                <li className="flex gap-2">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" aria-hidden />
                  بالانس ولوم و پنینگ
                </li>
                <li className="flex gap-2">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" aria-hidden />
                  EQ و کمپرس روی ترک‌ها
                </li>
                <li className="flex gap-2">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" aria-hidden />
                  فضا (ریورب/دیلی) و automation
                </li>
              </ul>
            </article>
            <article className="card-ay p-6 sm:p-8">
              <p className="eyebrow">/ مسترینگ</p>
              <h2 className="mt-3 text-2xl font-medium text-sand-50">مسترینگ چه کاری می‌کند؟</h2>
              <p className="mt-4 text-sm leading-8 text-ink-300">
                مسترینگ روی خروجی میکس‌شده کار می‌کند. هدف، ترجمهٔ بهتر روی هدفون، اسپیکر، ماشین و استریم است:
                تعادل تونال کلی، کنترل داینامیک نهایی و لودنس مناسب پلتفرم — بدون خراب‌کردن حس میکس.
              </p>
              <ul className="mt-5 space-y-2 text-sm leading-7 text-ink-400">
                <li className="flex gap-2">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" aria-hidden />
                  اصلاح ظریف طیف فرکانسی
                </li>
                <li className="flex gap-2">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" aria-hidden />
                  کنترل پیک و لودنس
                </li>
                <li className="flex gap-2">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" aria-hidden />
                  چک سازگاری پخش و خروجی نهایی
                </li>
              </ul>
            </article>
          </div>
        </section>

        <section className="container-ay pb-12 sm:pb-16">
          <SectionHeading
            eyebrow="/ مقایسهٔ سریع"
            title="میکس در برابر مسترینگ"
            subtitle="اگر فقط یک جدول به‌خاطر بسپاری، همین کافی است تا مسیر یادگیری و سفارش را اشتباه نگیری."
          />
          <div className="mt-8 overflow-x-auto rounded-2xl border border-white/[.08]">
            <table className="w-full min-w-[36rem] text-right text-sm">
              <thead className="bg-white/[.04] text-ink-300">
                <tr>
                  <th className="px-4 py-3 font-medium">محور</th>
                  <th className="px-4 py-3 font-medium">میکس</th>
                  <th className="px-4 py-3 font-medium">مسترینگ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[.06] text-ink-300">
                {comparison.map((row) => (
                  <tr key={row.title} className="align-top">
                    <td className="px-4 py-4 font-medium text-sand-50">{row.title}</td>
                    <td className="px-4 py-4 leading-7">{row.mix}</td>
                    <td className="px-4 py-4 leading-7">{row.master}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="container-ay pb-12 sm:pb-16">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <SectionHeading
                eyebrow="/ ترتیب درست"
                title="اول میکس، بعد مسترینگ"
                subtitle="این ترتیب فقط رسم نیست؛ منطق سیگنال و تصمیم‌گیری است."
              />
              <ol className="mt-7 space-y-4">
                {[
                  "تنظیم و انتخاب صدا را تا حد معقول جمع کن تا میکس روی مصالح درست کار کند.",
                  "میکس را تا جایی ببر که وکال، ریتم و فضا بدون وابستگی به لودنس نهایی واضح باشند.",
                  "خروجی استریو میکس را با هد‌روم مناسب (بدون کلیپ) برای مسترینگ بفرست.",
                  "مسترینگ را برای تعادل نهایی و انتشار انجام بده — نه برای جبران بالانس بد.",
                ].map((item, index) => (
                  <li key={item} className="flex gap-4 rounded-2xl border border-white/[.08] bg-white/[.025] p-4">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold-400/15 text-sm text-gold-300">
                      {index + 1}
                    </span>
                    <p className="text-sm leading-7 text-ink-300">{item}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div className="card-ay p-6 sm:p-8">
              <p className="eyebrow">/ مسیر آرتیست‌یار</p>
              <h2 className="mt-3 text-xl font-medium text-sand-50">از فهم تفاوت تا مهارت عملی</h2>
              <p className="mt-4 text-sm leading-8 text-ink-300">
                فهم تفاوت میکس و مسترینگ نقطهٔ شروع است. مهارت با تمرین روی پروژهٔ واقعی ساخته می‌شود: گوش
                تحلیلی، تصمیم‌های کم‌تعداد اما دقیق، و بازخورد. در آکادمی راه‌یار این مسیر با دوره، کلاس آنلاین و
                راه‌یار AI پشتیبانی می‌شود.
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <Link href="/amoozesh-tanzim-mix-mastering" className="text-sm text-gold-400 hover:text-gold-300">
                  راهنمای کامل آموزش تنظیم، میکس و مسترینگ ←
                </Link>
                <Link href="/online" className="text-sm text-gold-400 hover:text-gold-300">
                  کلاس آنلاین روی پروژهٔ خودت ←
                </Link>
                <Link href="/assistant" className="text-sm text-gold-400 hover:text-gold-300">
                  سؤال از راه‌یار AI ←
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="container-ay pb-16 sm:pb-24">
          <SectionHeading
            eyebrow="/ پرسش‌های متداول"
            title="سؤال‌های رایج دربارهٔ میکس و مسترینگ"
            subtitle="اگر هنوز مطمئن نیستی از کجا شروع کنی، از مشاوره یا راه‌یار AI استفاده کن."
          />
          <div className="mt-10 space-y-4">
            {faqs.map((faq) => (
              <details className="card-ay group p-5" key={faq.question}>
                <summary className="cursor-pointer list-none font-medium text-sand-50 marker:hidden">
                  {faq.question}
                </summary>
                <p className="mt-4 border-t border-white/[.08] pt-4 text-sm leading-8 text-ink-400">{faq.answer}</p>
              </details>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/courses" className="btn-primary">
              دیدن دوره‌ها
            </Link>
            <Link href="/studio#mix-mastering" className="btn-ghost">
              سفارش میکس و مسترینگ
            </Link>
            <Link href="/contact" className="btn-ghost">
              مشاورهٔ رایگان
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
