import type { Metadata } from "next";
import HitNevisClient from "./HitNevisClient";

export const metadata: Metadata = {
  title: "هیت‌نویس | آرتیست‌یار",
  description:
    "فضای حرفه‌ای ترانه‌سرایی فارسی با Hit DNA، تست انسانی، ضدکلیشه و failover چندمدلی",
};

export default function HitNevisPage() {
  return (
    <main className="container-ay py-6 sm:py-10">
      <p className="eyebrow">HITNEVIS</p>
      <h1 className="mt-2 text-2xl font-semibold text-sand-50 sm:text-3xl">هیت‌نویس</h1>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-500">
        ویرایشگر بخش‌به‌بخش، آزمایشگاه هوک، منتقد، ضدکلیشه، Hit DNA و تست‌های انسانی.
        متن اصلی هنرمند هرگز خودکار جایگزین نمی‌شود. اگر مدل‌ها قطع باشند، پیش‌نویس محفوظ می‌ماند.
      </p>
      <p className="mt-1 text-[11px] text-ink-600">
        تحلیل Hit DNA تضمین هیت بودن نیست و از متن خودت — نه ترانه‌های کپی‌رایت‌شده — ساخته می‌شود.
      </p>
      <div className="mt-6">
        <HitNevisClient />
      </div>
    </main>
  );
}
