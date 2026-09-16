import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "کلاس آنلاین",
};

const steps = [
  "انتخاب دوره و پلن جلسات",
  "رزرو زمان از تقویم آکادمی",
  "تأیید پرداخت / وضعیت رزرو",
  "شرکت در جلسه و ثبت حضور",
];

const topics = ["تنظیم", "میکس", "مسترینگ", "پیانو", "هارمونی", "تئوری"];

export default function OnlinePage() {
  return (
    <section className="container-ay py-16">
      <SectionHeading
        eyebrow="Online Classes"
        title="کلاس یک‌به‌یک، منظم و قابل پیگیری"
        subtitle="همان منطق رزرو، ظرفیت، حضور و یادآوری که در ربات فعال است — به‌زودی روی وب هم قابل استفاده می‌شود."
      />

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <div className="card-ay p-7">
          <h3 className="text-lg font-medium text-sand-50">روند کار</h3>
          <ol className="mt-5 space-y-4">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-7 text-ink-300">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold-500/30 text-xs text-gold-400">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <div className="card-ay p-7">
          <h3 className="text-lg font-medium text-sand-50">موضوعات فعال</h3>
          <div className="mt-5 flex flex-wrap gap-2">
            {topics.map((topic) => (
              <span
                key={topic}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-ink-300"
              >
                {topic}
              </span>
            ))}
          </div>
          <p className="mt-8 text-sm leading-7 text-ink-400">
            مدیریت ظرفیت، کنسلی طبق قوانین آکادمی، و جلوگیری از مصرف نادرست جلسه —
            همه در لایه سرویس یکسان با ربات.
          </p>
          <Link href="/login" className="btn-primary mt-8 !text-xs">
            ورود برای رزرو (به‌زودی)
          </Link>
        </div>
      </div>
    </section>
  );
}
