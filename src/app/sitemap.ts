import type { MetadataRoute } from "next";

const publicRoutes = ["/", "/about", "/gallery", "/courses", "/free-player", "/online", "/assistant", "/contact"];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyar.ir").replace(/\/$/, "");

  return publicRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
