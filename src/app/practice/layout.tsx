import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "تمرین‌خانه تولید موسیقی | آرتیست‌یار",
  description: "تمرین‌های کوتاه و تعاملی برای تقویت گوش، میکس، تنظیم و تصمیم‌های حرفه‌ای تولید موسیقی.",
  alternates: { canonical: "/practice" },
};

export default function PracticeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
