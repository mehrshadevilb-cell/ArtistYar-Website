import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "هیت‌نویس | همکار ترانه‌نویسی فارسی",
  description: "هیت‌نویس آرتیست‌یار برای گفت‌وگو، تکمیل ترانه و توسعه ایده‌های ترانه‌نویسی فارسی.",
  alternates: { canonical: "/hitnevis" },
  openGraph: { type: "website", url: "/hitnevis", title: "هیت‌نویس | آرتیست‌یار" },
};

export default function HitNevisLayout({ children }: { children: React.ReactNode }) { return children; }
