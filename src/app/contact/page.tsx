import type { Metadata } from "next";
import { SectionHeading } from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "تماس",
};

export default function ContactPage() {
  return (
    <section className="container-ay py-16">
      <SectionHeading
        eyebrow="ارتباط با ما"
        title="اگر سؤالی داری، پیام بده"
        subtitle="برای مشاوره دوره، کلاس آنلاین یا ادامه مسیر یادگیری تنظیم و میکس، اطلاعاتت را بفرست تا باهات هماهنگ کنیم."
      />
      <form className="card-ay mx-auto mt-12 max-w-xl space-y-4 p-7">
        <div>
          <label htmlFor="contact-name" className="mb-2 block text-xs text-ink-400">نام</label>
          <input id="contact-name" className="input-ay" name="name" placeholder="نام شما…" autoComplete="name" />
        </div>
        <div>
          <label htmlFor="contact-way" className="mb-2 block text-xs text-ink-400">ایمیل یا موبایل</label>
          <input id="contact-way" className="input-ay" name="contact" placeholder="راه ارتباطی…" autoComplete="email" />
        </div>
        <div>
          <label htmlFor="contact-message" className="mb-2 block text-xs text-ink-400">پیام</label>
          <textarea
            className="input-ay min-h-32 resize-y"
            id="contact-message"
            name="message"
            placeholder="موضوع را کوتاه توضیح دهید…"
          />
        </div>
        <button type="button" className="btn-primary w-full">
          ارسال درخواست
        </button>
        <p className="text-center text-xs text-ink-500">
          برای سؤال‌های سریع‌تر، می‌توانی از دستیار راه‌یار هم کمک بگیری.
        </p>
      </form>
    </section>
  );
}
