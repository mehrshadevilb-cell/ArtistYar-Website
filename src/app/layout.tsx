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
    default: "آرتیست‌یار | آموزش حرفه‌ای موسیقی",
    template: "%s | آرتیست‌یار",
  },
  description:
    "آکادمی آرتیست‌یار — دوره‌های تخصصی، کلاس آنلاین، پشتیبانی و مسیر یادگیری موسیقی از صفر تا حرفه‌ای.",
  applicationName: "ArtistYar",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://artistyar-website.onrender.com",
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <head>
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
            <div className="relative z-10 flex min-h-screen flex-col">
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
