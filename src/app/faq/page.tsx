import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { SafeLink } from "@/components/SafeLink";

export const metadata: Metadata = {
  title: "پرسش‌های متداول | آکادمی راه‌یار · ArtistYar",
  description:
    "پاسخ سؤالات رایج درباره شروع مسیر آموزش تنظیم، میکس و مسترینگ، پرداخت، دسترسی به دوره‌ها و پشتیبانی راه‌یار AI.",
  alternates: { canonical: "/faq" },
  openGraph: {
    type: "website",
    url: "/faq",
    title: "پرسش‌های متداول | ArtistYar",
    description: "قبل از شروع مسیر یادگیری، جواب‌های روشن درباره دوره، کلاس و پشتیبانی.",
  },
};

const faqs = [
  {
    question: "از کدام مسیر شروع کنم؟",
    answer:
      "اگر تازه شروع کرده‌ای، مسیر جامع راه‌یار مناسب‌تر است. برای تقویت پایه، تئوری موسیقی. برای کار روی پروژه خودت، کلاس آنلاین یا مشاوره رایگان.",
  },
  {
    question: "بعد از پرداخت دسترسی چطور فعال می‌شود؟",
    answer:
      "سفارش در سایت ثبت می‌شود و پس از تأیید تیم راه‌یار فعال می‌گردد. دوره‌های آموزشی معمولاً از طریق SpotPlayer و محصولات کانالی از طریق تلگرام.",
  },
  {
    question: "قبل از خرید می‌توانم راهنمایی بگیرم؟",
    answer:
      "بله. فرم مشاوره رایگان پایین صفحه اصلی را پر کن و بگو روی چه چیزی کار می‌کنی تا مسیر مناسب پیشنهاد شود.",
  },
  {
    question: "رسید پرداخت را کجا بفرستم؟",
    answer:
      "بعد از ثبت سفارش، فرم ارسال رسید در همین سایت نمایش داده می‌شود. همان‌جا بفرست تا وضعیت سفارش قابل پیگیری باشد.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

export default function FaqPage() {
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <section className="container-ay section-space">
        <Reveal>
          <div className="section-intro">
            <p className="eyebrow">/ پرسش‌های متداول</p>
            <h1 className="section-title">
              قبل از شروع،
              <br />
              <span className="text-gold-400">جواب‌ها روشن.</span>
            </h1>
            <p className="section-sub max-w-xl">
              سؤالات رایج درباره مسیر یادگیری، پرداخت و پشتیبانی آکادمی راه‌یار.
            </p>
          </div>
        </Reveal>

        <div className="mt-10 grid max-w-3xl gap-2">
          {faqs.map((faq) => (
            <details key={faq.question} className="faq-item card-ay group p-5">
              <summary className="faq-summary text-[0.95rem] font-medium text-sand-50">
                <span>{faq.question}</span>
                <span className="faq-summary-icon" aria-hidden="true">
                  <ChevronDown size={16} strokeWidth={2.2} />
                </span>
              </summary>
              <p className="faq-answer mt-3 text-sm leading-7 text-ink-400">{faq.answer}</p>
            </details>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <SafeLink href="/" hard className="btn-ghost gap-2">
            بازگشت به صفحه اصلی
          </SafeLink>
          <SafeLink href="/assistant" hard className="btn-primary gap-2">
            سؤال از راه‌یار AI
          </SafeLink>
        </div>
      </section>
    </div>
  );
}
