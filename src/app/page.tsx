import Link from "next/link";
import { HomeLiveCourses } from "@/components/HomeLiveCourses";
import { SectionHeading } from "@/components/SectionHeading";

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

export default function HomePage() {
  return (
    <div className="fade-in">
      <section className="container-ay pb-16 pt-16 sm:pb-20 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-gold-500">
            Academy of Serious Music
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.25] tracking-tight text-sand-50 sm:text-6xl">
            موسیقی را
            <span className="block text-gold-400">با دقت بساز</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-ink-400 sm:text-lg">
            آرتیست‌یار فضای یادگیری مینیمال برای هنرجویانی است که می‌خواهند تولید،
            تنظیم، میکس و اجرای خود را حرفه‌ای پیش ببرند.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/courses" className="btn-primary">
              مشاهده دوره‌ها
            </Link>
            <Link href="/assistant" className="btn-ghost">
              گفتگو با دستیار AI
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-3 sm:grid-cols-3">
          {["دوره دیجیتال", "جلسه یک‌به‌یک", "دستیار هوشمند"].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4 text-center text-sm text-ink-300 transition hover:border-white/10"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="container-ay py-16">
        <SectionHeading
          eyebrow="چرا آرتیست‌یار"
          title="کمتر شلوغ، بیشتر مؤثر"
          subtitle="طراحی تجربه حول تمرکز است: مسیر مشخص، کلاس منظم، و رابطی که حواس را پرت نمی‌کند."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {pillars.map((item) => (
            <div key={item.title} className="card-ay p-6 hover:border-gold-500/20">
              <h3 className="text-lg font-medium text-sand-50">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-ink-400">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <HomeLiveCourses />

      <section className="container-ay py-16">
        <div className="card-ay relative overflow-hidden px-8 py-12 sm:px-12">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-gold-500/10 via-transparent to-transparent" />
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
      </section>
    </div>
  );
}
