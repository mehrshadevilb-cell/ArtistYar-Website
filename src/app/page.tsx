import Link from "next/link";
import { ArrowLeft, ArrowUpLeft, AudioLines, CirclePlay, Headphones, Layers3, Sparkles, Waves } from "lucide-react";
import { HomeLiveCourses } from "@/components/HomeLiveCourses";
import { Reveal } from "@/components/Reveal";

const benefits = [
  { icon: AudioLines, title: "تنظیم، از پایه تا اجرا", text: "لایه‌گذاری، انتخاب صدا و ساختار قطعه را با تمرین‌های واقعی و قابل شنیدن یاد بگیر." },
  { icon: Layers3, title: "میکس و مسترینگ اصولی", text: "به‌جای ترفندهای پراکنده، گوش و تصمیم‌گیری مهندسی‌شده برای صدای حرفه‌ای بساز." },
  { icon: Headphones, title: "پشتیبانی دائمی هنرجو", text: "با راه‌یار و همراهی مستقیم، سؤال‌هایت بعد از پایان جلسه بی‌پاسخ نمی‌ماند." },
];
const steps = ["مبانی را درست بفهم", "با پروژه واقعی تمرین کن", "صدای خودت را پیدا کن"];

export default function HomePage() {
  return <div>
    <section className="hero-section container-ay">
      <div className="hero-copy">
        <div className="hero-kicker"><span className="status-dot" /> آموزش تنظیم، میکس و مسترینگ</div>
        <h1 className="hero-heading">موسیقی را بفهم،<br /><span className="gold-shimmer">حرفه‌ای بساز.</span></h1>
        <p className="hero-lead">بهت یاد می‌دیم تنظیم و میکس رو درست و اصولی انجام بدی؛ با تمرین واقعی، گوش دقیق و پشتیبانی دائمی تا بالاخره صدای خودت را پیدا کنی.</p>
        <div className="hero-actions"><Link href="/courses" className="btn-primary gap-2">شروع یادگیری اصولی <ArrowLeft size={16} /></Link><a href="https://www.instagram.com/prodbymehrshad/" target="_blank" rel="noreferrer" className="btn-ghost gap-2">آموزش‌های کوتاه اینستاگرام <ArrowUpLeft size={15} /></a></div>
        <div className="hero-trust"><span className="trust-line" /> یک‌بار برای همیشه تنظیم و میکس را یاد بگیر</div>
      </div>
      <div className="hero-art" aria-label="نمایش مفهومی مسیر تولید موسیقی">
        <div className="hero-orbit orbit-a" /><div className="hero-orbit orbit-b" />
        <div className="record-disc"><div className="record-groove groove-one" /><div className="record-groove groove-two" /><div className="record-label"><Waves size={22} /><span>AY</span></div></div>
        <div className="floating-note note-one">♪</div><div className="floating-note note-two">♫</div>
        <div className="now-playing"><div className="play-icon"><CirclePlay size={20} /></div><div><span className="mini-label">NOW PLAYING</span><strong>شروع یک مسیر تازه</strong></div><div className="waveform"><i /><i /><i /><i /><i /></div></div>
        <div className="art-caption"><Sparkles size={15} /> صدا، وقتی معنا پیدا می‌کند که ساخته شود.</div>
      </div>
    </section>

    <section className="proof-strip border-y border-white/[.06]"><div className="container-ay proof-grid"><div><strong>تنظیم</strong><span>از ایده تا قطعه</span></div><div><strong>میکس</strong><span>شفاف و اصولی</span></div><div><strong>مسترینگ</strong><span>آماده انتشار</span></div><div className="proof-note">یک مسیر روشن، <b>صدای ماندگار.</b></div></div></section>

    <section id="about" className="container-ay section-space"><Reveal><div className="section-intro"><p className="eyebrow">/ چرا آرتیست‌یار</p><h2 className="section-title">یادگیری واقعی یعنی؛<br /><span className="text-gold-400">یک‌بار برای همیشه بفهمی.</span></h2><p className="section-sub">اینجا قرار نیست فقط چند preset و ترفند حفظ کنی. از بیت‌دپت و سمپل‌ریت تا ملودی، تنظیم، میکس و مسترینگ را در زنجیره‌ای می‌بینی که به یک خروجی واقعی ختم می‌شود.</p></div></Reveal><div className="benefit-grid">{benefits.map((item, i) => { const Icon = item.icon; return <Reveal key={item.title} delay={i * 90}><article className="benefit-card"><span className="benefit-icon"><Icon size={20} /></span><span className="benefit-number">۰{i + 1}</span><h3>{item.title}</h3><p>{item.text}</p></article></Reveal>; })}</div></section>

    <section id="paths" className="path-section border-y border-white/[.06]"><div className="container-ay path-layout"><Reveal><div><p className="eyebrow">/ روش آرتیست‌یار</p><h2 className="section-title mt-4">از یادگیری<br /><span className="text-gold-400">تا ساختن واقعی.</span></h2><p className="section-sub max-w-xl">اینجا قرار نیست فقط چند نکته پراکنده یاد بگیری. مفاهیم را می‌فهمی، روی پروژه تمرین می‌کنی و قدم‌به‌قدم به صدایی می‌رسی که امضای خودت را دارد.</p><Link href="/about" className="inline-flex items-center gap-2 mt-8 text-sm text-gold-400 hover:text-gold-300">درباره آکادمی <ArrowLeft size={15} /></Link></div></Reveal><Reveal delay={120}><div className="steps-card">{steps.map((step, i) => <div className="step-row" key={step}><span className="step-index">۰{i + 1}</span><span className="step-title">{step}</span><span className="step-arrow">↙</span></div>)}<div className="steps-footer"><span className="status-dot" /> یادگیری با یک قدم ساده شروع می‌شود</div></div></Reveal></div></section>

    <div id="courses"><HomeLiveCourses /></div>

    <section id="contact" className="container-ay section-space"><Reveal><div className="contact-card"><div className="contact-glow" /><div className="relative"><p className="eyebrow">/ شروع مسیر</p><h2 className="section-title mt-4">موسیقی‌ات را<br /><span className="text-gold-400">جدی‌تر دنبال کن.</span></h2><p className="section-sub max-w-lg">اگر برای یادگیری تنظیم، میکس یا مسترینگ سؤال داری، از مسیر درست شروع کن.</p><div className="flex flex-wrap gap-3 mt-8"><Link href="/courses" className="btn-primary gap-2">مشاهده دوره‌ها <ArrowLeft size={16} /></Link><Link href="/contact" className="btn-ghost">مشاوره و ارتباط</Link></div></div><div className="contact-mark"><Waves size={52} strokeWidth={1} /><span>ARTIST<br />YAR</span></div></div></Reveal></section>
  </div>;
}
