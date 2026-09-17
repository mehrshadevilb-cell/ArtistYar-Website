import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";

const siteUrl = "https://artistyaar.ir";

export const metadata: Metadata = {
  title: "آموزش تنظیم، میکس و مسترینگ از پایه تا پروژه | آرتیست‌یار",
  description:
    "راهنمای پروژه‌محور آموزش تنظیم، میکس و مسترینگ برای هنرجویان موسیقی؛ از انتخاب صدا و ساخت arrangement تا بالانس، EQ، کمپرس، فضا و آماده‌سازی خروجی نهایی.",
  keywords: [
    "آموزش تنظیم میکس و مسترینگ",
    "آموزش تنظیم موسیقی",
    "آموزش میکس و مسترینگ",
    "دوره تنظیم و میکس",
    "آموزش میکس مسترینگ فارسی",
  ],
  alternates: { canonical: `${siteUrl}/amoozesh-mix-mastering` },
  openGraph: {
    type: "article",
    url: `${siteUrl}/amoozesh-mix-mastering`,
    title: "آموزش تنظیم، میکس و مسترینگ از پایه تا پروژه",
    description:
      "مسیر عملی آرتیست‌یار برای یادگیری تنظیم، میکس و مسترینگ با تمرین واقعی و راهنمایی راه‌یار AI.",
  },
};

const faqs = [
  {
    question: "برای شروع آموزش تنظیم، میکس و مسترینگ به چه چیزی نیاز دارم؟",
    answer:
      "یک سیستم مناسب، نرم‌افزار تولید موسیقی، هدفون یا مانیتور قابل‌اعتماد و مهم‌تر از همه یک پروژه برای تمرین کافی است. لازم نیست از روز اول تجهیزات گران داشته باشی؛ در شروع، شناخت مسیر سیگنال، گوش‌دادن دقیق و تصمیم‌گیری درست از خرید پلاگین مهم‌تر است.",
  },
  {
    question: "اول تنظیم را یاد بگیرم یا میکس و مسترینگ؟",
    answer:
      "این مهارت‌ها به هم وصل‌اند، اما بهتر است با مبانی موسیقی و تنظیم شروع کنی و بعد به میکس و مسترینگ برسی. تنظیم ضعیف با پلاگین‌های بیشتر نجات پیدا نمی‌کند. در مسیر آرتیست‌یار، انتخاب صدا، arrangement، بالانس، میکس و خروجی نهایی به‌صورت زنجیره‌ای تمرین می‌شوند.",
  },
  {
    question: "آیا این آموزش برای FL Studio مناسب است؟",
    answer:
      "بله. اصول تنظیم، میکس و مسترینگ به یک نرم‌افزار خاص محدود نیستند و مفاهیم در FL Studio و دیگر DAWها قابل اجرا هستند. تمرکز آموزش روی دلیل هر تصمیم، شنیدن نتیجه و ساختن workflow قابل تکرار است؛ نه حفظ‌کردن تنظیمات ثابت پلاگین‌ها.",
  },
  {
    question: "تفاوت میکس و مسترینگ چیست؟",
    answer:
      "در میکس، اجزای یک پروژه مثل درام، بیس، ملودی و وکال نسبت به هم تنظیم می‌شوند؛ در مسترینگ، نسخهٔ نهایی برای پخش و ترجمهٔ بهتر روی سیستم‌های مختلف آماده می‌شود. مسترینگ جای میکس ضعیف را نمی‌گیرد، بنابراین باید از بالانس و انتخاب صدای درست شروع کرد.",
  },
  {
    question: "از کدام مسیر آموزشی آرتیست‌یار شروع کنم؟",
    answer:
      "اگر مسیر جامع تنظیم، میکس و مسترینگ می‌خواهی، دورهٔ راه‌یار نقطهٔ شروع اصلی است. برای تقویت پایه‌ها می‌توانی از تئوری موسیقی شروع کنی و اگر می‌خواهی روی پروژهٔ خودت بازخورد بگیری، کلاس آنلاین یا مشاورهٔ رایگان مناسب‌تر است.",
  },
];

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "آموزش تنظیم، میکس و مسترینگ از پایه تا پروژه",
  description: metadata.description,
  inLanguage: "fa-IR",
  url: `${siteUrl}/amoozesh-mix-mastering`,
  author: { "@type": "Person", name: "مهرشاد بنائی", url: `${siteUrl}/about` },
  publisher: { "@type": "EducationalOrganization", name: "ArtistYar Academy", url: siteUrl },
  mainEntityOfPage: `${siteUrl}/amoozesh-mix-mastering`,
  about: ["تنظیم موسیقی", "میکس موسیقی", "مسترینگ موسیقی"],
};

const courseJsonLd = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: "آموزش تنظیم، میکس و مسترینگ",
  description: "مسیر پروژه‌محور یادگیری تنظیم، میکس و مسترینگ در آکادمی آرتیست‌یار.",
  provider: { "@type": "EducationalOrganization", name: "ArtistYar Academy", url: siteUrl },
  url: `${siteUrl}/courses`,
  inLanguage: "fa-IR",
  teaches: ["تنظیم موسیقی", "انتخاب صدا", "میکس", "مسترینگ", "EQ", "کمپرس", "فضاسازی"],
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

export default function MixingMasteringGuidePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <main className="page-shell">
        <section className="container-ay py-16 sm:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <p className="eyebrow">راهنمای آرتیست‌یار برای تولید موسیقی</p>
            <h1 className="hero-heading mt-5 text-balance text-4xl font-semibold tracking-tight text-sand-50 sm:text-6xl">
              آموزش تنظیم، میکس و مسترینگ؛ از ایده تا خروجی نهایی
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-ink-300 sm:text-lg">
              اگر می‌خواهی موسیقی‌ات فقط شنیده نشود و واقعاً شکل بگیرد، باید تنظیم، میکس و مسترینگ را به‌عنوان سه مرحلهٔ جدا اما مرتبط یاد بگیری. این راهنما مسیر عملی آرتیست‌یار را توضیح می‌دهد: از انتخاب صدا و ساخت arrangement تا بالانس، کنترل فرکانس، عمق، داینامیک و آماده‌سازی خروجی.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/courses#p-1" className="btn-primary">شروع مسیر راه‌یار</Link>
              <Link href="/free-player" className="btn-ghost">دیدن آموزش‌های رایگان</Link>
            </div>
          </div>

          <div className="mt-16 grid gap-5 md:grid-cols-3">
            {[
              ["۱", "تنظیم و arrangement", "ایدهٔ موسیقی را با انتخاب صدا، ریتم، هارمونی و ساختار به یک پروژهٔ منسجم تبدیل کن."],
              ["۲", "میکس و تصمیم شنیداری", "با gain staging، بالانس، EQ، کمپرس و فضا، هر عنصر را در جای درست خود بنشان."],
              ["۳", "مسترینگ و خروجی", "نسخهٔ نهایی را کنترل کن تا روی هدفون، اسپیکر و پلتفرم‌های مختلف ترجمهٔ قابل‌اعتمادتری داشته باشد."],
            ].map(([number, title, body]) => (
              <div className="card-ay p-6 md:p-7" key={title}>
                <span className="text-sm font-semibold text-gold-400">{number}</span>
                <h2 className="mt-4 text-xl font-medium text-sand-50">{title}</h2>
                <p className="mt-3 text-sm leading-8 text-ink-400">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container-ay pb-16 sm:pb-24">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
            <article className="card-ay p-7 md:p-10">
              <p className="eyebrow">/ مبانی قبل از پلاگین</p>
              <h2 className="mt-4 text-3xl font-medium text-sand-50">تنظیم خوب، پایهٔ میکس خوب است</h2>
              <div className="mt-6 space-y-5 text-sm leading-8 text-ink-300">
                <p>در آموزش تنظیم موسیقی، هدف فقط اضافه‌کردن لایه‌های بیشتر نیست. باید بدانی هر صدا چه نقشی دارد، در چه محدوده‌ای قرار می‌گیرد و چگونه با ریتم، ملودی و فضای قطعه ارتباط می‌گیرد. انتخاب صدای مناسب در بسیاری از مواقع از پردازش سنگین مهم‌تر است.</p>
                <p>قبل از بازکردن EQ و کمپرسور، پروژه را با گوش و مرجع مناسب بررسی کن: ساختار آهنگ، انرژی بخش‌ها، تضاد verse و chorus، جای وکال یا ملودی اصلی و رابطهٔ kick و bass را مشخص کن. این تصمیم‌ها بعداً میکس را ساده‌تر و شفاف‌تر می‌کنند.</p>
                <p>یک workflow قابل تکرار بساز: نام‌گذاری و رنگ‌بندی ترک‌ها، گروه‌بندی، busها، gain staging، نسخه‌های پشتیبان و یادداشت‌کردن تصمیم‌ها. هدف آموزش پروژه‌محور این است که بتوانی همین روش را روی آهنگ بعدی هم اجرا کنی.</p>
              </div>
            </article>
            <aside className="card-ay p-7 md:p-10">
              <p className="eyebrow">/ چک‌لیست تنظیم</p>
              <h2 className="mt-4 text-2xl font-medium text-sand-50">قبل از شروع میکس</h2>
              <ul className="mt-6 space-y-4 text-sm leading-7 text-ink-300">
                <li>✓ ساختار قطعه و انرژی هر بخش مشخص است.</li>
                <li>✓ صداهای اضافی حذف و نقش هر ترک روشن است.</li>
                <li>✓ کلیپ و نویز ناخواسته کنترل شده است.</li>
                <li>✓ ترک‌ها نام‌گذاری و به گروه‌های منطقی وصل شده‌اند.</li>
                <li>✓ یک یا دو reference مناسب برای مقایسه داری.</li>
              </ul>
            </aside>
          </div>
        </section>

        <section className="bg-white/[.025] py-16 sm:py-24">
          <div className="container-ay">
            <SectionHeading eyebrow="/ آموزش میکس" title="میکس یعنی تصمیم‌گیری، نه جمع‌کردن پلاگین" subtitle="چهار مرحلهٔ زیر را روی پروژهٔ واقعی تمرین کن و هر بار فقط یک مسئله را حل کن." />
            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {[
                ["بالانس و gain staging", "با فیدرها، پنینگ و سطح مناسب شروع کن. اگر بالانس پایه درست باشد، پردازش‌ها هدفمندتر و قابل‌فهم‌تر می‌شوند."],
                ["EQ و ماسکینگ فرکانسی", "به‌جای تقویت بی‌دلیل، با حذف فرکانس‌های مزاحم، انتخاب منبع مناسب و مقایسه در context، جا برای عناصر مهم بساز."],
                ["کمپرس و داینامیک", "کمپرسور را برای کنترل حرکت، شکل‌دادن به ترنزینت یا چسباندن گروه به کار ببر؛ نه برای بلندترکردن بی‌هدف همه‌چیز."],
                ["ریورب، delay و عمق", "با زمان، pre-delay، فیلتر و automation، عمق ایجاد کن و مرکز میکس را برای عنصر اصلی خوانا نگه دار."],
              ].map(([title, body]) => (
                <div className="card-ay p-6 md:p-8" key={title}>
                  <h3 className="text-xl font-medium text-sand-50">{title}</h3>
                  <p className="mt-3 text-sm leading-8 text-ink-400">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container-ay py-16 sm:py-24">
          <div className="grid gap-8 lg:grid-cols-[.85fr_1.15fr]">
            <div className="card-ay p-7 md:p-10">
              <p className="eyebrow">/ خروجی نهایی</p>
              <h2 className="mt-4 text-3xl font-medium text-sand-50">مسترینگ بعد از میکس شروع می‌شود</h2>
              <p className="mt-5 text-sm leading-8 text-ink-300">مسترینگ خوب، اصلاح جادویی یک میکس نامتعادل نیست. ابتدا headroom مناسب، کنترل peakها، ترجمهٔ قابل‌قبول روی چند سیستم و یک مرجع شنیداری داشته باش. سپس loudness، داینامیک، tonal balance و فرمت خروجی را بررسی کن.</p>
              <Link href="/assistant" className="mt-7 inline-flex text-sm text-gold-400 hover:text-gold-300">از راه‌یار دربارهٔ پروژه‌ات بپرس ←</Link>
            </div>
            <div>
              <p className="eyebrow">/ مسیر پیشنهادی یادگیری</p>
              <h2 className="mt-4 text-3xl font-medium text-sand-50">از تمرین کوتاه تا پروژهٔ کامل</h2>
              <div className="mt-7 space-y-4">
                {["هفتهٔ اول: گوش‌دادن تحلیلی، تئوری پایه و شناخت مسیر سیگنال", "هفتهٔ دوم: انتخاب صدا، ساختار، ریتم و arrangement", "هفتهٔ سوم: بالانس، پنینگ، EQ و کمپرس روی پروژهٔ خودت", "هفتهٔ چهارم: فضا، automation، اصلاحات و آماده‌سازی خروجی"].map((item, index) => (
                  <div className="flex gap-4 rounded-2xl border border-white/[.08] bg-white/[.025] p-4" key={item}>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold-400/15 text-sm text-gold-300">{index + 1}</span>
                    <p className="text-sm leading-7 text-ink-300">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container-ay pb-16 sm:pb-24">
          <div className="mx-auto max-w-4xl">
            <SectionHeading eyebrow="/ پرسش‌های متداول" title="سؤال‌های رایج دربارهٔ آموزش تنظیم، میکس و مسترینگ" subtitle="اگر سؤال دیگری داری، راه‌یار AI برای بررسی مسیر و پروژه‌ات در دسترس است." />
            <div className="mt-10 space-y-4">
              {faqs.map((faq) => (
                <details className="card-ay group p-5" key={faq.question}>
                  <summary className="cursor-pointer list-none font-medium text-sand-50 marker:hidden">{faq.question}</summary>
                  <p className="mt-4 border-t border-white/[.08] pt-4 text-sm leading-8 text-ink-400">{faq.answer}</p>
                </details>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/courses" className="btn-primary">دیدن دوره‌های آموزشی</Link>
              <Link href="/online" className="btn-ghost">کلاس آنلاین و بازخورد پروژه</Link>
              <Link href="/contact" className="btn-ghost">مشاورهٔ رایگان</Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
