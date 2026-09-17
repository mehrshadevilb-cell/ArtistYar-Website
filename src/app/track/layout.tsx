import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "پیگیری سفارش و وضعیت پرداخت",
  description: "وضعیت سفارش و پرداخت دوره‌ها و کلاس‌های آکادمی راه‌یار را با شناسه پرداخت پیگیری کن.",
  alternates: { canonical: "/track" },
  openGraph: {
    type: "website",
    url: "/track",
    title: "پیگیری سفارش | ArtistYar",
    description: "پیگیری وضعیت سفارش و پرداخت در آکادمی راه‌یار.",
  },
};

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
