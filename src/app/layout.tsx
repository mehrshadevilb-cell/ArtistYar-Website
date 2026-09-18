import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import "./theme-music.css";
import "./responsive.css";
import "./apple-ui.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import { TelegramMiniAppBridge } from "@/components/TelegramMiniAppBridge";
import { SmoothScroll } from "@/components/SmoothScroll";

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
    siteName: "ArtistYar",
    title: "ArtistYar | آموزش تنظیم، میکس و مسترینگ + راه‌یار AI",
    description:
      "مسیر پروژه‌محور یادگیری تنظیم، میکس، مسترینگ و تولید موسیقی — با دستیار هوشمند راه‌یار که از لحظه ورود کنارت است.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "ArtistYar | آموزش تنظیم، میکس و مسترینگ + راه‌یار AI",
    description: "دوره‌ها، کلاس آنلاین، نمونه‌کار و دستیار هوشمند موسیقی راه‌یار.",
  },
  metadataBase: new URL(siteUrl),
  other: {
    "ai-content-declaration":
      "This site offers an educational AI assistant specialized in music production (mix, master, arrangement).",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0a" },
    { media: "(prefers-color-scheme: light)", color: "#f7f1e8" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

const academyJsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "ArtistYar Academy",
  alternateName: ["آکادمی راه‌یار", "آرتیست‌یار"],
  description:
    "آموزش تولید موسیقی، تنظیم، میکس و مسترینگ با کلاس آنلاین، دوره‌های دیجیتال و دستیار هوشمند راه‌یار AI.",
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
  knowsAbout: [
    "تنظیم موسیقی",
    "میکس موسیقی",
    "مسترینگ موسیقی",
    "تئوری موسیقی",
    "تولید موسیقی الکترونیک",
    "دستیار هوش مصنوعی آموزشی",
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "مسیرهای آموزشی ArtistYar",
    itemListElement: [
      { "@type": "Offer", name: "دوره جامع تنظیم، میکس و مسترینگ", url: `${siteUrl}/courses` },
      { "@type": "Offer", name: "دوره تئوری موسیقی", url: `${siteUrl}/courses` },
      { "@type": "Offer", name: "کلاس آنلاین تولید موسیقی", url: `${siteUrl}/online` },
      { "@type": "Offer", name: "دستیار راه‌یار AI", url: `${siteUrl}/assistant` },
    ],
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ArtistYar | آکادمی راه‌یار",
  url: siteUrl,
  inLanguage: "fa-IR",
  publisher: { "@type": "EducationalOrganization", name: "ArtistYar Academy", url: siteUrl },
  potentialAction: {
    "@type": "SearchAction",
    target: `${siteUrl}/courses?search={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "راه‌یار AI",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "IRR" },
  description:
    "دستیار هوشمند آموزشی برای عیب‌یابی میکس و مسترینگ، توضیح مفاهیم موسیقی و راهنمای مسیر یادگیری در آکادمی راه‌یار.",
  url: `${siteUrl}/assistant`,
  inLanguage: "fa",
};

const themeInitScript = `
(function(){
  try {
    var k = 'artistyar-theme';
    var t = localStorage.getItem(k);
    if (t !== 'light' && t !== 'dark') {
      t = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.classList.add(t);
    document.documentElement.style.colorScheme = t;
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} dark`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script src="https://telegram.org/js/telegram-web-app.js" async />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(academyJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
        />
        {backend ? (
          <>
            <link rel="dns-prefetch" href={backend} />
            <link rel="preconnect" href={backend} crossOrigin="anonymous" />
          </>
        ) : null}
      </head>
      <body className="font-sans antialiased">
        <SmoothScroll />
        <ThemeProvider>
          <AuthProvider>
            <TelegramMiniAppBridge />
            <SiteAnalytics />
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
