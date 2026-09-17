import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Bot, Check, CirclePlay, MessageCircle, Sparkles, Waves } from "lucide-react";
import { HomeLiveCourses } from "@/components/HomeLiveCourses";
import { QuickConsultationForm } from "@/components/QuickConsultationForm";
import { Reveal } from "@/components/Reveal";
import { DepthScene } from "@/components/DepthScene";
import { instagramGallery } from "@/data/instagram-gallery";

export const metadata: Metadata = {
  title: "آموزش تنظیم، میکس و مسترینگ + راه‌یار AI | مهرشاد بنائی",
  description:
    "آکادمی راه‌یار و ArtistYar: آموزش پروژه‌محور تنظیم، میکس و مسترینگ با کلاس آنلاین، پشتیبانی هنرجو، نمونه‌کار واقعی و دستیار هوشمند راه‌یار AI که از لحظه ورود کنارت است.",
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
  openGraph: {
    title: "آموزش تنظیم، میکس و مسترینگ + راه‌یار AI | ArtistYar",
    description:
      "یادگیری واقعی تولید موسیقی با مسیر روشن، تمرین پروژه‌محور و دستیار هوشمند راه‌یار — فرق این آکادمی از لحظه ورود مشخص است.",
    type: "website",
  },
};

const studentSteps = [
  "مسیر یا کلاس را انتخاب کن",
  "درخواستت در راه‌یار بررسی می‌شود",
  "دسترسی، رزرو و پیشرفتت را دنبال کن",
];

const supportItems = [
  "تکلیف و بازخورد کلاس",
  "رزرو جلسه و یادآوری‌ها",
  "پشتیبانی و تیکت",
  "دستیار هوشمند موسیقی",
];

const studentProjects = instagramGallery
  .filter((item) => item.tags.includes("نمونه‌کار هنرجو") || item.tags.includes("خروجی آموزشی"))
  .slice(0, 3)
  .map((item, index) => ({
    code: `IG / 0${index + 1}`,
    title: item.title,
    student: item.tags.includes("نمونه‌کار هنرجو") ? "خروجی عمومی هنرجو" : "خروجی آموزش راه‌یار",
    type: item.tags
      .filter((tag) => !["نمونه‌کار هنرجو", "خروجی آموزشی"].includes(tag))
      .join(" + "),
    result: item.description,
    tone: index === 0 ? "gold" : "blue",
    href: item.href,
  }));

const studentFeedback = [
  {
    quote:
      "قبل از این کلاس‌ها هر بار وسط پروژه گیر می‌کردم. حالا می‌دانم باید مشکل را از کجا پیدا کنم و چطور مرحله‌به‌مرحله جلو بروم.",
    name: "هنرجوی مسیر تنظیم و میکس",
    detail: "بازخورد ثبت‌شده در مسیر آموزشی",
  },
  {
    quote:
      "چیزی که برای من مهم بود این بود که فقط درباره پلاگین‌ها حرف نزدیم؛ روی پروژه خودم کار کردیم و دلیل هر تصمیم را فهمیدم.",
    name: "هنرجوی کلاس آنلاین",
    detail: "بازخورد ثبت‌شده پس از کلاس",
  },
  {
    quote:
      "راه‌یار باعث شد تکلیف‌ها و ادامه مسیرم مشخص باشد. وقتی سؤالی داشتم، لازم نبود یادگیری را رها کنم و از اول شروع کنم.",
    name: "هنرجوی دوره راه‌یار",
    detail: "بازخورد ثبت‌شده در پنل هنرجو",
  },
];

const faqs = [
  {
    question: "از کدام مسیر آموزشی شروع کنم؟",
    answer:
      "اگر تازه شروع کرده‌ای، راه‌یار مسیر جامع‌تری برایت می‌سازد. اگر فقط می‌خواهی پایه‌هایت را بهتر کنی، تئوری موسیقی انتخاب مناسبی است. برای کار دقیق روی پروژه خودت هم می‌توانی کلاس آنلاین بگیری یا از مشاوره رایگان شروع کنی.",
  },
  {
    question: "بعد از پرداخت، دسترسی دوره چطور فعال می‌شود؟",
    answer:
      "درخواست و پرداخت از طریق سایت ثبت می‌شود، اما تأیید نهایی توسط تیم راه‌یار انجام می‌شود. بعد از تأیید، دسترسی محصول متناسب با نوع آن فعال می‌شود؛ دوره‌های آموزشی از طریق SpotPlayer و محصول آرتیست‌یار از طریق کانال‌های تلگرام.",
  },
  {
    question: "آیا می‌توانم قبل از خرید راهنمایی بگیرم؟",
    answer:
      "بله. فرم مشاوره رایگان انتهای همین صفحه را پر کن و بگو روی چه چیزی کار می‌کنی. بر اساس تجربه، هدف و پروژه‌ات برای انتخاب مسیر بهتر راهنمایی‌ات می‌کنیم.",
  },
  {
    question: "رسید پرداخت را کجا ارسال کنم؟",
    answer:
      "بعد از ثبت سفارش، شماره کارت و فرم ارسال رسید در همین سایت نمایش داده می‌شود. رسید را همان‌جا ارسال کن تا درخواستت برای بررسی در راه‌یار ثبت شود و بتوانی وضعیت سفارش را پیگیری کنی.",
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
            یادگیری موسیقی،
            <br />
            <span className="gold-shimmer">با یک مسیر روشن.</span>
          </h1>
          <p className="hero-lead">
            دوره‌های دیجیتال، کلاس‌های آنلاین و همراهی راه‌یار برای اینکه تنظیم، میکس و مسترینگ را درست و اصولی یاد
            بگیری؛ با تمرین واقعی و پیگیری تا رسیدن به نتیجه.
          </p>
          <div className="hero-actions">
            <Link href="/courses" className="btn-primary gap-2">
              دیدن مسیرهای آموزشی <ArrowLeft size={16} />
            </Link>
            <Link href="/assistant" className="btn-ghost gap-2">
              سؤال از راه‌یار AI <Bot size={16} />
            </Link>
          </div>
          <div className="hero-trust">
            <span className="trust-line" />
            <span>
              تنها دوره نیست — <strong className="font-medium text-gold-400">راه‌یار AI</strong> از همین صفحه کنارت است
            </span>
          </div>
        </div>
        <DepthScene className="hero-art">
          <div className="hero-orbit orbit-a" />
          <div className="hero-orbit orbit-b" />
          <div className="record-disc">
            <div className="record-groove groove-one" />
            <div className="record-groove groove-two" />
            <div className="record-label">
              <Waves size={22} />
              <span>RY</span>
            </div>
          </div>
          <div className="floating-note note-one">♪</div>
          <div className="floating-note note-two">♫</div>
          <div className="now-playing">
            <div className="play-icon">
              <CirclePlay size={20} />
            </div>
            <div>
              <span className="mini-label">RAHYAR ACADEMY</span>
              <strong>مسیرت را ادامه بده</strong>
            </div>
            <div className="waveform">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="art-caption">
            <Sparkles size={15} /> آموزش، تمرین، پیگیری.
          </div>
        </DepthScene>
      </section>

      <section className="proof-strip border-y border-white/[.06]">
        <div className="container-ay proof-grid">
          <div>
            <strong>دوره دیجیتال</strong>
            <span>با دسترسی ساختاریافته</span>
          </div>
          <div>
            <strong>کلاس آنلاین</strong>
            <span>با رزرو و یادآوری جلسه</span>
          </div>
          <div>
            <strong>راه‌یار</strong>
            <span>دستیار و پشتیبانی</span>
          </div>
          <div className="proof-note">
            از شروع تا نتیجه، <b>تنها نمی‌مانی.</b>
          </div>
        </div>
      </section>

      <div id="courses">
        <HomeLiveCourses />
      </div>

      <section id="about" className="container-ay section-space border-t border-white/[.06]">
        <Reveal>
          <div className="section-intro">
            <p className="eyebrow">/ آکادمی راه‌یار</p>
            <h2 className="section-title">
              فقط ویدیو نمی‌خری؛
              <br />
              <span className="text-gold-400">یک سیستم یادگیری داری.</span>
            </h2>
            <p className="section-sub">
              پرداخت و تأیید، دسترسی محتوا، کلاس آنلاین، رزرو، تکلیف و پشتیبانی — همه در یک مسیر.
            </p>
          </div>
        </Reveal>
        <div className="benefit-grid">
          {supportItems.map((item, i) => (
            <Reveal key={item} delay={i * 70}>
              <article className="benefit-card">
                <span className="benefit-icon">
                  {i === 3 ? (
                    <Bot size={20} />
                  ) : i === 2 ? (
                    <MessageCircle size={20} />
                  ) : i === 1 ? (
                    <CirclePlay size={20} />
                  ) : (
                    <Check size={20} />
                  )}
                </span>
                <span className="benefit-number">۰{i + 1}</span>
                <h3>{item}</h3>
                <p>
                  {i === 0
                    ? "برای کلاس‌های آنلاین، تکلیف ثبت می‌شود و مسیر تمرینت قابل پیگیری است."
                    : i === 1
                      ? "جلسه‌ها را رزرو کن و یادآوری‌های قبل و روز کلاس را از دست نده."
                      : i === 2
                        ? "اگر جایی گیر کردی، از مسیر پشتیبانی درخواستت را ثبت کن."
                        : "برای سؤال‌های تنظیم، میکس، مسترینگ و تئوری از راه‌یار بپرس."}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="flow" className="container-ay section-space border-t border-white/[.06]">
        <Reveal>
          <div className="section-intro">
            <p className="eyebrow">/ مسیر هنرجو</p>
            <h2 className="section-title">
              شروعش ساده است؛
              <br />
              <span className="text-gold-400">ادامه‌اش با تو و راه‌یار.</span>
            </h2>
          </div>
        </Reveal>
        <div className="benefit-grid">
          {studentSteps.map((step, i) => (
            <Reveal key={step} delay={i * 80}>
              <article className="benefit-card">
                <span className="benefit-icon">
                  <span className="text-lg font-medium">۰{i + 1}</span>
                </span>
                <h3>{step}</h3>
                <p>
                  {i === 0
                    ? "از بین دوره‌های دیجیتال یا کلاس‌های آنلاین، چیزی را انتخاب کن که به کارت نزدیک‌تر است."
                    : i === 1
                      ? "درخواستت ثبت می‌شود و تأیید پرداخت یا هماهنگی کلاس از طریق راه‌یار انجام می‌شود."
                      : "دسترسی محتوا، رزروها، تکلیف‌ها و وضعیت پیشرفتت را دنبال کن."}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="projects" className="projects-section border-y border-white/[.06]">
        <div className="container-ay section-space">
          <Reveal>
            <div className="projects-heading">
              <div>
                <p className="eyebrow">/ پروژه‌های منتخب</p>
                <h2 className="section-title mt-4">
                  یادگیری وقتی واقعی می‌شود
                  <br />
                  <span className="text-gold-400">که به خروجی برسد.</span>
                </h2>
              </div>
              <p className="section-sub max-w-md">
                نمونه‌های عمومی تأییدشده از گالری؛ برای شنیدن به پست اینستاگرام ارجاع می‌دهند.
              </p>
            </div>
          </Reveal>
          <div className="projects-grid">
            {studentProjects.map((project, i) => (
              <Reveal key={project.code} delay={i * 90}>
                <article className={`project-card project-${project.tone}`}>
                  <div className="project-visual">
                    <span className="project-code">{project.code}</span>
                    <div className="project-bars">
                      <i /><i /><i /><i /><i /><i /><i />
                    </div>
                    <a href={project.href} target="_blank" rel="noreferrer" aria-label={`مشاهده ${project.title}`} className="project-play">
                      <CirclePlay size={20} />
                    </a>
                    <span className="project-wave-label">INSTAGRAM / PUBLIC</span>
                  </div>
                  <div className="project-meta">
                    <span className="skill-tag">{project.type}</span>
                    <span className="project-student">{project.student}</span>
                  </div>
                  <h3>{project.title}</h3>
                  <p>{project.result}</p>
                  <div className="project-footer">
                    <a href={project.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-gold-300">
                      مشاهده پست اصلی <ArrowLeft size={15} />
                    </a>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="feedback" className="feedback-section container-ay section-space">
        <Reveal>
          <div className="projects-heading">
            <div>
              <p className="eyebrow">/ صدای هنرجوها</p>
              <h2 className="section-title mt-4">
                مسیر را از زبان
                <br />
                <span className="text-gold-400">خودشان بشنو.</span>
              </h2>
            </div>
          </div>
        </Reveal>
        <div className="feedback-grid">
          {studentFeedback.map((feedback, i) => (
            <Reveal key={feedback.name} delay={i * 90}>
              <article className="feedback-card">
                <div className="feedback-quote">“</div>
                <p className="feedback-text">{feedback.quote}</p>
                <div className="feedback-author">
                  <span className="feedback-avatar">۰{i + 1}</span>
                  <span>
                    <strong>{feedback.name}</strong>
                    <small>{feedback.detail}</small>
                  </span>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="faq" className="faq-section container-ay section-space border-t border-white/[.06]">
        <Reveal>
          <div className="projects-heading">
            <div>
              <p className="eyebrow">/ پرسش‌های متداول</p>
              <h2 className="section-title mt-4">
                قبل از شروع،
                <br />
                <span className="text-gold-400">جوابت را پیدا کن.</span>
              </h2>
            </div>
          </div>
        </Reveal>
        <div className="faq-list">
          {faqs.map((faq, i) => (
            <Reveal key={faq.question} delay={i * 50}>
              <details className="faq-item">
                <summary>
                  <span className="faq-index">۰{i + 1}</span>
                  <span>{faq.question}</span>
                  <span className="faq-plus" aria-hidden="true" />
                </summary>
                <p>{faq.answer}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="contact" className="container-ay section-space">
        <Reveal>
          <div className="contact-card">
            <div className="contact-glow" />
            <div className="relative">
              <p className="eyebrow">/ هنوز مطمئن نیستی؟</p>
              <h2 className="section-title mt-4">
                سؤالت را از
                <br />
                <span className="text-gold-400">راه‌یار بپرس.</span>
              </h2>
              <p className="section-sub max-w-lg">
                برای انتخاب دوره، تنظیم، میکس، مسترینگ یا تئوری موسیقی، دستیار راه‌یار راهنمایی‌ات می‌کند.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/assistant" className="btn-primary gap-2">
                  رفتن به دستیار <Bot size={16} />
                </Link>
                <Link href="/contact" className="btn-ghost">
                  ارتباط با پشتیبانی
                </Link>
              </div>
            </div>
            <div className="contact-mark">
              <Waves size={52} strokeWidth={1} />
              <span>
                RAHYAR
                <br />
                ACADEMY
              </span>
            </div>
          </div>
        </Reveal>
      </section>

      <QuickConsultationForm />
    </div>
  );
}
