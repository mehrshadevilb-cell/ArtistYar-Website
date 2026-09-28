import type { Metadata } from "next";
import { MusicGeneratorClient } from "./MusicGeneratorClient";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "تولید موسیقی با هوش مصنوعی | آرتیست‌یار",
  description:
    "ریف، بیس‌لاین، ملودی، فیل درام و قطعات موسیقی حرفه‌ای را با زبان طبیعی درخواست کنید — مخصوص نوازندگان و تهیه‌کنندگان.",
  alternates: { canonical: "/ai-music" },
  openGraph: {
    type: "website",
    url: "/ai-music",
    title: "تولید موسیقی با AI | آرتیست‌یار",
    description: "ساخت ریف، بیس‌لاین، ملودی و المان‌های موسیقی با زبان طبیعی.",
  },
};

const generatorJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "تولید موسیقی با AI · آرتیست‌یار",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  url: `${siteUrl}/ai-music`,
  inLanguage: "fa-IR",
  description: "ابزار تولید المان‌های موسیقی (ریف، بیس، ملودی) با زبان طبیعی برای تهیه‌کنندگان.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "IRR" },
  provider: { "@type": "EducationalOrganization", name: "ArtistYar", url: siteUrl },
};

export default function AiMusicPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--fg)]" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generatorJsonLd) }}
      />
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
