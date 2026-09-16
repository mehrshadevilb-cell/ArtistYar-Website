import type { Metadata } from "next";
import { SectionHeading } from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "درباره",
};

export default function AboutPage() {
  return (
    <section className="container-ay py-16">
      <SectionHeading
        eyebrow="About"
        title="آرتیست‌یار کیست؟"
        subtitle="آکادمی برای کسانی که موسیقی را پروژه زندگی می‌دانند؛ نه دورهٔ مصرفی یک‌روزه."
      />
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          {
            t: "دقت به جای شلوغی",
            b: "رابط و محتوا طوری طراحی شده که تمرکز هنرجو حفظ شود.",
          },
          {
            t: "یک سیستم یکپارچه",
            b: "وب و ربات تلگرام روی یک منطق کسب‌وکار مشترک پیش می‌روند.",
          },
          {
            t: "مسیر قابل اندازه‌گیری",
            b: "از ثبت‌نام تا جلسه و پیشرفت، وضعیت‌ها شفاف و قابل پیگیری‌اند.",
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
