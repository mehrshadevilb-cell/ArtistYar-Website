import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import "./design-tokens.css";
import "./globals.css";
import "./theme-music.css";
import "./responsive.css";
import "./apple-ui.css";
import "./hero-layout.css";
import "./taste-ui.css";
import "./click-fix.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import { TelegramMiniAppBridge } from "@/components/TelegramMiniAppBridge";
import { SmoothScroll } from "@/components/SmoothScroll";

// Keep HTML aligned with the current Next.js asset manifest after each deploy.
// Static JS/CSS assets remain cacheable; only the document shell must revalidate.
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    default: "ArtistYar | آکادمی راه‌یار — آموزش تنظیم، میکس و مسترینگ با AI",
    template: "%s | ArtistYar",
  },
  description:
    "آکادمی راه‌یار و ArtistYar: آموزش پروژه‌محور تنظیم، میکس و مسترینگ با کلاس آنلاین، پشتیبانی هنرجو، نمونه‌کار واقعی و دستیار هوشمند راه‌یار AI.",
  metadataBase: new URL(siteUrl),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: siteUrl,
    siteName: "ArtistYar",
    title: "ArtistYar | آکادمی راه‌یار",
    description: "آموزش تنظیم، میکس و مسترینگ با مسیر روشن و راه‌یار AI",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0a" },
    { media: "(prefers-color-scheme: light)", color: "#f7f4ec" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable} suppressHydrationWarning>
      <head>
        {backend ? <link rel="preconnect" href={backend} /> : null}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      </head>
      <body className="min-h-screen bg-ink-950 text-sand-50 antialiased">
        <ThemeProvider>
          <AuthProvider>
            <TelegramMiniAppBridge />
            <SmoothScroll />
            <div className="page-shell relative min-h-screen">
              <SiteHeader />
              <main className="page-shell">{children}</main>
              <SiteFooter />
              <FloatingAssistant />
            </div>
            <SiteAnalytics />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
