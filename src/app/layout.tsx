import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: {
    default: "ArtistYar | آکادمی راه‌یار",
    template: "%s | ArtistYar",
  },
  description:
    "آکادمی راه‌یار؛ دوره‌های دیجیتال، کلاس آنلاین، دستیار موسیقی، تکلیف و پیگیری پیشرفت برای یادگیری تنظیم، میکس و مسترینگ.",
  applicationName: "ArtistYar",
  keywords: ["آکادمی راه‌یار", "آرتیست‌یار", "آموزش موسیقی", "تولید موسیقی", "میکس", "تنظیم", "مسترینگ", "کلاس آنلاین موسیقی"],
  authors: [{ name: "ArtistYar" }],
  creator: "ArtistYar Academy",
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: "ArtistYar",
    title: "ArtistYar | مسیر حرفه‌ای تولید موسیقی",
    description: "یادگیری تنظیم، میکس و مسترینگ با مسیر پروژه‌محور.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ArtistYar | آکادمی تولید موسیقی",
    description: "آموزش حرفه‌ای تنظیم، میکس و مسترینگ.",
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://artistyar-website.onrender.com",
  ),
};

const academyJsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "ArtistYar Academy",
  description: "آموزش تولید موسیقی، تنظیم، میکس و مسترینگ.",
  inLanguage: "fa",
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
