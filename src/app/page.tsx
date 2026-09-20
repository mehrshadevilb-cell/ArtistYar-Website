import Image from "next/image";
import type { Metadata } from "next";
import { ArrowLeft, Bot, ChevronDown, CirclePlay, Sparkles, Waves } from "lucide-react";
import { HomeLiveCourses } from "@/components/HomeLiveCourses";
import { QuickConsultationForm } from "@/components/QuickConsultationForm";
import { Reveal } from "@/components/Reveal";
import { DepthScene } from "@/components/DepthScene";
import { ScrollDepth } from "@/components/ScrollDepth";
import { HeroActions } from "@/components/HeroActions";
import { SafeLink } from "@/components/SafeLink";
import { CommunityLinks } from "@/components/CommunityLinks";
import { instagramGallery } from "@/data/instagram-gallery";
import { HeroDifferentiator } from "@/components/HeroDifferentiator";
import { PracticeEnginePreview } from "@/components/PracticeEnginePreview";
import { CoreFeatureRail } from "@/components/CoreFeatureRail";

export const metadata: Metadata = {
  title: "آموزش تنظیم، میکس و مسترینگ + راه‌یار AI | مهرشاد بنائی",
  description:
    "آکادمی راه‌یار و ArtistYar: آموزش پروژه‌محور تنظیم، میکس و مسترینگ با کلاس آنلاین، پشتیبانی هنرجو، نمونه‌کار واقعی و دستیار هوشمند راه‌یار AI.",
  keywords: [
    "آموزش تنظیم",
    "آموزش میکس",
    "آموزش مسترینگ",
    "مهرشاد بنائی",
    "راه‌یار",
    "راه‌یار AI",
    "دستیار هوش مصنوعی موسیقی",
    "ArtistYar",
    "تولید موسیقی",
    "عیب‌یابی میکس",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "آموزش تنظیم، میکس و مسترینگ + راه‌یار AI | ArtistYar",
    description:
      "یادگیری واقعی تولید موسیقی با مسیر روشن، تمرین پروژه‌محور و دستیار هوشمند راه‌یار.",
    type: "website",
    url: "/",
  },
};

const studentProjects = instagramGallery
  .filter((item) => item.tags.includes("نمونه‌کار هنرجو") || item.tags.includes("خروجی آموزشی"))
  .slice(0, 3)
  .map((item, index) => ({
    code: `۰${index + 1}`,
    title: item.title,
    student: item.tags.includes("نمونه‌کار هنرجو") ? "خروجی هنرجو" : "خروجی آموزش",
    type: item.tags
      .filter((tag) => !["نمونه‌کار هنرجو", "خروجی آموزشی"].includes(tag))
      .slice(0, 2)
      .join(" · "),
    result: item.description,
    tone: index === 0 ? "gold" : "blue",
    href: item.href,
  }));

const studentFeedback = [
  {
    quote:
      "قبل از این کلاس‌ها هر بار وسط پروژه گیر می‌کردم. حالا می‌دانم مشکل را از کجا پیدا کنم و چطور مرحله‌به‌مرحله جلو بروم.",
    name: "هنرجوی مسیر تنظیم و میکس",
    detail: "بازخورد مسیر آموزشی",
  },
  {
    quote:
      "فقط درباره پلاگین حرف نزدیم؛ روی پروژه خودم کار کردیم و دلیل هر تصمیم را فهمیدم.",
    name: "هنرجوی کلاس آنلاین",
    detail: "بازخورد پس از کلاس",
  },
  {
    quote:
      "راه‌یار تکلیف‌ها و ادامه مسیرم را مشخص کرد. وقتی سؤال داشتم، لازم نبود از صفر شروع کنم.",
    name: "هنرجوی دوره راه‌یار",
    detail: "بازخورد پنل هنرجو",
  },
];

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
      "بله. فرم مشاوره رایگان پایین صفحه را پر کن و بگو روی چه چیزی کار می‌کنی تا مسیر مناسب پیشنهاد شود.",
  },
  {
    question: "رسید پرداخت را کجا بفرستم؟",
    answer:
      "بعد از ثبت سفارش، فرم ارسال رسید در همین سایت نمایش داده می‌شود. همان‌جا بفرست تا وضعیت سفارش قابل پیگیری باشد.",
  },
];

const homepageFaqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

const homepageCoursesJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "مسیرهای آموزشی آکادمی راه‌یار",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "دوره جامع تنظیم، میکس و مسترینگ", url: "/courses" },
    { "@type": "ListItem", position: 2, name: "دوره تئوری موسیقی", url: "/courses" },
    { "@type": "ListItem", position: 3, name: "کلاس آنلاین تنظیم، میکس و مسترینگ", url: "/online" },
    { "@type": "ListItem", position: 4, name: "راهنمای آموزش تنظیم، میکس و مسترینگ", url: "/amoozesh-mix-mastering" },
  ],
};

export default function HomePage() {
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageFaqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageCoursesJsonLd) }} />

      <section className="hero-section container-ay">
        <div className="hero-copy">
          <div className="hero-kicker">
            <span className="status-dot" /> آکادمی راه‌یار · ArtistYar
          </div>
          <h1 className="hero-heading">
            تنظیم، میکس و مسترینگ
            <br />
            <span className="gold-shimmer">با مسیر روشن.</span>
          </h1>
          <p className="hero-lead">
            دوره دیجیتال، کلاس آنلاین و راه‌یار AI — تمرین واقعی روی پروژه خودت، تا خروجی قابل دفاع.
          </p>
          <HeroActions />
          <SafeLink
            href="/amoozesh-mix-mastering"
            hard
            className="mt-5 inline-flex text-sm text-ink-400 underline decoration-white/15 underline-offset-8 transition hover:text-gold-300 hover:decoration-gold-400/50"
          >
            راهنمای رایگان از پایه تا پروژه ←
          </SafeLink>
          <div className="hero-trust">
            <span className="trust-line" />
            <span>
              فقط ویدیو نیست — <strong className="font-medium text-gold-400">راه‌یار</strong> تا نتیجه کنارت می‌ماند
            </span>
          </div>
          <HeroDifferentiator />
        </div>
        <ScrollDepth className="hero-scroll-depth" intensity={0.55}>
          <DepthScene className="hero-art">
            <div className="hero-photo-stage">
              <Image
                src="/artistyar-studio-hero.png"
                alt=""
                fill
                priority
                sizes="(max-width: 767px) 100vw, (max-width: 1024px) 60vw, 42vw"
                className="hero-photo"
              />
            </div>
            <div className="hero-orbit orbit-a" />
            <div className="hero-orbit orbit-b" />
            <div className="record-disc">
              <div className="record-groove groove-one" />
              <div className="record-groove groove-two" />
              <div className="record-label">
                <Waves size={20} />
                <span>RY</span>
              </div>
            </div>
            <div className="floating-note note-one">♪</div>
            <div className="floating-note note-two">♫</div>
            <div className="now-playing">
              <div className="play-icon">
                <CirclePlay size={18} />
              </div>
              <div>
                <span className="mini-label">RAHYAR</span>
                <strong>مسیرت را ادامه بده</strong>
              </div>
            </div>
            <div className="studio-session">
              <span>جلسهٔ تمرین / ۰۱</span>
              <strong>از شنیدن تا ساختن</strong>
            </div>
            <div className="studio-meter" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="art-caption">
              <Sparkles size={14} /> آموزش · تمرین · پیگیری
            </div>
          </DepthScene>
        </ScrollDepth>
      </section>

      {/* THE ARTISTYAR METHOD — kept as continuation of hero */}
      <CoreFeatureRail />

      <PracticeEnginePreview />

      <section className="proof-strip border-y border-white/[.06]">
        <div className="container-ay proof-grid">
          <div>
            <strong>دوره دیجیتال</strong>
            <span>دسترسی ساختاریافته</span>
          </div>
          <div>
            <strong>کلاس آنلاین</strong>
            <span>رزرو و یادآوری</span>
          </div>
          <div>
            <strong>راه‌یار AI</strong>
            <span>پاسخ و پشتیبانی</span>
          </div>
          <div className="proof-note">
            از شروع تا نتیجه، <b>تنها نمی‌مانی.</b>
          </div>
        </div>
      </section>

      <div id="courses" className="scroll-mt-24">
        <div className="container-ay pt-6 pb-2 sm:hidden">
          <SafeLink href="/courses" hard className="btn-primary w-full justify-center gap-2">
            دیدن مسیرهای آموزشی <ArrowLeft size={16} aria-hidden />
          </SafeLink>
        </div>
        <HomeLiveCourses />
      </div>

      <section id="projects" className="projects-section border-y border-white/[.06]">
        <div className="container-ay section-space">
          <Reveal>
            <div className="projects-heading">
              <div>
                <p className="eyebrow">/ خروجی</p>
                <h2 className="section-title mt-4">
                  یادگیری وقتی جدی می‌شود
                  <br />
                  <span className="text-gold-400">که شنیده شود.</span>
                </h2>
              </div>
              <p className="section-sub max-w-md">نمونه‌های عمومی از گالری؛ جزئیات در پست اینستاگرام.</p>
            </div>
          </Reveal>
          <div className="projects-grid mt-8">
            {studentProjects.map((project, i) => (
              <Reveal key={project.code} delay={i * 40}>
                <article className={`project-card project-${project.tone}`}>
                  <div className="project-visual">
                    <span className="project-code">{project.code}</span>
                    <div className="project-bars">
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                    </div>
                    <a
                      href={project.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`مشاهده ${project.title}`}
                      className="project-play"
                    >
                      <CirclePlay size={20} />
                    </a>
                  </div>
                  <div className="project-meta">
                    {project.type ? <span className="skill-tag">{project.type}</span> : null}
                    <span className="project-student">{project.student}</span>
                  </div>
                  <h3>{project.title}</h3>
                  <p>{project.result}</p>
                  <div className="project-footer">
                    <a
                      href={project.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 hover:text-gold-300"
                    >
                      پست اصلی <ArrowLeft size={14} />
                    </a>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
          <div className="mt-8 text-center">
            <SafeLink href="/gallery" hard className="text-sm text-gold-400 hover:text-gold-300">
              گالری کامل ←
            </SafeLink>
          </div>
        </div>
      </section>

      <section id="feedback" className="feedback-section container-ay section-space">
        <Reveal>
          <div className="section-intro">
            <p className="eyebrow">/ بازخورد</p>
            <h2 className="section-title">
              صدای هنرجو،
              <br />
              <span className="text-gold-400">نه شعار.</span>
            </h2>
          </div>
        </Reveal>
        <div className="feedback-grid">
          {studentFeedback.map((item, i) => (
            <Reveal key={item.name} delay={i * 40}>
              <blockquote className="feedback-card">
                <p>«{item.quote}»</p>
                <footer>
                  <strong>{item.name}</strong>
                  <span>{item.detail}</span>
                </footer>
              </blockquote>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="faq" className="container-ay section-space border-t border-white/[.06]">
        <Reveal>
          <div className="section-intro">
            <p className="eyebrow">/ پرسش‌های متداول</p>
            <h2 className="section-title">
              قبل از شروع،
              <br />
              <span className="text-gold-400">جواب‌ها روشن.</span>
            </h2>
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
      </section>

      <section className="container-ay pb-4 pt-2">
        <CommunityLinks
          title="بیرون از سایت هم همراهت هستیم"
          subtitle="کانال پلاگین، گروه پرسش‌وپاسخ و اینستاگرام رسمی مدرس."
        />
      </section>

      <div id="quick-consultation">
        <QuickConsultationForm />
      </div>
    </div>
  );
}
