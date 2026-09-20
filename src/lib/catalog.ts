import type { LiveProduct } from "@/components/LiveProductCard";
import { courses as demoCourses } from "@/data/courses";

export type CatalogResult = {
  source: "rahyar" | "demo" | "error";
  items: LiveProduct[];
};

const STORAGE =
  "https://ejfgbiyfqjlqddbxvqhk.supabase.co/storage/v1/object/public/artistyar-media";

/** Cover images stored in Supabase public bucket */
const PACKAGE_COVERS: Record<string, string> = {
  "راه‌یار": `${STORAGE}/RahYar%20Package.JPEG`,
  "راهیار": `${STORAGE}/RahYar%20Package.JPEG`,
  "راه‌یار پرو": `${STORAGE}/RahYarPro%20Package.PNG`,
  "راهیار پرو": `${STORAGE}/RahYarPro%20Package.PNG`,
  "تئوری موسیقی": `${STORAGE}/Theory%20Package.PNG`,
  "آرتیست‌یار": `${STORAGE}/ArtistYar%20Package.JPG`,
  "آرتیستیار": `${STORAGE}/ArtistYar%20Package.JPG`,
  "پکیج کامل راه‌یار": `${STORAGE}/RahYar%20Package.JPEG`,
  "پکیج کامل راهیار": `${STORAGE}/RahYar%20Package.JPEG`,
};

function normalizeTitle(title: string) {
  return title.replace(/‌/g, "").replace(/\s+/g, " ").trim();
}

function coverFor(title: string): string | null {
  const key = normalizeTitle(title);
  for (const [name, url] of Object.entries(PACKAGE_COVERS)) {
    if (normalizeTitle(name) === key || key.includes(normalizeTitle(name))) return url;
  }
  return null;
}

function withCover(product: LiveProduct): LiveProduct {
  if (product.thumbnail) return product;
  const cover = coverFor(product.title);
  return cover ? { ...product, thumbnail: cover } : product;
}

function backendBase(): string {
  return (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(
    /\/$/,
    "",
  );
}

const packageFallbacks: LiveProduct[] = [
  {
    id: -1,
    title: "آرتیست‌یار",
    description:
      "ضبط و ادیت حرفه‌ای با موبایل یا میکروفون استودیویی؛ شامل بی‌کلام کردن موزیک، کوک وکال، اصلاح تایمینگ و خروجی باکیفیت برای تولید محتوا.",
    price: 1500000,
    is_active: false,
    delivery_type: "telegram",
    thumbnail: PACKAGE_COVERS["آرتیست‌یار"],
  },
  {
    id: -2,
    title: "راه‌یار",
    description:
      "تنها مسیر یادگیری اصولی تنظیم، میکس و مسترینگ از پایه تا سطح حرفه‌ای؛ با تمرکز روی تحلیل موسیقی، تصمیم‌گیری و اجرای پروژه واقعی.",
    price: 25000000,
    is_active: false,
    delivery_type: "spotplayer",
    thumbnail: PACKAGE_COVERS["راه‌یار"],
  },
  {
    id: -3,
    title: "راه‌یار پرو",
    description:
      "مسیر تخصصی‌تر برای تحلیل پروژه، تصمیم‌گیری حرفه‌ای در تنظیم، میکس و مسترینگ و حل مسئله روی پروژه‌های واقعی.",
    price: 0,
    is_active: false,
    delivery_type: "spotplayer",
    thumbnail: PACKAGE_COVERS["راه‌یار پرو"],
  },
  {
    id: -4,
    title: "تئوری موسیقی",
    description: "نت، ریتم، فواصل، گام‌ها، آکوردها، هارمونی، ریف، آرپژ و تربیت شنوایی برای ساخت و تحلیل موسیقی.",
    price: 380000,
    is_active: false,
    delivery_type: "spotplayer",
    thumbnail: PACKAGE_COVERS["تئوری موسیقی"],
  },
];

function fallbackCatalog(): LiveProduct[] {
  return [
    ...packageFallbacks,
    ...demoCourses
      .filter((course) => !packageFallbacks.some((item) => normalizeTitle(item.title) === normalizeTitle(course.title)))
      .map((c, i) =>
        withCover({
          id: -(100 + i),
          title: c.title,
          description: c.summary,
          price: 0,
          is_active: false,
        }),
      ),
  ].map(withCover);
}

function mergePackages(items: LiveProduct[]): LiveProduct[] {
  const normalized = new Set(items.map((item) => normalizeTitle(item.title)));
  const missing = packageFallbacks.filter((fallback) => !normalized.has(normalizeTitle(fallback.title)));
  return [...items, ...missing].map(withCover);
}

/** Server-side catalog — cached briefly to cut TTFB under load. */
export async function getCatalog(): Promise<CatalogResult> {
  const base = backendBase();

  if (!base) {
    return { source: "demo", items: fallbackCatalog() };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(`${base}/api/v1/products`, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!res.ok) {
      return { source: "error", items: fallbackCatalog() };
    }

    const data = await res.json();
    const items = Array.isArray(data) ? (data as LiveProduct[]) : [];
    return { source: "rahyar", items: mergePackages(items) };
  } catch {
    return { source: "error", items: fallbackCatalog() };
  } finally {
    clearTimeout(timeout);
  }
}
