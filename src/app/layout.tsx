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
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import { TelegramMiniAppBridge } from "@/components/TelegramMiniAppBridge";
import { SmoothScroll } from "@/components/SmoothScroll";

// Public marketing pages can be cached; API routes stay dynamic on their own.
export const revalidate = 60;

const vazir = Vazirmatn({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-vazir",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://artistyaar.ir"),
  title: {
    default: "آرتیست‌یار | آموزش تنظیم، میکس و مسترینگ",
    template: "%s | آرتیست‌یار",
  },
  description:
    "پلتفرم آموزش تولید موسیقی: تنظیم، میکس، مسترینگ، تحلیل AI و تمرین شنیداری.",
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: "https://artistyaar.ir",
    siteName: "آرتیست‌یار",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0a" },
    { media: "(prefers-color-scheme: light)", color: "#f7f4ec" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" className={`${vazir.variable} dark`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('artistyar-theme');if(t==='light'){document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');document.documentElement.style.colorScheme='light';}else{document.documentElement.classList.add('dark');document.documentElement.classList.remove('light');document.documentElement.style.colorScheme='dark';}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-ink-950 text-sand-50 antialiased">
        <TelegramMiniAppBridge />
        <SmoothScroll />
        <AuthProvider>
          <ThemeProvider>
            <SiteHeader />
            <main className="relative min-h-[70vh]">{children}</main>
            <SiteFooter />
            <FloatingAssistant />
            <SiteAnalytics />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
