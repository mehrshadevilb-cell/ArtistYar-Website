import type { Metadata } from "next";
import Link from "next/link";
import { Bot, Camera, Headphones, Send } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { CommunityLinks } from "@/components/CommunityLinks";
import { communityLinks } from "@/data/community";

export const metadata: Metadata = {
  title: "تماس و مشاوره آموزش موسیقی",
  description:
    "برای مشاوره انتخاب دوره، کلاس آنلاین تنظیم، میکس و مسترینگ یا ادامه مسیر یادگیری با آکادمی راه‌یار در تماس باش.",
  alternates: { canonical: "/contact" },
  openGraph: {
    type: "website",
    url: "/contact",
    title: "تماس و مشاوره آموزش موسیقی | ArtistYar",
    description: "ارتباط با آکادمی راه‌یار برای مشاوره دوره و کلاس آنلاین تولید موسیقی.",
  },
};

export default function ContactPage() {
  return (
    <section className="container-ay py-14 sm:py-16">
      <SectionHeading
        eyebrow="ارتباط با ما"
        title="اگر سؤالی داری، پیام بده"
        subtitle="برای مشاوره دوره، کلاس آنلاین یا ادامه مسیر یادگیری تنظیم و میکس، اطلاعاتت را بفرست تا باهات هماهنگ کنیم."
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-start">
        <div className="order-last space-y-4 lg:order-first">
          <a
            href={communityLinks.telegramGroup.href}
            target="_blank"
            rel="noopener noreferrer"
            className="contact-channel card-ay ay-pressable block p-5 transition hover:border-gold-500/30"
          >
            <Send className="contact-channel-icon" size={17} aria-hidden="true" />
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-500">سریع‌ترین راه</p>
            <strong className="mt-2 block text-base text-sand-50">گروه پرسش و پاسخ تلگرام</strong>
            <p className="mt-2 text-sm leading-7 text-ink-400">سؤال عمومی بپرس و از تجربه بقیه استفاده کن.</p>
            <span className="mt-3 inline-flex text-xs font-medium text-gold-400">باز کردن ProAudiosGP ←</span>
          </a>
          <a
            href={communityLinks.telegramPlugins.href}
            target="_blank"
            rel="noopener noreferrer"
            className="contact-channel card-ay ay-pressable block p-5 transition hover:border-gold-500/30"
          >
            <Headphones className="contact-channel-icon" size={17} aria-hidden="true" />
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-500">ابزار</p>
            <strong className="mt-2 block text-base text-sand-50">کانال دانلود VST و پلاگین</strong>
            <p className="mt-2 text-sm leading-7 text-ink-400">منابع و معرفی پلاگین برای تولید موسیقی.</p>
            <span className="mt-3 inline-flex text-xs font-medium text-gold-400">باز کردن ProAudios ←</span>
          </a>
          <a
            href={communityLinks.instagram.href}
            target="_blank"
            rel="noopener noreferrer"
            className="contact-channel card-ay ay-pressable block p-5 transition hover:border-gold-500/30"
          >
            <Camera className="contact-channel-icon" size={17} aria-hidden="true" />
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-500">اینستاگرام</p>
            <strong className="mt-2 block text-base text-sand-50">@prodbymehrshad</strong>
            <p className="mt-2 text-sm leading-7 text-ink-400">آموزش کوتاه و نمونه‌کارهای مسیر.</p>
            <span className="mt-3 inline-flex text-xs font-medium text-gold-400">مشاهده پروفایل ←</span>
          </a>
          <Link href="/assistant" className="contact-channel card-ay ay-pressable block p-5 transition hover:border-gold-500/30">
            <Bot className="contact-channel-icon" size={17} aria-hidden="true" />
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-500">داخل سایت</p>
            <strong className="mt-2 block text-base text-sand-50">راه‌یار AI</strong>
            <p className="mt-2 text-sm leading-7 text-ink-400">عیب‌یابی میکس و راهنمای مسیر یادگیری.</p>
            <span className="mt-3 inline-flex text-xs font-medium text-gold-400">شروع گفتگو ←</span>
          </Link>
        </div>

        <form className="order-first space-y-4 p-7 card-ay sm:p-8 lg:order-last" aria-labelledby="contact-form-title">
          <div className="border-b border-white/[.07] pb-5">
            <h2 id="contact-form-title" className="text-xl font-medium text-sand-50">درخواست مشاوره</h2>
            <p className="mt-2 text-xs leading-6 text-ink-500">موضوع و راه ارتباطی‌ات را بفرست تا برای انتخاب مسیر مناسب هماهنگ کنیم.</p>
          </div>
          <div>
            <label htmlFor="contact-name" className="mb-2 block text-xs text-ink-400">
              نام
            </label>
            <input id="contact-name" className="input-ay" name="name" placeholder="نام شما…" autoComplete="name" />
          </div>
          <div>
            <label htmlFor="contact-way" className="mb-2 block text-xs text-ink-400">
              ایمیل یا موبایل
            </label>
            <input id="contact-way" className="input-ay" name="contact" placeholder="راه ارتباطی…" autoComplete="email" />
          </div>
          <div>
            <label htmlFor="contact-message" className="mb-2 block text-xs text-ink-400">
              پیام
            </label>
            <textarea
              className="input-ay min-h-32 resize-y"
              id="contact-message"
              name="message"
              placeholder="موضوع را کوتاه توضیح دهید…"
            />
          </div>
          <button type="button" className="btn-primary w-full min-h-[52px]">
            ارسال درخواست
          </button>
          <p className="text-center text-xs leading-6 text-ink-500">
            برای سؤال‌های سریع‌تر از{" "}
            <a href={communityLinks.telegramGroup.href} target="_blank" rel="noopener noreferrer" className="text-gold-400 hover:text-gold-300">
              گروه تلگرام
            </a>{" "}
            یا{" "}
            <Link href="/assistant" className="text-gold-400 hover:text-gold-300">
              راه‌یار AI
            </Link>{" "}
            استفاده کن.
          </p>
        </form>
      </div>

      <div className="mt-14">
        <CommunityLinks title="همه لینک‌های رسمی" />
      </div>
    </section>
  );
}
