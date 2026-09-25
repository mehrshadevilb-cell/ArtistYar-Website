import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "دوره‌های آموزش تنظیم، میکس و مسترینگ",
  description: "کاتالوگ دوره‌های پروژه‌محور ArtistYar برای یادگیری تنظیم، میکس، مسترینگ و تئوری موسیقی با مسیر روشن و پشتیبانی راه‌یار.",
  alternates: { canonical: "/courses" },
};

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
