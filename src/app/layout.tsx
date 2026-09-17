import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const vazirmatn = Vazirmatn({
  subsets: ["arabic"],
  weight: ["400", "500", "600"],
  variable: "--font-vazirmatn",
  display: "swap",
  preload: true,
});

const backend = (process.env.RAHYAR_API_URL || "").replace(/\/$/, "");
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(/\/$/, "");

export const metadata: Metadata = {
  title: {
    default: "ArtistYar | آکادمی راه‌یار",
    template: "%s | ArtistYar",
  },
  description:
    "ArtistYar و آکادمی راه‌یار؛ آموزش پروژه‌محور تنظیم، میکس و مسترینگ، تئوری موسیقی و پیانو با کلاس آنلاین، پشتیبانی هنرجو و گالری نمونه‌کار.",
  applicationName: "ArtistYar",
  keywords: [
    "آکادمی راه‌یار",
    "آرتیست‌یار",
    "مهرشاد بنائی",
    "آموزش تنظیم",
    "آموزش میکس",
    "آموزش مسترینگ",
    "تولید موسیقی",
    "میکس و مسترینگ",
    "کلاس آنلاین موسیقی",
    "نمونه کار میکس",
    "نمونه کار تنظیم",
    "آموزش تقویت شنوایی",
  ],
  authors: [{ name: "مهرشاد بنائی", url: "https://www.instagram.com/prodbymehrshad/" }],
  creator: "مهرشاد بنائی · ArtistYar Academy",
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: "ArtistYar",
    title: "ArtistYar | آموزش تنظیم، میکس و مسترینگ | آکادمی راه‌یار",
    description: "مسیر پروژه‌محور یادگیری تنظیم، میکس، مسترینگ و تولید موسیقی با مهرشاد بنائی.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "ArtistYar | آموزش تنظیم، میکس و مسترینگ",
    description: "دوره‌ها، کلاس آنلاین، نمونه‌کار صوتی و ویدیوهای آموزشی راه‌یار.",
  },
  metadataBase: new URL(siteUrl),
};

export const viewport: Viewport = {
  themeColor: "#0b0b0a",
};

const academyJsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "ArtistYar Academy",
  description: "آموزش تولید موسیقی، تنظیم، میکس و مسترینگ.",
  inLanguage: "fa",
  url: siteUrl,
  sameAs: [
    "https://www.instagram.com/prodbymehrshad/",
    "https://t.me/+ZY_tAu75ccs2ZmU0",
  ],
  founder: {
    "@type": "Person",
    name: "مهرشاد بنائی",
    sameAs: "https://www.instagram.com/prodbymehrshad/",
    jobTitle: "مدرس تنظیم، میکس و مسترینگ",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(academyJsonLd) }}
        />
        {backend ? (
          <>
            <link rel="dns-prefetch" href={backend} />
            <link rel="preconnect" href={backend} crossOrigin="anonymous" />
          </>
        ) : null}
      </head>
      <body className="font-sans antialiased">
        <AuthProvider>
          <div className="relative min-h-screen overflow-x-hidden bg-ink-950 text-sand-100">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-radial-fade" />
            <div className="route-ambient route-ambient-one" aria-hidden="true" />
            <div className="route-ambient route-ambient-two" aria-hidden="true" />
            <div className="relative z-10 flex min-h-screen flex-col">
              <a href="#main-content" className="skip-link">
                رفتن به محتوای اصلی
              </a>
              <SiteHeader />
              <main id="main-content" className="page-shell flex-1">
                {children}
              </main>
              <SiteFooter />
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
