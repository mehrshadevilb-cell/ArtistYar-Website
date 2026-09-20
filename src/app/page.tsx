import Image from "next/image";
import type { Metadata } from "next";
import { ArrowLeft, CirclePlay, Sparkles, Waves } from "lucide-react";
import { HomeLiveCourses } from "@/components/HomeLiveCourses";
import { HomeStudentWorks } from "@/components/HomeStudentWorks";
import { QuickConsultationForm } from "@/components/QuickConsultationForm";
import { Reveal } from "@/components/Reveal";
import { DepthScene } from "@/components/DepthScene";
import { ScrollDepth } from "@/components/ScrollDepth";
import { HeroActions } from "@/components/HeroActions";
import { SafeLink } from "@/components/SafeLink";
import { CommunityLinks } from "@/components/CommunityLinks";
import { HeroDifferentiator } from "@/components/HeroDifferentiator";

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
          <h1 className="hero-heading">
            تنظیم، میکس و مسترینگ
            <br />
            <span className="gold-shimmer">با مسیر روشن.</span>
          </h1>
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

      {/* Feature cards under disk + primary CTAs */}
      <div className="container-ay hero-features-under-disk">
        <HeroDifferentiator />
        <div className="hero-cta-under-cards">
          <div className="hero-cta-stack">
            <HeroActions />
            <SafeLink href="/amoozesh-mix-mastering" hard className="hero-secondary-link">
              راهنمای رایگان از پایه تا پروژه ←
            </SafeLink>
          </div>
          <div className="hero-trust">
            <span className="trust-line" />
            <span>
              فقط ویدیو نیست — <strong className="font-medium text-gold-400">راه‌یار</strong> تا نتیجه کنارت می‌ماند
            </span>
          </div>
        </div>
      </div>

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

      <HomeStudentWorks />

      <section id="feedback" className="container-ay py-10 sm:py-12">
        <Reveal>
          <div className="mb-5">
            <p className="eyebrow">/ بازخورد</p>
            <h2 className="mt-2 text-lg font-medium text-sand-50 sm:text-xl">
              صدای هنرجو <span className="text-gold-400">· کوتاه</span>
            </h2>
          </div>
        </Reveal>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {studentFeedback.map((item, i) => (
            <Reveal key={item.name} delay={i * 25}>
              <blockquote className="comment-card">
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
