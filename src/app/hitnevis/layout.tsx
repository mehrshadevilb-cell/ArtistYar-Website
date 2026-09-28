import type { Metadata } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "هیت‌نویس | همکار ترانه‌نویسی فارسی",
  description: "هیت‌نویس آرتیست‌یار برای گفت‌وگو، تکمیل ترانه و توسعه ایده‌های ترانه‌نویسی فارسی.",
  alternates: { canonical: "/hitnevis" },
  openGraph: { type: "website", url: "/hitnevis", title: "هیت‌نویس | آرتیست‌یار" },
};

const hitnevisJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "هیت‌نویس",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  url: `${siteUrl}/hitnevis`,
  inLanguage: "fa-IR",
  description: "همکار ترانه‌نویسی فارسی برای تکمیل و توسعه ایده ترانه.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "IRR" },
  provider: { "@type": "EducationalOrganization", name: "ArtistYar", url: siteUrl },
};

export default function HitNevisLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(hitnevisJsonLd) }}
      />
      {children}
    </>
  );
}
