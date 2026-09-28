import type { Metadata } from "next";
import MusicAnalyzerLab from "@/components/MusicAnalyzerLab";

export const metadata: Metadata = {
  title: "تحلیلگر موسیقی · آرتیست‌یار",
  description: "آپلود فایل موسیقی و دریافت تحلیل هوشمند میکس، تنظیم، لودنس، استریو و EQ.",
  alternates: { canonical: "/music-analyzer" },
};

export default function MusicAnalyzerPage() {
  return (
    <main className="container-ay relative py-12 sm:py-16">
      <div className="route-ambient route-ambient-one" aria-hidden="true" />
      <header className="mb-8 max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold-500">تحلیلگر موسیقی</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-sand-50 sm:text-3xl">
          تحلیل هوشمند میکس و تنظیم
        </h1>
        <p className="mt-2 text-sm leading-7 text-ink-400">
          فایل را آپلود کن تا لودنس، استریو، EQ و نقاط قابل بهبود را ببینی.
        </p>
      </header>
      <MusicAnalyzerLab />
    </main>
  );
}
