import type { Metadata } from "next";
import { SectionHeading } from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "درباره",
};

export default function AboutPage() {
  return (
    <section className="container-ay py-16">
      <SectionHeading
        eyebrow="About ArtistYar"
        title="آرتیست‌یار برای ساختن است."
        subtitle="آموزش تنظیم، میکس و مسترینگ برای هنرجویی که می‌خواهد موسیقی را درست و اصولی یاد بگیرد؛ نه با آزمون‌وخطای بی‌پایان."
      />
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          {
            t: "تنظیم و میکس اصولی",
            b: "از بیت‌دپت و سمپل‌ریت تا انتخاب صدا، لایه‌گذاری، تعادل و عمق؛ مفهوم را می‌فهمی و در پروژه اجرا می‌کنی.",
          },
          {
            t: "ملودی تا مسترینگ",
            b: "مسیر فقط به نرم‌افزار ختم نمی‌شود؛ از ایده و ملودی تا خروجی نهایی و آماده انتشار همراهت هستیم.",
          },
          {
            t: "پشتیبانی دائمی",
            b: "سؤال‌های هنرجو بعد از کلاس تمام نمی‌شوند؛ راه‌یار و تیم آرتیست‌یار برای ادامه مسیر کنار تو هستند.",
          },
        ].map((item) => (
          <div key={item.t} className="card-ay p-6">
            <h3 className="text-lg font-medium text-sand-50">{item.t}</h3>
            <p className="mt-3 text-sm leading-7 text-ink-400">{item.b}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
