import type { Metadata } from "next";
import MusicAnalyzerLab from "@/components/MusicAnalyzerLab";

export const metadata: Metadata = {
  title: "Music Analyzer · آرتیست‌یار",
  description: "آپلود فایل موسیقی و دریافت تحلیل هوشمند میکس، لودنس، استریو، فاز و EQ.",
  alternates: { canonical: "/music-analyzer" },
};

export default function MusicAnalyzerPage() {
  return (
    <main className="container-ay relative py-12 sm:py-16">
      <div className="route-ambient route-ambient-one" aria-hidden="true" />
      <MusicAnalyzerLab />
    </main>
  );
}
