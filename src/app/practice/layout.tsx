import type { Metadata } from "next";
import "@/styles/practice-shell.css";

export const metadata: Metadata = {
  title: "تمرین‌خانه تولید موسیقی | آرتیست‌یار",
  description: "تمرین‌های کوتاه و تعاملی برای تقویت گوش و میکس.",
  alternates: { canonical: "/practice" },
  robots: { index: false, follow: false },
};

export default function PracticeLayout({ children }: { children: React.ReactNode }) {
  return <div className="practice-root" dir="rtl">{children}</div>;
}
