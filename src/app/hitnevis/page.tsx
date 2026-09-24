import type { Metadata } from "next";
import HitNevisClient from "./HitNevisClient";

export const metadata: Metadata = {
  title: "هیت‌نویس | آرتیست‌یار",
  description:
    "گفتگوی ترانه‌سرایی فارسی — کورس، ورس، هوک، نقد، ضدکلیشه، Hit DNA و صدای هنرمند در یک چت",
};

export default function HitNevisPage() {
  return (
    <main className="container-ay py-4 sm:py-8">
      <div className="mb-4 sm:mb-6">
        <p className="eyebrow">HITNEVIS</p>
        <h1 className="mt-1 text-2xl font-semibold text-sand-50 sm:text-3xl">هیت‌نویس</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-7 text-ink-500">
          دستیار گفتگویی ترانه‌سرایی. به زبان خودت بگو چه می‌خواهی — متن اصلیت محفوظ می‌ماند.
        </p>
      </div>
      <HitNevisClient />
    </main>
  );
}
