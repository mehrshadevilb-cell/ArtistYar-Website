import Image from "next/image";
import type { Metadata } from "next";
import { ArrowLeft, CirclePlay, Sparkles, Waves } from "lucide-react";
import { HomeLiveCourses } from "@/components/HomeLiveCourses";
import { QuickConsultationForm } from "@/components/QuickConsultationForm";
import { Reveal } from "@/components/Reveal";
import { DepthScene } from "@/components/DepthScene";
import { ScrollDepth } from "@/components/ScrollDepth";
import { HeroActions } from "@/components/HeroActions";
import { SafeLink } from "@/components/SafeLink";
import { CommunityLinks } from "@/components/CommunityLinks";
import { HeroDifferentiator } from "@/components/HeroDifferentiator";
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

/** نمونه‌کار هنرجو — بدون لینک اینستاگرام؛ جزئیات کامل در گالری */
const studentProjects = [
  {
    code: "۰۱",
    title: "میکس تنظیم هنرجو",
    student: "خروجی هنرجو",
    type: "میکس · تنظیم",
    result: "کار روی میکس و بالانس پروژه هنرجو تا رسیدن به خروجی قابل ارائه.",
    tone: "gold",
  },
  {
    code: "۰۲",
    title: "خروجی مسیر راه‌یار",
    student: "خروجی آموزش",
    type: "تنظیم · میکس",
    result: "نمونه عمومی از خروجی آموزش پروژه‌محور در مسیر راه‌یار.",
    tone: "blue",
  },
  {
    code: "۰۳",
    title: "Dige Naya — Nimaan",
    student: "پروژه کامل",
    type: "تنظیم · میکس و مسترینگ",
    result: "تنظیم، میکس و مسترینگ کامل یک ترک تا مرحله انتشار.",
    tone: "gold",
  },
  {
    code: "۰۴",
    title: "تمرین شنیداری · کیک و فرکانس",
    student: "خروجی تمرین",
    type: "شنوایی · ساخت صدا",
    result: "تمرین تشخیص فرکانس و ساخت کیک در مسیر آموزشی.",
    tone: "blue",
  },
] as const;

const studentFeedback = [
  {
    quote: "وسط پروژه گیر نمی‌کنم؛ مشکل را پیدا می‌کنم و مرحله‌به‌مرحله جلو می‌روم.",
    name: "هنرجوی مسیر تنظیم و میکس",
    detail: "مسیر آموزشی",
  },
  {
    quote: "روی پروژه خودم کار کردیم و دلیل هر تصمیم را فهمیدم.",
    name: "هنرجوی کلاس آنلاین",
    detail: "کلاس آنلاین",
  },
  {
    quote: "راه‌یار تکلیف و ادامه مسیرم را مشخص کرد؛ لازم نبود از صفر شروع کنم.",
    name: "هنرجوی دوره راه‌یار",
    detail: "پنل هنرجو",
  },
];

const homepageCoursesJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "پکیج‌های آموزشی آکادمی راه‌یار",
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
          <div className="hero-cta-stack">
            <HeroActions />
            <SafeLink href="/amoozesh-mix-mastering" hard className="hero-secondary-link">
              راهنمای رایگان از پایه تا پروژه ←
            </SafeLink>
          </div>
          <HeroDifferentiator />
          <div className="hero-trust">
            <span className="trust-line" />
            <span>
              فقط ویدیو نیست — <strong className="font-medium text-gold-400">راه‌یار</strong> تا نتیجه کنارت می‌ماند
            </span>
          </div>
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

      <CoreFeatureRail />

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
            دیدن پکیج‌های آموزشی <ArrowLeft size={16} aria-hidden />
          </SafeLink>
        </div>
        <HomeLiveCourses />
      </div>

      <section id="projects" className="projects-section border-y border-white/[.06]">
        <div className="container-ay section-space">
          <Reveal>
            <div className="projects-heading">
              <div>
                <p className="eyebrow">/ پروژه‌ها و خروجی هنرجوها</p>
                <h2 className="section-title mt-4">
                  یادگیری وقتی جدی می‌شود
                  <br />
                  <span className="text-gold-400">که شنیده شود.</span>
                </h2>
              </div>
              <p className="section-sub max-w-md">نمونه‌کار و خروجی واقعی هنرجویان آکادمی راه‌یار.</p>
            </div>
          </Reveal>
          <div className="projects-grid mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {studentProjects.map((project, i) => (
              <Reveal key={project.code} delay={i * 40}>
                <article className={`project-card project-${project.tone} h-full`}>
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
                  </div>
                  <div className="project-meta">
                    {project.type ? <span className="skill-tag">{project.type}</span> : null}
                    <span className="project-student">{project.student}</span>
                  </div>
                  <h3>{project.title}</h3>
                  <p>{project.result}</p>
                </article>
              </Reveal>
            ))}
          </div>
          <div className="mt-8 text-center">
            <SafeLink href="/gallery" hard className="btn-ghost inline-flex gap-2 text-sm">
              مشاهده کامل پروژه‌ها و خروجی‌ها <ArrowLeft size={14} aria-hidden />
            </SafeLink>
          </div>
        </div>
      </section>

      <section id="feedback" className="feedback-section container-ay py-12 sm:py-14">
        <Reveal>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">/ بازخورد</p>
              <h2 className="mt-2 text-xl font-medium text-sand-50 sm:text-2xl">
                صدای هنرجو <span className="text-gold-400">· کوتاه و واقعی</span>
              </h2>
            </div>
          </div>
        </Reveal>
        <div className="grid gap-3 sm:grid-cols-3">
          {studentFeedback.map((item, i) => (
            <Reveal key={item.name} delay={i * 30}>
              <blockquote className="feedback-card feedback-card-compact rounded-xl border border-white/[.08] bg-white/[.03] p-4">
                <p className="text-[13px] leading-6 text-ink-300">«{item.quote}»</p>
                <footer className="mt-3 flex items-center gap-2 border-t border-white/[.06] pt-3">
                  <strong className="text-xs font-medium text-sand-50">{item.name}</strong>
                  <span className="text-[10px] text-ink-500">{item.detail}</span>
                </footer>
              </blockquote>
            </Reveal>
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
