import type { LiveProduct } from "@/components/LiveProductCard";
import { courses as demoCourses } from "@/data/courses";

export type CatalogResult = {
  source: "rahyar" | "demo" | "error";
  items: LiveProduct[];
};

function backendBase(): string {
  return (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(/\/$/, "");
}

const packageFallbacks: LiveProduct[] = [
  {
    id: 0,
    title: "آرتیست‌یار",
    description: "ضبط و ادیت حرفه‌ای با موبایل یا میکروفون استودیویی؛ شامل بی‌کلام کردن موزیک، کوک وکال، اصلاح تایمینگ و خروجی باکیفیت برای تولید محتوا.",
    price: 1500000,
    is_active: false,
    delivery_type: "telegram",
  },
  {
    id: 0,
    title: "راه‌یار",
    description: "تنها مسیر یادگیری اصولی تنظیم، میکس و مسترینگ از پایه تا سطح حرفه‌ای؛ با تمرکز روی تحلیل موسیقی، تصمیم‌گیری و اجرای پروژه واقعی.",
    price: 25000000,
    is_active: false,
    delivery_type: "spotplayer",
  },
  {
    id: 0,
    title: "راه‌یار پرو",
    description: "مسیر تخصصی‌تر برای تحلیل پروژه، تصمیم‌گیری حرفه‌ای در تنظیم، میکس و مسترینگ و حل مسئله روی پروژه‌های واقعی.",
    price: 0,
    is_active: false,
    delivery_type: "spotplayer",
  },
  {
    id: 0,
    title: "تئوری موسیقی",
    description: "نت، ریتم، فواصل، گام‌ها، آکوردها، هارمونی، ریف، آرپژ و تربیت شنوایی برای ساخت و تحلیل موسیقی.",
    price: 380000,
    is_active: false,
    delivery_type: "spotplayer",
  },
];

function fallbackCatalog(): LiveProduct[] {
  return [
    ...packageFallbacks,
    ...demoCourses
      .filter((course) => !packageFallbacks.some((item) => item.title.replace(/‌/g, "") === course.title.replace(/‌/g, "")))
      .map((c, i) => ({
        id: -(i + 1),
        title: c.title,
        description: c.summary,
        price: 0,
        is_active: false,
      })),
  ];
}

function mergePackages(items: LiveProduct[]): LiveProduct[] {
  const normalized = new Set(items.map((item) => item.title.replace(/‌/g, "").trim()));
  const missing = packageFallbacks.filter((fallback) => !normalized.has(fallback.title.replace(/‌/g, "").trim()));
  return [...items, ...missing];
}

/** Server-side catalog — cached briefly to cut TTFB under load. */
export async function getCatalog(): Promise<CatalogResult> {
  const base = backendBase();

  if (!base) {
    return { source: "demo", items: fallbackCatalog() };
  }

  try {
    const res = await fetch(`${base}/api/v1/products`, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return { source: "error", items: fallbackCatalog() };
    }

    const data = await res.json();
    const items = Array.isArray(data) ? (data as LiveProduct[]) : [];
    return { source: "rahyar", items: mergePackages(items) };
  } catch {
    return { source: "error", items: fallbackCatalog() };
  }
}
