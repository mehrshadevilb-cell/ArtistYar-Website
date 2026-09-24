import type { Metadata } from "next";
import HitNevisClient from "./HitNevisClient";

export const metadata: Metadata = {
  title: "هیت‌نویس | آرتیست‌یار",
  description: "همکار ترانه‌نویسی فارسی — گفتگوی ساده برای ساخت ترانه، تنهایی یا دونفره",
};

export default function HitNevisPage() {
  return (
    <main className="container-ay py-6 sm:py-10">
      <HitNevisClient />
    </main>
  );
}
