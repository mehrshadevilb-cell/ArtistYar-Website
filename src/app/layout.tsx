import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import "./design-tokens.css";
import "./globals.css";
import "./theme-music.css";
import "./responsive.css";
import "./apple-ui.css";
import "./assistant-motion.css";
import "./site-motion.css";
import "./hero-layout.css";
import "./taste-ui.css";
import "./light-mode-fix.css";
import "./click-fix.css";
import "./scroll-motion.css";
import "./sonic-progress.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import { TelegramMiniAppBridge } from "@/components/TelegramMiniAppBridge";
import { SmoothScroll } from "@/components/SmoothScroll";
import { SonicProgress } from "@/components/SonicProgress";

// Public marketing pages can be cached; API routes stay dynamic on their own.
export const revalidate = 60;

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
  other: { enamad: "43325481" },
  title: {
    default: "آرتیست‌یار | آموزش تنظیم، میکس و مسترینگ + راه‌یار AI",
    template: "%s | ArtistYar",
  },
  description:
    "آکادمی راه‌یار و ArtistYar: آموزش پروژه‌محور تنظیم، میکس و مسترینگ با کلاس آنلاین، پشتیبانی هنرجو، گالری نمونه‌کار و دستیار هوشمند راه‌یار AI. مسیر روشن یادگیری تولید موسیقی با مهرشاد بنائی.",
  applicationName: "ArtistYar",
  alternates: { canonical: siteUrl },
  category: "education",
  classification: "Music education academy with AI assistant",
  referrer: "origin-when-cross-origin",
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
    "دستیار هوش مصنوعی موسیقی",
    "راه‌یار AI",
    "عیب‌یابی میکس",
    "نمونه کار میکس",
    "آموزش تقویت شنوایی",
  ],
  authors: [{ name: "مهرشاد بنائی", url: "https://www.instagram.com/prodbymehrshad/" }],
  creator: "مهرشاد بنائی · ArtistYar Academy",
  publisher: "ArtistYar Academy",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: siteUrl,
    siteName: "ArtistYar",
    title: "آموزش تنظیم، میکس و مسترینگ + راه‌یار AI | ArtistYar",
    description:
      "آموزش پروژه‌محور تنظیم، میکس و مسترینگ با کلاس آنلاین، پشتیبانی هنرجو و راه‌یار AI.",
    images: [{ url: `${siteUrl}/og-default.png`, width: 1200, height: 630, alt: "ArtistYar" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ArtistYar | آکادمی راه‌یار",
    description: "آموزش تنظیم، میکس و مسترینگ با راه‌یار AI",
  },
  metadataBase: new URL(siteUrl),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0a" },
    { media: "(prefers-color-scheme: light)", color: "#f4f1ea" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable} suppressHydrationWarning>
      <head>
        <meta name="enamad" content="43325481" />
        {backend ? <link rel="preconnect" href={backend} crossOrigin="anonymous" /> : null}
        {/* Kavenegar Web Push SDK */}
        <script
          src="https://cdn.kavenegar.com/sdk/page.js?appId=5b6c18c0-c2d6-47c0-ae2f-3fddcf7f499e"
          defer
          charSet="utf-8"
        />
      </head>
      <body className="font-sans antialiased">
        <SmoothScroll />
        <ThemeProvider>
          <AuthProvider>
            <TelegramMiniAppBridge />
            <SiteAnalytics />
            <SonicProgress />
            <div className="site-root relative min-h-screen overflow-x-hidden">
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
                <FloatingAssistant />
              </div>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
