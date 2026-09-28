import type { Metadata } from "next";
import HitNevisClient from "./HitNevisClient";

export const metadata: Metadata = {
  title: "هیت‌نویس | آرتیست‌یار",
  description: "همکار ترانه‌نویسی فارسی — گفتگوی ساده برای ساخت ترانه، تنهایی یا دونفره",
  alternates: { canonical: "/hitnevis" },
};

export default function HitNevisPage() {
  return (
    <main className="container-ay py-6 sm:py-10">
      <header className="mb-5 max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold-500">هیت‌نویس</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-sand-50 sm:text-3xl">
          همکار ترانه‌نویسی فارسی
        </h1>
        <p className="mt-2 text-sm leading-7 text-ink-400">
          ایده، خط، حس یا بازنویسی کورس — بدون فرم اضافه، همین‌جا با هم پیش می‌رویم.
        </p>
      </header>
      <HitNevisClient />
    </main>
  );
}
