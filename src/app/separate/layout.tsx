import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "جداسازی وکال و استم آنلاین | ArtistYar",
  description: "تفکیک وکال، بی‌کلام و استم‌های موسیقی در مرورگر با پردازش روی دستگاه.",
  alternates: { canonical: "/separate" },
  openGraph: { type: "website", url: "/separate", title: "جداسازی وکال و Stem | ArtistYar" },
};

export default function SeparateLayout({ children }: { children: React.ReactNode }) { return children; }
