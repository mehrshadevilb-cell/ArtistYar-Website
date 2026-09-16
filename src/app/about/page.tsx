import type { Metadata } from "next";
import { SectionHeading } from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "درباره",
};

export default function AboutPage() {
  return (
    <section className="container-ay py-16">
      <SectionHeading
        eyebrow="درباره آکادمی راه‌یار"
        title="یک مسیر کامل برای هنرجو"
        subtitle="راه‌یار فقط آموزش نیست؛ سیستم مدیریت مسیر یادگیری است. از انتخاب محصول و پرداخت تا دسترسی، کلاس، تکلیف، پیشرفت و پشتیبانی."
      />
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          {
            t: "دوره و دسترسی",
            b: "دوره‌های دیجیتال از طریق کاتالوگ آکادمی انتخاب می‌شوند و بعد از تأیید، دسترسی محتوایی برای هنرجو فعال می‌شود.",
          },
          {
            t: "کلاس و رزرو جلسه",
            b: "برای کلاس آنلاین ثبت‌نام کن، جلسه‌ات را رزرو کن و یادآوری‌های قبل و روز کلاس را از راه‌یار دریافت کن.",
          },
          {
            t: "تکلیف و پیشرفت",
            b: "تکلیف‌ها، بازخورد، وضعیت کلاس و پیشرفتت در یک مسیر قابل پیگیری ثبت می‌شود؛ پشتیبانی هم همیشه در دسترس است.",
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
