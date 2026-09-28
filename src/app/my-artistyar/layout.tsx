import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "داشبورد هنرجو",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function MyArtistYarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
