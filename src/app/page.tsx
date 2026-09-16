import Link from "next/link";
import { ArrowLeft, ArrowUpLeft, AudioLines, CirclePlay, Headphones, Layers3, Sparkles, Waves } from "lucide-react";
import { HomeLiveCourses } from "@/components/HomeLiveCourses";
import { Reveal } from "@/components/Reveal";

const benefits = [
  { icon: AudioLines, title: "یادگیری شنیداری", text: "هر مفهوم را با مثال واقعی، تمرین و بازخورد می‌شنوید؛ نه فقط حفظ می‌کنید." },
  { icon: Layers3, title: "مسیر مرحله‌به‌مرحله", text: "از پایه تا انتشار، مسیرتان روشن است و هر تمرین به خروجی مشخصی وصل می‌شود." },
  { icon: Headphones, title: "همراهی حرفه‌ای", text: "با راه‌یار و مربی‌های آرتیست‌یار، هنگام ساختن تنها نمی‌مانید." },
];
const steps = ["مبانی را درست بفهم", "با پروژه واقعی تمرین کن", "صدای خودت را پیدا کن"];

export default function HomePage() {
  return <div>
    <section className="hero-section container-ay">
      <div className="hero-copy">
        <div className="hero-kicker"><span className="status-dot" /> آکادمی آنلاین تولید موسیقی</div>
        <h1 className="hero-heading">صدایت را پیدا کن،<br /><span className="gold-shimmer">حرفه‌ای بساز.</span></h1>
        <p className="hero-lead">آرتیست‌یار مسیر یادگیری موسیقی را از ابهام بیرون می‌آورد؛ با آموزش دقیق، تمرین واقعی و همراهی هوشمند راه‌یار.</p>
        <div className="hero-actions"><Link href="/courses" className="btn-primary gap-2">شروع مسیر یادگیری <ArrowLeft size={16} /></Link><a href="#about" className="btn-ghost gap-2">بیشتر بدانید <ArrowUpLeft size={15} /></a></div>
        <div className="hero-trust"><span className="trust-line" /> برای کسانی که موسیقی را جدی می‌گیرند</div>
      </div>
      <div className="hero-art" aria-label="نمایش مفهومی مسیر تولید موسیقی">
        <div className="hero-orbit orbit-a" /><div className="hero-orbit orbit-b" />
        <div className="record-disc"><div className="record-groove groove-one" /><div className="record-groove groove-two" /><div className="record-label"><Waves size={22} /><span>AY</span></div></div>
        <div className="floating-note note-one">♪</div><div className="floating-note note-two">♫</div>
        <div className="now-playing"><div className="play-icon"><CirclePlay size={20} /></div><div><span className="mini-label">NOW PLAYING</span><strong>شروع یک مسیر تازه</strong></div><div className="waveform"><i /><i /><i /><i /><i /></div></div>
        <div className="art-caption"><Sparkles size={15} /> صدا، وقتی معنا پیدا می‌کند که ساخته شود.</div>
      </div>
    </section>

    <section className="proof-strip border-y border-white/[.06]"><div className="container-ay proof-grid"><div><strong>۶+</strong><span>مسیر تخصصی</span></div><div><strong>۱۰۰٪</strong><span>پروژه‌محور</span></div><div><strong>۲۴/۷</strong><span>همراهی راه‌یار</span></div><div className="proof-note">یادگیری کمتر، <b>ساختن بیشتر.</b></div></div></section>

    <section id="about" className="container-ay section-space"><Reveal><div className="section-intro"><p className="eyebrow">/ چرا آرتیست‌یار</p><h2 className="section-title">آموزش خوب، فقط اطلاعات نیست؛<br /><span className="text-gold-400">یک مسیر قابل ادامه است.</span></h2><p className="section-sub">برای ساختن موسیقی، لازم نیست بین ده‌ها ویدیو و توصیه گم شوید. ما مسیر را ساده، عمیق و کاربردی طراحی کرده‌ایم تا هر جلسه شما را یک قدم به صدای شخصی‌تان نزدیک‌تر کند.</p></div></Reveal><div className="benefit-grid">{benefits.map((item, i) => { const Icon = item.icon; return <Reveal key={item.title} delay={i * 90}><article className="benefit-card"><span className="benefit-icon"><Icon size={20} /></span><span className="benefit-number">۰{i + 1}</span><h3>{item.title}</h3><p>{item.text}</p></article></Reveal>; })}</div></section>

    <section id="paths" className="path-section border-y border-white/[.06]"><div className="container-ay path-layout"><Reveal><div><p className="eyebrow">/ روش ما</p><h2 className="section-title mt-4">از ایده خام<br /><span className="text-gold-400">تا قطعه قابل انتشار.</span></h2><p className="section-sub max-w-xl">هر چیزی که یاد می‌گیرید برای استفاده در دنیای واقعی است. مسیر را با ریتم خودتان جلو ببرید و با هر مرحله چیزی بسازید که بتوانید به آن افتخار کنید.</p><Link href="/about" className="inline-flex items-center gap-2 mt-8 text-sm text-gold-400 hover:text-gold-300">درباره آکادمی <ArrowLeft size={15} /></Link></div></Reveal><Reveal delay={120}><div className="steps-card">{steps.map((step, i) => <div className="step-row" key={step}><span className="step-index">۰{i + 1}</span><span className="step-title">{step}</span><span className="step-arrow">↙</span></div>)}<div className="steps-footer"><span className="status-dot" /> مسیر شما از همین‌جا شروع می‌شود</div></div></Reveal></div></section>

    <div id="courses"><HomeLiveCourses /></div>

    <section id="contact" className="container-ay section-space"><Reveal><div className="contact-card"><div className="contact-glow" /><div className="relative"><p className="eyebrow">/ آماده‌ای؟</p><h2 className="section-title mt-4">ایده‌ات را به صدا<br /><span className="text-gold-400">تبدیل کن.</span></h2><p className="section-sub max-w-lg">یک مسیر درست، شروعی مطمئن‌تر می‌سازد. همین امروز اولین قدم را بردار.</p><div className="flex flex-wrap gap-3 mt-8"><Link href="/courses" className="btn-primary gap-2">دیدن دوره‌ها <ArrowLeft size={16} /></Link><Link href="/contact" className="btn-ghost">با ما در ارتباط باشید</Link></div></div><div className="contact-mark"><Waves size={52} strokeWidth={1} /><span>ARTIST<br />YAR</span></div></div></Reveal></section>
  </div>;
}
