import type { Metadata } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "جداسازی وکال و استم آنلاین | ArtistYar",
  description: "تفکیک وکال، بی‌کلام و استم‌های موسیقی در مرورگر با پردازش روی دستگاه.",
  alternates: { canonical: "/separate" },
  openGraph: { type: "website", url: "/separate", title: "جداسازی وکال و Stem | ArtistYar" },
};

const separateJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "جداسازی وکال و Stem",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  url: `${siteUrl}/separate`,
  inLanguage: "fa-IR",
  description: "جداسازی وکال و استم‌های موسیقی در مرورگر با پردازش سمت کلاینت.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "IRR" },
  provider: { "@type": "EducationalOrganization", name: "ArtistYar", url: siteUrl },
};

export default function SeparateLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(separateJsonLd) }}
      />
      {children}
    </>
  );
}
