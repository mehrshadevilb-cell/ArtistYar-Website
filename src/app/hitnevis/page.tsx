import type { Metadata } from "next";
import HitNevisClient from "./HitNevisClient";

export const metadata: Metadata = {
  title: "هیت‌نویس | آرتیست‌یار",
  description: "همکار ترانه‌نویسی فارسی — گفتگوی طبیعی برای ایده، هوک، ورس، کورس و بازنویسی",
};

export default function HitNevisPage() {
  return (
    <main className="container-ay py-4 sm:py-8">
      <HitNevisClient />
    </main>
  );
}
