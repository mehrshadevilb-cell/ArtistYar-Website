import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "پلیر آموزش‌های رایگان",
  description: "آموزش‌های رایگان و کوتاه ArtistYar برای یادگیری تنظیم، میکس و مسترینگ.",
  alternates: { canonical: "/free-player" },
  openGraph: {
    title: "پلیر آموزش‌های رایگان | ArtistYar",
    description: "آموزش‌های رایگان و کاربردی تولید موسیقی را با پلیر ArtistYar دنبال کن.",
    type: "website",
  },
};

export default function FreePlayerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
