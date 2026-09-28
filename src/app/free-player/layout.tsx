import type { Metadata } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "پلیر آموزش‌های رایگان",
  description:
    "آموزش‌های رایگان و کوتاه ArtistYar برای یادگیری تنظیم، میکس و مسترینگ — درس‌های کاربردی با پلیر داخلی.",
  keywords: [
    "آموزش رایگان میکس",
    "آموزش رایگان مسترینگ",
    "آموزش رایگان تنظیم",
    "درس رایگان تولید موسیقی",
    "ArtistYar free lessons",
  ],
  alternates: { canonical: "/free-player" },
  openGraph: {
    title: "پلیر آموزش‌های رایگان | ArtistYar",
    description: "آموزش‌های رایگان و کاربردی تولید موسیقی را با پلیر ArtistYar دنبال کن.",
    type: "website",
    url: "/free-player",
  },
};

const freeLessonsJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "آموزش‌های رایگان تنظیم، میکس و مسترینگ",
  url: `${siteUrl}/free-player`,
  inLanguage: "fa-IR",
  description:
    "مجموعه درس‌های رایگان و کوتاه آرتیست‌یار برای شروع و تقویت مهارت تنظیم، میکس و مسترینگ.",
  isPartOf: {
    "@type": "WebSite",
    name: "ArtistYar",
    url: siteUrl,
  },
  about: {
    "@type": "Thing",
    name: "آموزش تولید موسیقی",
  },
  provider: {
    "@type": "EducationalOrganization",
    name: "ArtistYar",
    url: siteUrl,
  },
};

export default function FreePlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(freeLessonsJsonLd) }}
      />
      {children}
    </>
  );
}
