import type { Metadata } from "next";
import HitNevisClient from "./HitNevisClient";

export const metadata: Metadata = {
  title: "هیت‌نویس | آرتیست‌یار | ArtistYar",
  description:
    "همکار ترانه‌نویسی هوشمند — ایده، کورس، هوک، بازنویسی و نقد با لحن طبیعی فارسی.",
  openGraph: {
    title: "هیت‌نویس | ArtistYar",
    description: "ترانه‌نویسی با یک دوست باهوش.",
  },
};

export default function HitNevisPage() {
  return <HitNevisClient />;
}
