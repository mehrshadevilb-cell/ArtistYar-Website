import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowUpLeft, AudioLines, Bot, Check, CirclePlay, Headphones, Layers3, MessageCircle, Sparkles, Waves } from "lucide-react";
import { HomeLiveCourses } from "@/components/HomeLiveCourses";
import { QuickConsultationForm } from "@/components/QuickConsultationForm";
import { Reveal } from "@/components/Reveal";
import { instagramGallery } from "@/data/instagram-gallery";

export const metadata: Metadata = {
  title: "آموزش تنظیم، میکس و مسترینگ با مهرشاد بنائی",
  description: "آکادمی راه‌یار و ArtistYar؛ آموزش پروژه‌محور تنظیم، میکس، مسترینگ و تولید موسیقی با کلاس آنلاین، پشتیبانی هنرجو و نمونه‌کارهای واقعی.",
  keywords: ["آموزش تنظیم", "آموزش میکس", "آموزش مسترینگ", "مهرشاد بنائی", "راه‌یار", "ArtistYar", "تولید موسیقی"],
  openGraph: {
    title: "آموزش تنظیم، میکس و مسترینگ | ArtistYar",
    description: "یادگیری واقعی تولید موسیقی با مسیر روشن، تمرین پروژه‌محور و همراهی راه‌یار.",
    type: "website",
  },
};

const products = [
  { icon: Waves, title: "راه‌یار", label: "مسیر اصلی", text: "مسیر جامع یادگیری تولید موسیقی؛ از مبانی و تئوری تا تنظیم، میکس و خروجی قابل انتشار.", href: "/courses" },
  { icon: AudioLines, title: "تئوری موسیقی", label: "بنیان", text: "هارمونی، ریتم، ساختار و گوش‌نوازی برای اینکه تصمیم‌های موسیقایی‌ات از روی فهم باشد.", href: "/courses" },
  { icon: Headphones, title: "آرتیست‌یار", label: "دسترسی و همراهی", text: "دسترسی به محتوای اختصاصی، فایل‌ها و کانال‌های آموزشی ضبط، ادیت و تولید موسیقی.", href: "/courses" },
];
const studentSteps = ["مسیر یا کلاس را انتخاب کن", "درخواستت در راه‌یار بررسی می‌شود", "دسترسی، رزرو و پیشرفتت را دنبال کن"];
const supportItems = ["تکلیف و بازخورد کلاس", "رزرو جلسه و یادآوری‌ها", "پشتیبانی و تیکت", "دستیار هوشمند موسیقی"];
const studentProjects = instagramGallery
  .filter((item) => item.tags.includes("نمونه‌کار هنرجو") || item.tags.includes("خروجی آموزشی"))
  .map((item, index) => ({
    code: `IG / 0${index + 1}`,
    title: item.title,
    student: item.tags.includes("نمونه‌کار هنرجو") ? "خروجی عمومی هنرجو" : "خروجی آموزش راه‌یار",
    type: item.tags.filter((tag) => !["نمونه‌کار هنرجو", "خروجی آموزشی"].includes(tag)).join(" + "),
    result: item.description,
    tone: index === 0 ? "gold" : "blue",
    href: item.href,
  }));
const studentFeedback = [
  {
    quote: "قبل از این کلاس‌ها هر بار وسط پروژه گیر می‌کردم. حالا می‌دانم باید مشکل را از کجا پیدا کنم و چطور مرحله‌به‌مرحله جلو بروم.",
    name: "هنرجوی مسیر تنظیم و میکس",
    detail: "بازخورد ثبت‌شده در مسیر آموزشی",
  },
  {
    quote: "چیزی که برای من مهم بود این بود که فقط درباره پلاگین‌ها حرف نزدیم؛ روی پروژه خودم کار کردیم و دلیل هر تصمیم را فهمیدم.",
    name: "هنرجوی کلاس آنلاین",
    detail: "بازخورد ثبت‌شده پس از کلاس",
  },
  {
    quote: "راه‌یار باعث شد تکلیف‌ها و ادامه مسیرم مشخص باشد. وقتی سؤالی داشتم، لازم نبود یادگیری را رها کنم و از اول شروع کنم.",
    name: "هنرجوی دوره راه‌یار",
    detail: "بازخورد ثبت‌شده در پنل هنرجو",
  },
];

export default function HomePage() {
  return <div>
    <section className="hero-section container-ay">
      <div className="hero-copy">
        <div className="hero-kicker"><span className="status-dot" /> آکادمی راه‌یار · ArtistYar</div>
        <h1 className="hero-heading">یادگیری موسیقی،<br /><span className="gold-shimmer">با یک مسیر روشن.</span></h1>
        <p className="hero-lead">دوره‌های دیجیتال، کلاس‌های آنلاین و همراهی راه‌یار برای اینکه تنظیم، میکس و مسترینگ را درست و اصولی یاد بگیری؛ با تمرین واقعی و پیگیری تا رسیدن به نتیجه.</p>
        <div className="hero-actions"><Link href="/courses" className="btn-primary gap-2">دیدن مسیرهای آموزشی <ArrowLeft size={16} /></Link><Link href="/free-player" className="btn-ghost gap-2">آموزش رایگان <CirclePlay size={16} /></Link><Link href="/assistant" className="btn-ghost gap-2">سؤال از راه‌یار <Bot size={16} /></Link></div>
        <div className="hero-trust"><span className="trust-line" /> از انتخاب مسیر تا پیشرفت هنرجو، همه‌چیز یک‌جا</div>
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="hero-orbit orbit-a" /><div className="hero-orbit orbit-b" />
        <div className="record-disc"><div className="record-groove groove-one" /><div className="record-groove groove-two" /><div className="record-label"><Waves size={22} /><span>RY</span></div></div>
        <div className="floating-note note-one">♪</div><div className="floating-note note-two">♫</div>
        <div className="now-playing"><div className="play-icon"><CirclePlay size={20} /></div><div><span className="mini-label">RAHYAR ACADEMY</span><strong>مسیرت را ادامه بده</strong></div><div className="waveform"><i /><i /><i /><i /><i /></div></div>
        <div className="art-caption"><Sparkles size={15} /> آموزش، تمرین، پیگیری.</div>
      </div>
    </section>

    <section className="proof-strip border-y border-white/[.06]"><div className="container-ay proof-grid"><div><strong>دوره دیجیتال</strong><span>با دسترسی ساختاریافته</span></div><div><strong>کلاس آنلاین</strong><span>با رزرو و یادآوری جلسه</span></div><div><strong>راه‌یار</strong><span>دستیار و پشتیبانی</span></div><div className="proof-note">از شروع تا نتیجه، <b>تنها نمی‌مانی.</b></div></div></section>

    <section id="about" className="container-ay section-space"><Reveal><div className="section-intro"><p className="eyebrow">/ آکادمی راه‌یار</p><h2 className="section-title">فقط ویدیو نمی‌خری؛<br /><span className="text-gold-400">یک سیستم یادگیری داری.</span></h2><p className="section-sub">راه‌یار فقط محل فروش دوره نیست. پرداخت و تأیید، دسترسی به محتوای آموزشی، کلاس آنلاین، رزرو جلسه، تکلیف، پیگیری پیشرفت و پشتیبانی همه در یک مسیر به هم وصل‌اند.</p></div></Reveal><div className="benefit-grid">{supportItems.map((item, i) => <Reveal key={item} delay={i * 70}><article className="benefit-card"><span className="benefit-icon">{i === 3 ? <Bot size={20} /> : i === 2 ? <MessageCircle size={20} /> : i === 1 ? <CirclePlay size={20} /> : <Check size={20} />}</span><span className="benefit-number">۰{i + 1}</span><h3>{item}</h3><p>{i === 0 ? "برای کلاس‌های آنلاین، تکلیف ثبت می‌شود و مسیر تمرینت قابل پیگیری است." : i === 1 ? "جلسه‌ها را رزرو کن و یادآوری‌های قبل و روز کلاس را از دست نده." : i === 2 ? "اگر جایی گیر کردی، از مسیر پشتیبانی درخواستت را ثبت کن." : "برای سؤال‌های تنظیم، میکس، مسترینگ و تئوری موسیقی از راه‌یار بپرس."}</p></article></Reveal>)}</div></section>

    <section id="paths" className="path-section border-y border-white/[.06]"><div className="container-ay path-layout"><Reveal><div><p className="eyebrow">/ محصولات اصلی</p><h2 className="section-title mt-4">مسیر مناسب خودت<br /><span className="text-gold-400">را انتخاب کن.</span></h2><p className="section-sub max-w-xl">اگر تازه شروع کرده‌ای یا می‌خواهی روی پروژه‌ات دقیق‌تر کار کنی، از یکی از مسیرهای اصلی راه‌یار شروع کن.</p><Link href="/courses" className="inline-flex items-center gap-2 mt-8 text-sm text-gold-400 hover:text-gold-300">مشاهده همه مسیرها <ArrowLeft size={15} /></Link></div></Reveal><Reveal delay={120}><div className="steps-card">{products.map((product) => { const Icon = product.icon; return <Link href={product.href} key={product.title} className="step-row group"><span className="step-index"><Icon size={16} /></span><span><span className="step-title block">{product.title}</span><span className="mt-1 block text-xs text-ink-500">{product.label}</span></span><span className="step-arrow">↙</span></Link>; })}<div className="steps-footer"><span className="status-dot" /> دسترسی و تأیید از مسیر راه‌یار انجام می‌شود</div></div></Reveal></div></section>

    <section id="flow" className="container-ay section-space"><Reveal><div className="section-intro"><p className="eyebrow">/ مسیر هنرجو</p><h2 className="section-title">شروعش ساده است؛<br /><span className="text-gold-400">ادامه‌اش با تو و راه‌یار.</span></h2></div></Reveal><div className="benefit-grid">{studentSteps.map((step, i) => <Reveal key={step} delay={i * 80}><article className="benefit-card"><span className="benefit-icon"><span className="text-lg font-medium">۰{i + 1}</span></span><h3>{step}</h3><p>{i === 0 ? "از بین دوره‌های دیجیتال یا کلاس‌های آنلاین، چیزی را انتخاب کن که به کارت نزدیک‌تر است." : i === 1 ? "درخواستت ثبت می‌شود و تأیید پرداخت یا هماهنگی کلاس از طریق راه‌یار انجام می‌شود." : "دسترسی محتوا، رزروها، تکلیف‌ها و وضعیت پیشرفتت را در مسیر هنرجویی دنبال کن."}</p></article></Reveal>)}</div></section>

    <section id="projects" className="projects-section border-y border-white/[.06]"><div className="container-ay section-space"><Reveal><div className="projects-heading"><div><p className="eyebrow">/ پروژه‌های منتخب هنرجویی</p><h2 className="section-title mt-4">یادگیری وقتی واقعی می‌شود<br /><span className="text-gold-400">که به خروجی برسد.</span></h2></div><p className="section-sub max-w-md">این نمونه‌ها از محتوای عمومی و تأییدشده گالری آرتیست‌یار انتخاب شده‌اند و برای شنیدن، به پست اصلی اینستاگرام ارجاع می‌دهند.</p></div></Reveal><div className="projects-grid">{studentProjects.map((project, i) => <Reveal key={project.code} delay={i * 90}><article className={`project-card project-${project.tone}`}><div className="project-visual"><span className="project-code">{project.code}</span><div className="project-bars"><i /><i /><i /><i /><i /><i /><i /></div><a href={project.href} target="_blank" rel="noreferrer" aria-label={`مشاهده ${project.title}`} className="project-play"><CirclePlay size={20} /></a><span className="project-wave-label">INSTAGRAM / PUBLIC</span></div><div className="project-meta"><span className="skill-tag">{project.type}</span><span className="project-student">{project.student}</span></div><h3>{project.title}</h3><p>{project.result}</p><div className="project-footer"><a href={project.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-gold-300">مشاهده پست اصلی <ArrowLeft size={15} /></a></div></article></Reveal>)}</div><p className="projects-note">منبع هر نمونه در اینستاگرام مشخص است. معرفی نام یا اثر هنرجوها فقط با رضایت آن‌ها انجام می‌شود.</p></div></section>

    <section id="feedback" className="feedback-section container-ay section-space"><Reveal><div className="projects-heading"><div><p className="eyebrow">/ صدای هنرجوها</p><h2 className="section-title mt-4">مسیر را از زبان<br /><span className="text-gold-400">خودشان بشنو.</span></h2></div><p className="section-sub max-w-md">بازخوردهای کوتاه از تجربه هنرجوها در مسیر یادگیری؛ با تمرکز روی چیزی که در عمل برایشان تغییر کرده است.</p></div></Reveal><div className="feedback-grid">{studentFeedback.map((feedback, i) => <Reveal key={feedback.name} delay={i * 90}><article className="feedback-card"><div className="feedback-quote">“</div><p className="feedback-text">{feedback.quote}</p><div className="feedback-author"><span className="feedback-avatar">۰{i + 1}</span><span><strong>{feedback.name}</strong><small>{feedback.detail}</small></span></div></article></Reveal>)}</div><p className="projects-note">نام و جزئیات هویتی هنرجوها برای حفظ حریم خصوصی نمایش داده نشده است.</p></section>

    <div id="courses"><HomeLiveCourses /></div>

    <section id="contact" className="container-ay section-space"><Reveal><div className="contact-card"><div className="contact-glow" /><div className="relative"><p className="eyebrow">/ هنوز مطمئن نیستی؟</p><h2 className="section-title mt-4">سؤالت را از<br /><span className="text-gold-400">راه‌یار بپرس.</span></h2><p className="section-sub max-w-lg">برای انتخاب دوره، تنظیم، میکس، مسترینگ یا تئوری موسیقی، دستیار راه‌یار می‌تواند راهنمایی‌ات کند.</p><div className="flex flex-wrap gap-3 mt-8"><Link href="/assistant" className="btn-primary gap-2">رفتن به دستیار <Bot size={16} /></Link><Link href="/contact" className="btn-ghost">ارتباط با پشتیبانی</Link></div></div><div className="contact-mark"><Waves size={52} strokeWidth={1} /><span>RAHYAR<br />ACADEMY</span></div></div></Reveal></section>
    <QuickConsultationForm />
  </div>;
}
