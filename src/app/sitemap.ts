import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/catalog";

const publicRoutes: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "daily" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/assistant", priority: 0.95, changeFrequency: "weekly" },
  { path: "/ai", priority: 0.9, changeFrequency: "weekly" },
  { path: "/ai-music", priority: 0.88, changeFrequency: "weekly" },
  { path: "/music-analyzer", priority: 0.88, changeFrequency: "weekly" },
  { path: "/courses", priority: 0.9, changeFrequency: "weekly" },
  { path: "/amoozesh-tanzim-mix-mastering", priority: 0.98, changeFrequency: "weekly" },
  { path: "/free-player", priority: 0.9, changeFrequency: "monthly" },
  { path: "/practice", priority: 0.88, changeFrequency: "weekly" },
  { path: "/online", priority: 0.85, changeFrequency: "monthly" },
  { path: "/arrangement", priority: 0.82, changeFrequency: "monthly" },
  { path: "/studio", priority: 0.82, changeFrequency: "monthly" },
  { path: "/separate", priority: 0.78, changeFrequency: "monthly" },
  { path: "/hitnevis", priority: 0.8, changeFrequency: "weekly" },
  { path: "/gallery", priority: 0.8, changeFrequency: "weekly" },
  { path: "/plugins", priority: 0.82, changeFrequency: "daily" },
  { path: "/about", priority: 0.75, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.7, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.72, changeFrequency: "monthly" },
];

function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/‌/g, "")
    .replace(/[^\u0600-\u06FF\u0660-\u0669a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(/\/$/, "");
  const lastModified = new Date();
  const catalog = await getCatalog();
  const packageRoutes = catalog.items.map((item) => ({
    url: `${baseUrl}/courses/${slugify(item.title)}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.92,
  }));

  return [
    ...publicRoutes.map((route) => ({
      url: `${baseUrl}${route.path}`,
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...packageRoutes,
  ];
}
