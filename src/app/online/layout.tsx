import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "کلاس آنلاین تولید موسیقی",
  description: "رزرو کلاس آنلاین با مهرشاد بنائی برای تنظیم، میکس، مسترینگ و رفع اشکال پروژه‌محور در آکادمی راه‌یار.",
  alternates: { canonical: "/online" },
};

export default function OnlineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
