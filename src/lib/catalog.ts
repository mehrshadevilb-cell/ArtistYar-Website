import type { LiveProduct } from "@/components/LiveProductCard";
import { courses as demoCourses } from "@/data/courses";

export type CatalogResult = {
  source: "rahyar" | "demo" | "error";
  items: LiveProduct[];
};

function backendBase(): string {
  return (process.env.RAHYAR_API_URL || "").replace(/\/$/, "");
}

/** Server-side catalog — cached briefly to cut TTFB under load. */
export async function getCatalog(): Promise<CatalogResult> {
  const base = backendBase();
  if (!base) {
    return {
      source: "demo",
      items: demoCourses.map((c, i) => ({
        id: i + 1,
        title: c.title,
        description: c.summary,
        price: 0,
        is_active: true,
      })),
    };
  }

  try {
    const res = await fetch(`${base}/api/v1/products`, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return { source: "error", items: [] };
    }
    const items = (await res.json()) as LiveProduct[];
    return { source: "rahyar", items: Array.isArray(items) ? items : [] };
  } catch {
    return { source: "error", items: [] };
  }
}
