import type { Metadata } from "next";
import MusicAnalyzerLab from "@/components/MusicAnalyzerLab";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "تحلیلگر موسیقی · آرتیست‌یار",
  description: "آپلود فایل موسیقی و دریافت تحلیل هوشمند میکس، تنظیم، لودنس، استریو و EQ.",
  alternates: { canonical: "/music-analyzer" },
  openGraph: {
    type: "website",
    url: "/music-analyzer",
    title: "تحلیلگر موسیقی | آرتیست‌یار",
    description: "تحلیل هوشمند میکس، لودنس، استریو و EQ.",
  },
};

const analyzerJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "تحلیلگر موسیقی آرتیست‌یار",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  url: `${siteUrl}/music-analyzer`,
  inLanguage: "fa-IR",
  description: "تحلیل هوشمند فایل موسیقی برای میکس، لودنس، استریو و EQ.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "IRR" },
  provider: { "@type": "EducationalOrganization", name: "ArtistYar", url: siteUrl },
};

export default function MusicAnalyzerPage() {
  return (
    <main className="container-ay relative py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(analyzerJsonLd) }}
      />
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
