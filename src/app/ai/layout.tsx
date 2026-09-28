import type { Metadata } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "فضای AI آرتیست‌یار | تحلیل و تولید موسیقی",
  description: "ورودی واحد ابزارهای هوش مصنوعی آرتیست‌یار برای گفت‌وگو، تحلیل موسیقی و تولید ایده.",
  alternates: { canonical: "/ai" },
  openGraph: { type: "website", url: "/ai", title: "AI آرتیست‌یار | تحلیل و تولید موسیقی" },
};

const aiHubJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "فضای AI آرتیست‌یار",
  url: `${siteUrl}/ai`,
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  inLanguage: "fa-IR",
  description: "مرکز ابزارهای هوش مصنوعی آرتیست‌یار برای تحلیل موسیقی، تولید ایده و گفت‌وگوی آموزشی.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "IRR" },
  provider: { "@type": "EducationalOrganization", name: "ArtistYar", url: siteUrl },
};

export default function AILayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aiHubJsonLd) }}
      />
      {children}
    </>
  );
}
