import Link from "next/link";
import { ArrowLeft, ArrowUpLeft, ExternalLink, GitBranch, Mail, Sparkles } from "lucide-react";
import { AmbientBackdrop } from "@/components/AmbientBackdrop";
import { Reveal } from "@/components/Reveal";
import { ParallaxHero } from "@/components/Parallax";

const projects = [
  {
    number: "01",
    title: "راه‌یار",
    description: "یک اکوسیستم مدیریت آموزشی و دستیار هوشمند؛ از داشبورد تا اتوماسیون پشتیبانی.",
    tags: ["Next.js", "Python", "AI"],
    href: "https://github.com/mehrshadevilb-cell/RahYar-Academy-Management-System-V14",
  },
  {
    number: "02",
    title: "آرتیست‌یار",
    description: "تجربه‌ای سریع، مینیمال و RTL برای معرفی محصول، مدیریت دوره و ارتباط با کاربر.",
    tags: ["React", "UX/UI", "API"],
    href: "https://github.com/mehrshadevilb-cell/ArtistYar-Website",
  },
];

const skills = ["TypeScript", "React / Next.js", "Python", "AI Products", "Product Design", "API Architecture"];

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <ParallaxHero className="relative overflow-hidden pb-24 pt-16 sm:pb-32 sm:pt-24">
        <AmbientBackdrop />
        <div className="container-ay relative z-10">
          <div className="grid items-end gap-14 lg:grid-cols-[1.05fr_.95fr] lg:gap-20">
            <div className="max-w-2xl">
              <div className="hero-fade mb-7 flex items-center gap-3 text-sm text-ink-400">
                <span className="status-dot" /> در دسترس برای همکاری‌های منتخب
              </div>
              <h1 className="text-5xl font-semibold leading-[1.15] tracking-[-0.04em] text-sand-50 sm:text-7xl">
                <span className="hero-title-line">محصولات دیجیتال</span>
                <span className="hero-title-line gold-shimmer">با فکر ساخته می‌شوند.</span>
              </h1>
              <p className="hero-fade mt-7 max-w-xl text-lg leading-9 text-ink-300 sm:text-xl">
                من یک توسعه‌دهنده محصول هستم؛ ایده‌های پیچیده را به تجربه‌های سریع، قابل‌اعتماد و دوست‌داشتنی تبدیل می‌کنم.
              </p>
              <div className="hero-cta mt-10 flex flex-wrap gap-3">
                <a href="#work" className="btn-primary gap-2">مشاهده پروژه‌ها <ArrowLeft size={16} /></a>
                <a href="mailto:hello@artistyar.dev" className="btn-ghost gap-2">شروع یک گفتگو <Mail size={16} /></a>
              </div>
              <div className="hero-fade mt-12 flex flex-wrap gap-x-8 gap-y-3 text-sm text-ink-500">
                <span>۰۵+ سال تجربه</span><span>۲۰+ محصول و پروژه</span><span>تمرکز: وب و AI</span>
              </div>
            </div>

            <div className="hero-visual relative mx-auto w-full max-w-[520px] lg:mb-2">
              <div className="code-orbit orbit-one" /><div className="code-orbit orbit-two" />
              <div className="code-window relative z-10 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#111110]/90 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/[.08] px-5 py-4 text-[11px] text-ink-500" dir="ltr">
                  <span className="flex gap-1.5"><i className="window-dot bg-[#ef8f78]" /><i className="window-dot bg-[#d9b861]" /><i className="window-dot bg-[#87b68b]" /></span>
                  <span>product.tsx</span><span className="w-10" />
                </div>
                <div className="space-y-4 px-6 py-7 font-mono text-xs leading-6 text-ink-400 sm:px-9 sm:py-9 sm:text-sm" dir="ltr">
                  <p><span className="code-purple">const</span> <span className="code-gold">vision</span> = {'{'}</p>
                  <p className="pl-6">purpose: <span className="code-green">&quot;make useful things&quot;</span>,</p>
                  <p className="pl-6">stack: [<span className="code-green">&quot;web&quot;</span>, <span className="code-green">&quot;ai&quot;</span>, <span className="code-green">&quot;design&quot;</span>],</p>
                  <p className="pl-6">quality: <span className="code-blue">Infinity</span>,</p>
                  <p>{'}'};</p>
                  <p className="pt-3"><span className="code-purple">export default</span> <span className="code-gold">build</span>(vision); <span className="cursor-blink">▌</span></p>
                </div>
                <div className="flex items-center justify-between border-t border-white/[.08] px-6 py-4 text-[11px] text-ink-500" dir="ltr"><span>main*</span><span className="text-emerald-400">● ready to ship</span></div>
              </div>
              <div className="code-badge absolute -bottom-5 -left-3 z-20 flex items-center gap-3 rounded-2xl border border-gold-500/20 bg-[#191813]/90 px-4 py-3 text-xs text-sand-100 shadow-xl backdrop-blur-xl"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold-500/15 text-gold-400"><Sparkles size={15} /></span><span>جزئیات، تفاوت را می‌سازند.</span></div>
            </div>
          </div>
          <div className="mt-20 flex items-center gap-3 text-xs text-ink-500"><span className="scroll-cue-line" /> برای دیدن مسیر اسکرول کنید</div>
        </div>
      </ParallaxHero>

      <section id="about" className="container-ay py-24 sm:py-32">
        <Reveal><div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr] lg:gap-24"><p className="eyebrow">/ درباره من</p><div><h2 className="section-title max-w-3xl">کد فقط بخشی از کار است؛<br /><span className="text-gold-400">حل مسئله، تمام ماجراست.</span></h2><p className="section-sub max-w-2xl">در مرز مشترک مهندسی، طراحی و محصول کار می‌کنم. قبل از ساختن، مسئله را می‌فهمم؛ بعد راه‌حلی می‌سازم که هم زیباست و هم در دنیای واقعی دوام می‌آورد.</p><div className="mt-9 flex flex-wrap gap-2">{skills.map((skill) => <span key={skill} className="skill-tag">{skill}</span>)}</div></div></div></Reveal>
      </section>

      <section id="work" className="border-y border-white/[.06] bg-white/[.015] py-24 sm:py-32"><div className="container-ay"><Reveal><div className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow">/ پروژه‌های منتخب</p><h2 className="section-title mt-4">چیزهایی که ساخته‌ام.</h2></div><a href="https://github.com/mehrshadevilb-cell" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-ink-400 transition hover:text-gold-400">گیت‌هاب من <GitBranch size={16} /></a></div></Reveal><div className="grid gap-5 lg:grid-cols-2">{projects.map((project, i) => <Reveal key={project.number} delay={i * 100}><a href={project.href} target="_blank" rel="noreferrer" className="project-card group block"><div className="flex items-start justify-between"><span className="font-mono text-xs text-gold-500">{project.number}</span><ArrowUpLeft className="text-ink-500 transition group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:text-gold-400" size={20} /></div><div className="mt-20"><h3 className="text-2xl font-medium text-sand-50">{project.title}</h3><p className="mt-3 max-w-md text-sm leading-7 text-ink-400">{project.description}</p><div className="mt-6 flex gap-2">{project.tags.map(tag => <span key={tag} className="text-xs text-ink-500">#{tag}</span>)}</div></div></a></Reveal>)}</div></div></section>

      <section id="contact" className="container-ay py-24 sm:py-32"><Reveal><div className="relative overflow-hidden rounded-[2rem] border border-gold-500/20 bg-gradient-to-bl from-gold-500/[.12] via-white/[.03] to-transparent px-7 py-12 sm:px-14 sm:py-16"><div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-gold-500/15 blur-3xl" /><div className="relative max-w-2xl"><p className="eyebrow">/ ارتباط</p><h2 className="mt-5 text-3xl font-semibold tracking-tight text-sand-50 sm:text-5xl">یک ایده خوب دارید؟<br /><span className="text-gold-400">بیایید بسازیمش.</span></h2><p className="mt-5 max-w-lg leading-8 text-ink-300">اگر مسئله‌ای دارید که ارزش حل‌کردن دارد، خوشحال می‌شوم درباره‌اش بشنوم.</p><a href="mailto:hello@artistyar.dev" className="btn-primary mt-8 gap-2">hello@artistyar.dev <ExternalLink size={15} /></a></div></div></Reveal></section>
    </div>
  );
}
