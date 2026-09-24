import type { Metadata } from "next";
import HitNevisClient from "./HitNevisClient";

export const metadata: Metadata = {
  title: "هیت‌نویس | آرتیست‌یار",
  description: "دستیار ترانه‌سرایی با چند ارائه‌دهندهٔ هوش مصنوعی و failover خودکار",
};

export default function HitNevisPage() {
  return (
    <main className="container-ay py-8 sm:py-12">
      <p className="eyebrow">HITNEVIS</p>
      <h1 className="mt-2 text-3xl font-semibold text-sand-50">هیت‌نویس</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-500">
        ترانه بنویس، بهبود بده، قافیه پیدا کن — روی چند مدل با جابه‌جایی خودکار در صورت خطا.
        اگر همهٔ مدل‌ها موقتاً قطع باشند، متنت حفظ می‌شود و می‌توانی دوباره تلاش کنی.
      </p>
      <div className="mt-8">
        <HitNevisClient />
      </div>
    </main>
  );
}
