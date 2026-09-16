import type { Metadata } from "next";
import { SectionHeading } from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "تماس",
};

export default function ContactPage() {
  return (
    <section className="container-ay py-16">
      <SectionHeading
        eyebrow="Contact"
        title="پشتیبانی آرتیست‌یار"
        subtitle="برای هماهنگی دوره، کلاس و مسائل حساب کاربری از این مسیر پیام بگذارید. اتصال فرم به سیستم پشتیبانی در فاز API فعال می‌شود."
      />
      <form className="card-ay mx-auto mt-12 max-w-xl space-y-4 p-7">
        <div>
          <label className="mb-2 block text-xs text-ink-400">نام</label>
          <input className="input-ay" name="name" placeholder="نام شما" />
        </div>
        <div>
          <label className="mb-2 block text-xs text-ink-400">ایمیل یا موبایل</label>
          <input className="input-ay" name="contact" placeholder="راه ارتباطی" />
        </div>
        <div>
          <label className="mb-2 block text-xs text-ink-400">پیام</label>
          <textarea
            className="input-ay min-h-32 resize-y"
            name="message"
            placeholder="موضوع را کوتاه توضیح دهید"
          />
        </div>
        <button type="button" className="btn-primary w-full">
          ارسال (فاز بعد فعال می‌شود)
        </button>
        <p className="text-center text-xs text-ink-500">
          فعلاً می‌توانید از پشتیبانی داخل ربات تلگرام هم استفاده کنید.
        </p>
      </form>
    </section>
  );
}
