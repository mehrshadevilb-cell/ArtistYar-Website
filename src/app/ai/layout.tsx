import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "فضای AI آرتیست‌یار | تحلیل و تولید موسیقی",
  description: "ورودی واحد ابزارهای هوش مصنوعی آرتیست‌یار برای گفت‌وگو، تحلیل موسیقی و تولید ایده.",
  alternates: { canonical: "/ai" },
  openGraph: { type: "website", url: "/ai", title: "AI آرتیست‌یار | تحلیل و تولید موسیقی" },
};

export default function AILayout({ children }: { children: React.ReactNode }) { return children; }
