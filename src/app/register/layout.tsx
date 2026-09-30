import type { Metadata } from "next";

/** Auth surface — intentionally non-indexable (matches robots.txt + login/my-artistyar). */
export const metadata: Metadata = {
  title: "ثبت‌نام هنرجو",
  description: "ثبت‌نام هنرجو در آرتیست‌یار",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
