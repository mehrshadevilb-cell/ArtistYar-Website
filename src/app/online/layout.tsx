import type { Metadata } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "کلاس آنلاین تولید موسیقی",
  description:
    "رزرو کلاس آنلاین با مهرشاد بنائی برای تنظیم، میکس، مسترینگ و رفع اشکال پروژه‌محور در آکادمی راه‌یار.",
  alternates: { canonical: "/online" },
  openGraph: {
    type: "website",
    url: "/online",
    title: "کلاس آنلاین تولید موسیقی | ArtistYar",
    description:
      "جلسه یک‌به‌یک آنلاین برای جلو بردن پروژه تنظیم، میکس یا مسترینگ خودت با مدرس آکادمی راه‌یار.",
  },
};

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "کلاس آنلاین تنظیم، میکس و مسترینگ",
  serviceType: "Online music production tutoring",
  url: `${siteUrl}/online`,
  inLanguage: "fa-IR",
  description:
    "کلاس آنلاین پروژه‌محور با مهرشاد بنائی برای تنظیم، میکس، مسترینگ و رفع اشکال روی کار هنرجو.",
  provider: {
    "@type": "EducationalOrganization",
    name: "ArtistYar",
    alternateName: "آکادمی راه‌یار",
    url: siteUrl,
  },
  areaServed: "IR",
  availableChannel: {
    "@type": "ServiceChannel",
    serviceUrl: `${siteUrl}/online`,
    availableLanguage: ["fa", "Persian"],
  },
};

export default function OnlineLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      {children}
    </>
  );
}
