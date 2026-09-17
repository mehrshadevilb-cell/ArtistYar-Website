import type { MetadataRoute } from "next";

const publicRoutes: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "daily" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/assistant", priority: 0.95, changeFrequency: "weekly" },
  { path: "/courses", priority: 0.9, changeFrequency: "weekly" },
  { path: "/amoozesh-tanzim-mix-mastering", priority: 0.95, changeFrequency: "weekly" },
  { path: "/free-player", priority: 0.9, changeFrequency: "monthly" },
  { path: "/online", priority: 0.85, changeFrequency: "monthly" },
  { path: "/gallery", priority: 0.8, changeFrequency: "weekly" },
  { path: "/about", priority: 0.75, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.7, changeFrequency: "monthly" },
  { path: "/track", priority: 0.5, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(/\/$/, "");
  const lastModified = new Date();

  return publicRoutes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
