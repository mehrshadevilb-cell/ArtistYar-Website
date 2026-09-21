import type { Metadata } from "next";
import { MusicGeneratorClient } from "./MusicGeneratorClient";

export const metadata: Metadata = {
  title: "تولید موسیقی با هوش مصنوعی | آرتیست‌یار",
  description:
    "ریف، بیس‌لاین، ملودی، فیل درام و قطعات موسیقی حرفه‌ای را با زبان طبیعی درخواست کنید — مخصوص نوازندگان و تهیه‌کنندگان.",
  alternates: { canonical: "/ai-music" },
};

export default function AiMusicPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--fg)]" dir="rtl">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8 space-y-2">
          <p className="text-sm font-medium tracking-wide text-[var(--accent)]">آرتیست‌یار · ابزار حرفه‌ای</p>
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">تولید قطعهٔ موسیقی با AI</h1>
          <p className="max-w-xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">
            به‌جای آهنگ کامل، دقیقاً همان المان را بخواهید: ریف گیتار، بیس‌لاین، فیل درام، آرپژ سینت و…
          </p>
        </header>
        <MusicGeneratorClient />
      </div>
    </main>
  );
}
