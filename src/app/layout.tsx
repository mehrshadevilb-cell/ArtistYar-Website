import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "آرتیست‌یار | آموزش حرفه‌ای موسیقی",
    template: "%s | آرتیست‌یار",
  },
  description:
    "آکادمی آرتیست‌یار — دوره‌های تخصصی، کلاس آنلاین، پشتیبانی و مسیر یادگیری موسیقی از صفر تا حرفه‌ای.",
  applicationName: "ArtistYar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="font-sans antialiased">
        <AuthProvider>
          <div className="relative min-h-screen overflow-x-hidden bg-ink-950 text-sand-100">
            <div className="pointer-events-none absolute inset-0 bg-radial-fade" />
            <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid opacity-40" />
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
