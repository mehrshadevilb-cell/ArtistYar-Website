import Link from "next/link";
import { AmbientBackdrop } from "@/components/AmbientBackdrop";
import { LiveProductCard } from "@/components/LiveProductCard";
import { Reveal } from "@/components/Reveal";
import { ScrollCue } from "@/components/ScrollCue";
import { SectionHeading } from "@/components/SectionHeading";
import { StatusChip } from "@/components/StatusChip";
import { getCatalog } from "@/lib/catalog";

const pillars = [
  {
    title: "مسیر شفاف",
    body: "از خرید تا دسترسی، رزرو کلاس و پیشرفت — همه در یک تجربه منسجم.",
  },
  {
    title: "کلاس واقعی",
    body: "رزرو، حضور و جلسات آنلاین با قواعد مشخص آکادمی، نه لیست مبهم.",
  },
  {
    title: "همراهی هوشمند",
    body: "دستیار AI و پشتیبانی، برای وقتی که مسیر نیاز به راهنمایی دارد.",
  },
];

export default async function HomePage() {
  const catalog = await getCatalog();
  const preview = catalog.items.slice(0, 3);

  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden pb-10 pt-16 sm:pb-14 sm:pt-24">
        <AmbientBackdrop />
        <div className="container-ay relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <p className="hero-fade text-xs font-medium uppercase tracking-[0.28em] text-gold-500">
              Academy of Serious Music
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.25] tracking-tight text-sand-50 sm:text-6xl">
              <span className="hero-title-line">موسیقی را</span>
              <span className="hero-title-line gold-shimmer">با دقت بساز</span>
            </h1>
            <p className="hero-fade mx-auto mt-6 max-w-xl text-base leading-8 text-ink-400 sm:text-lg">
              آرتیست‌یار فضای یادگیری مینیمال برای هنرجویانی است که می‌خواهند تولید،
              تنظیم، میکس و اجرای خود را حرفه‌ای پیش ببرند.
            </p>
            <div className="hero-cta mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link href="/courses" className="btn-primary">
                مشاهده دوره‌ها
              </Link>
              <Link href="/assistant" className="btn-ghost">
                گفتگو با دستیار AI
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-16 grid max-w-4xl gap-3 sm:grid-cols-3">
            {["دوره دیجیتال", "جلسه یک‌به‌یک", "دستیار هوشمند"].map((item, i) => (
              <Reveal key={item} delay={120 + i * 90}>
                <div className="chip-float rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4 text-center text-sm text-ink-300">
                  {item}
                </div>
              </Reveal>
            ))}
          </div>

          <ScrollCue />
        </div>
      </section>

      <section className="container-ay py-16">
        <Reveal>
          <SectionHeading
            eyebrow="چرا آرتیست‌یار"
            title="کمتر شلوغ، بیشتر مؤثر"
            subtitle="طراحی تجربه حول تمرکز است: مسیر مشخص، کلاس منظم، و رابطی که حواس را پرت نمی‌کند."
          />
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {pillars.map((item, i) => (
            <Reveal key={item.title} delay={i * 100}>
              <div className="card-ay h-full p-6">
                <h3 className="text-lg font-medium text-sand-50">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-ink-400">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-ay py-16">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <Reveal>
            <SectionHeading
              eyebrow="مسیرها"
              title="از بنیان تا انتشار"
              subtitle="کاتالوگ مستقیم از سیستم راه‌یار — قیمت و وضعیت واقعی."
            />
          </Reveal>
          <Reveal delay={120}>
            <div className="flex items-center gap-3">
              <StatusChip tone={catalog.source === "rahyar" ? "ok" : "warn"}>
                {catalog.source === "rahyar" ? "زنده" : catalog.source}
              </StatusChip>
              <Link href="/courses" className="btn-ghost !py-2.5 text-xs">
                همه دوره‌ها
              </Link>
            </div>
          </Reveal>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {preview.map((p, i) => (
            <Reveal key={p.id} delay={i * 90}>
              <LiveProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-ay py-16 pb-24">
        <Reveal>
          <div className="card-ay relative overflow-hidden px-8 py-12 sm:px-12">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-gold-500/15 via-transparent to-transparent" />
            <div className="pointer-events-none absolute -left-10 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-gold-500/10 blur-3xl" />
            <div className="relative max-w-xl">
              <h2 className="text-3xl font-semibold tracking-tight text-sand-50">
                آماده‌ای مسیرت را شروع کنی؟
              </h2>
              <p className="mt-4 text-sm leading-7 text-ink-400">
                وارد حساب شو، دوره‌ها را ببین، از دستیار بپرس، و اکانت را با ربات همگام کن.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/login" className="btn-primary">
                  ورود به حساب
                </Link>
                <Link href="/online" className="btn-ghost">
                  کلاس آنلاین
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
