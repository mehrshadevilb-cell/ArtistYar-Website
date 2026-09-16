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
      <div className="mt-12 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div className="card-ay p-7 md:p-9">
          <p className="eyebrow">/ مدرس و مسیر آموزشی</p>
          <h2 className="mt-4 text-2xl font-medium text-sand-50 md:text-3xl">
            مهرشاد بنائی
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-ink-300">
            آموزش تنظیم، میکس و مسترینگ با تمرکز روی یادگیری واقعی و اصولی؛ از فهمیدن مبانی و تصمیم‌های موسیقایی تا ساختن و کامل‌کردن پروژه‌ی خودت.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs text-ink-300">
            {['تنظیم', 'میکس', 'مسترینگ', 'تئوری موسیقی', 'پیانو و هارمونی'].map((item) => (
              <span key={item} className="rounded-full border border-white/[.1] px-3 py-2">
                {item}
              </span>
            ))}
          </div>
          <a
            href="https://www.instagram.com/prodbymehrshad/"
            target="_blank"
            rel="noreferrer"
            className="mt-7 inline-flex text-sm text-gold-400 hover:text-gold-300"
          >
            مشاهده آموزش‌ها و نمونه‌ها در اینستاگرام ←
          </a>
        </div>
        <div className="card-ay p-7 md:p-9">
          <p className="eyebrow">/ هنرجوها</p>
          <h2 className="mt-4 text-2xl font-medium text-sand-50">از آموزش تا خروجی واقعی</h2>
          <p className="mt-4 text-sm leading-8 text-ink-300">
            در محتوای راه‌یار، مسیر رشد هنرجوها، رضایت‌ها و نمونه‌کارهای آموزشی به‌صورت مرحله‌به‌مرحله دنبال می‌شود؛ نه فقط تماشای ویدیو، بلکه تمرین، بازخورد و ساختن پروژه.
          </p>
          <ul className="mt-6 space-y-3 text-sm leading-7 text-ink-300">
            <li>• تمرین روی پروژه‌ی خود هنرجو</li>
            <li>• بازخورد و پشتیبانی در مسیر یادگیری</li>
            <li>• تمرکز بر تنظیم، میکس و مسترینگ اصولی</li>
          </ul>
          <p className="mt-6 text-xs leading-6 text-ink-500">
            معرفی نام و آثار هر هنرجو فقط با رضایت خود او در سایت منتشر می‌شود.
          </p>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="card-ay p-6">
          <p className="eyebrow">/ یادگیری واقعی</p>
          <h3 className="mt-3 text-lg font-medium text-sand-50">تمرین با گوش و پروژه</h3>
          <p className="mt-3 text-sm leading-7 text-ink-400">
            تمرین‌های تقویت شنوایی، ریورب و کمپرس، سمپل‌ریت، فرکانس و ساخت صدا بخشی از محتوای عمومی آموزشی راه‌یار هستند.
          </p>
        </div>
        <div className="card-ay p-6">
          <p className="eyebrow">/ پشتیبانی پس از دوره</p>
          <h3 className="mt-3 text-lg font-medium text-sand-50">بعد از آموزش تنها نمی‌مانی</h3>
          <p className="mt-3 text-sm leading-7 text-ink-400">
            مسیر راه‌یار گروه پشتیبانی فعال دارد و همراهی مدرس برای ادامه‌ی تمرین و رساندن تنظیم و میکس به کیفیت هدف ادامه پیدا می‌کند.
          </p>
        </div>
        <div className="card-ay p-6">
          <p className="eyebrow">/ نمونه‌های عمومی</p>
          <h3 className="mt-3 text-lg font-medium text-sand-50">خروجی هنرجوها</h3>
          <p className="mt-3 text-sm leading-7 text-ink-400">
            نمونه‌هایی از میکس و تنظیم هنرجوها در صفحه رسمی منتشر شده است؛ هر نمونه به پست اصلی اینستاگرام ارجاع می‌دهد.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <a href="https://www.instagram.com/reel/Da5u4gLMGmd/" target="_blank" rel="noreferrer" className="text-gold-400 hover:text-gold-300">میکس تنظیم هنرجو ←</a>
            <a href="https://www.instagram.com/reel/DbJhnvpMsCT/" target="_blank" rel="noreferrer" className="text-gold-400 hover:text-gold-300">خروجی آموزش راه‌یار ←</a>
          </div>
        </div>
      </div>
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
