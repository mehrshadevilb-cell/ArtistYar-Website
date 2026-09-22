import Image from "next/image";
import type { Metadata } from "next";
import { ArrowLeft, CirclePlay, Sparkles, Waves } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { DepthScene } from "@/components/DepthScene";
import { ScrollDepth } from "@/components/ScrollDepth";
import { HeroActions } from "@/components/HeroActions";
import { SafeLink } from "@/components/SafeLink";
import { CommunityLinks } from "@/components/CommunityLinks";
import { HeroDifferentiator } from "@/components/HeroDifferentiator";
import { ScrollStage } from "@/components/ScrollStage";
import dynamic from "next/dynamic";

const HomeLiveCourses = dynamic(() =>
  import("@/components/HomeLiveCourses").then((m) => m.HomeLiveCourses),
);
const HomeStudentWorks = dynamic(() =>
  import("@/components/HomeStudentWorks").then((m) => m.HomeStudentWorks),
);
const QuickConsultationForm = dynamic(() =>
  import("@/components/QuickConsultationForm").then((m) => m.QuickConsultationForm),
);

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
    "تنظیم آثار موسیقی",
    "سفارش تنظیم آهنگ",
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

function HeroDisk() {
  return (
    <ScrollDepth className="hero-scroll-depth" intensity={0.55}>
      <DepthScene className="hero-art">
        <div className="hero-photo-stage">
          <Image
            src="/artistyar-studio-hero.webp"
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
          <i /><i /><i /><i /><i /><i /><i /><i /><i /><i />
        </div>
        <div className="art-caption">
          <Sparkles size={14} /> آموزش · تمرین · پیگیری
        </div>
      </DepthScene>
    </ScrollDepth>
  );
}

export default function HomePage() {
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageCoursesJsonLd) }} />

      <ScrollStage
        as="section"
        className="hero-section container-ay hero-layout-root"
        intensity="strong"
      >
        <div className="hero-copy">
          <div className="hero-kicker">
            <span className="trust-line" aria-hidden="true" />
            <span>آکادمی راه‌یار · ArtistYar</span>
          </div>
          <h1 className="hero-heading">
            موسیقی را
            <span className="block text-gold-400">درست بساز.</span>
          </h1>
          <p className="hero-lead">
            آموزش پروژه‌محور تنظیم، میکس و مسترینگ با مسیر روشن، تمرین واقعی و دستیار هوشمند راه‌یار AI.
          </p>
          <HeroActions />
          <div className="hero-trust">
            <span className="trust-line" aria-hidden="true" />
            <span>کلاس آنلاین · پکیج‌های آموزشی · پشتیبانی هنرجو</span>
          </div>
        </div>
        <HeroDisk />
      </ScrollStage>

      <ScrollStage as="section" className="container-ay border-t border-white/[.06] py-12 sm:py-16" intensity="calm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow">چرا آرتیست‌یار</p>
            <h2 className="section-title mt-3">یادگیری واقعی، نه فقط تماشای آموزش</h2>
            <p className="section-sub">
              از تمرین شنیداری تا تحلیل پروژه و سفارش تنظیم — مسیر روشن است و راه‌یار AI کنارته.
            </p>
          </div>
          <SafeLink href="/assistant" hard className="btn-primary self-start sm:self-auto">
            شروع با راه‌یار AI
            <ArrowLeft size={16} aria-hidden="true" />
          </SafeLink>
        </div>
        <div className="mt-10">
          <HeroDifferentiator />
        </div>
      </ScrollStage>

      <ScrollStage as="section" className="proof-strip border-y border-white/[.06]" intensity="calm">
        <div className="container-ay flex flex-wrap items-center justify-between gap-4 py-6">
          <div className="flex items-center gap-3 text-sm text-ink-300">
            <CirclePlay size={18} className="text-gold-400" aria-hidden="true" />
            <span>تمرین · کلاس آنلاین · پکیج · پشتیبانی</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-ink-300">
            <Sparkles size={18} className="text-gold-400" aria-hidden="true" />
            <span>راه‌یار AI برای عیب‌یابی و قدم بعدی</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-ink-300">
            <Waves size={18} className="text-gold-400" aria-hidden="true" />
            <span>نمونه‌کار واقعی هنرجوها</span>
          </div>
        </div>
      </ScrollStage>

      <ScrollStage as="section" className="container-ay py-10 sm:py-14" intensity="calm">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { title: "مسیر روشن", body: "از پایه تا پروژه؛ بدون سردرگمی در انتخاب ابزار و روش." },
            { title: "تمرین واقعی", body: "گوش، تصمیم و اجرا روی کار خودت — نه فقط تئوری." },
            { title: "پشتیبانی", body: "کلاس آنلاین، پنل هنرجو و راه‌یار AI برای گیرهای روزمره." },
          ].map((item) => (
            <div key={item.title} className="card-ay p-5 sm:p-6">
              <h3 className="text-base font-medium text-sand-50">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-ink-400">{item.body}</p>
            </div>
          ))}
        </div>
      </ScrollStage>

      <ScrollStage id="courses" className="scroll-mt-24" intensity="calm" exitBlur={false}>
        <div className="container-ay pb-4">
          <p className="eyebrow">مسیرهای آموزشی</p>
          <h2 className="section-title mt-3">پکیج‌ها و کلاس‌ها</h2>
        </div>
        <HomeLiveCourses />
      </ScrollStage>

      <ScrollStage intensity="calm" exitBlur={false}>
        <HomeStudentWorks />
      </ScrollStage>

      <ScrollStage as="section" id="feedback" className="container-ay py-10 sm:py-12" intensity="calm">
        <div className="mb-5">
          <p className="eyebrow">/ بازخورد</p>
          <h2 className="mt-2 text-lg font-medium text-sand-50 sm:text-xl">
            صدای هنرجو <span className="text-gold-400">· کوتاه</span>
          </h2>
        </div>
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
      </ScrollStage>

      <ScrollStage as="section" className="container-ay pb-4 pt-2" intensity="calm">
        <CommunityLinks
          title="بیرون از سایت هم همراهت هستیم"
          subtitle="کانال پلاگین، گروه پرسش‌وپاسخ و اینستاگرام رسمی مدرس."
        />
      </ScrollStage>

      <ScrollStage id="quick-consultation" intensity="calm" exitBlur={false}>
        <QuickConsultationForm />
      </ScrollStage>
    </div>
  );
}
