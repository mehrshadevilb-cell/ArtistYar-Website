import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ArtistYar | آکادمی راه‌یار",
    short_name: "ArtistYar",
    description: "مسیر پروژه‌محور برای یادگیری تنظیم، میکس و مسترینگ.",
    lang: "fa",
    dir: "rtl",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b0a",
    theme_color: "#0b0b0a",
  };
}

