/** Default homepage section config — admin can override via site_settings.homepage_v1 */

export type HomeSectionId =
  | "hero"
  | "capabilities"
  | "learn"
  | "tools"
  | "studio"
  | "works"
  | "feedback"
  | "community"
  | "consultation";

export type HomeSectionConfig = {
  id: HomeSectionId;
  visible: boolean;
  order: number;
  eyebrow: string;
  title: string;
  subtitle: string;
};

export type HomepageConfig = {
  version: 1;
  sections: HomeSectionConfig[];
  proofItems: { label: string; detail: string }[];
};

export const DEFAULT_HOMEPAGE: HomepageConfig = {
  version: 1,
  proofItems: [
    { label: "آموزش", detail: "پکیج و کلاس ساختاریافته" },
    { label: "تمرین", detail: "Arcade با XP و پیشرفت" },
    { label: "ابزار", detail: "تحلیل · AI · استودیو" },
    { label: "پشتیبانی", detail: "راه‌یار تا نتیجه" },
  ],
  sections: [
    {
      id: "hero",
      visible: true,
      order: 10,
      eyebrow: "",
      title: "تنظیم، میکس و مسترینگ با مسیر روشن",
      subtitle: "آکادمی راه‌یار و ArtistYar — آموزش پروژه‌محور، تمرین، ابزار و پشتیبانی هوشمند.",
    },
    {
      id: "capabilities",
      visible: true,
      order: 20,
      eyebrow: "/ چه کاری می‌توانی بکنی",
      title: "چهار ستون اصلی",
      subtitle: "آموزش، تمرین، ابزار و پشتیبانی — هرکدام نقش مشخص دارند.",
    },
    {
      id: "learn",
      visible: true,
      order: 30,
      eyebrow: "پکیج‌های آموزشی",
      title: "یاد بگیر",
      subtitle: "هر پکیج یک مسیر مستقل است؛ همان را انتخاب کن که به سطح و هدف تو می‌خورد.",
    },
    {
      id: "tools",
      visible: true,
      order: 40,
      eyebrow: "/ ابزارها",
      title: "تمرین، AI و تحلیل",
      subtitle: "تمرین شنیداری، دستیار راه‌یار، تحلیل میکس و تولید ایده — بدون تکرار مسیر آموزش.",
    },
    {
      id: "studio",
      visible: true,
      order: 50,
      eyebrow: "/ خدمات استودیو",
      title: "سفارش حرفه‌ای",
      subtitle: "تنظیم، میکس و مسترینگ برای پروژهٔ واقعی.",
    },
    {
      id: "works",
      visible: true,
      order: 60,
      eyebrow: "/ نمونه‌کار",
      title: "خروجی هنرجوها",
      subtitle: "",
    },
    {
      id: "feedback",
      visible: true,
      order: 70,
      eyebrow: "/ بازخورد",
      title: "صدای هنرجو",
      subtitle: "",
    },
    {
      id: "community",
      visible: true,
      order: 80,
      eyebrow: "/ همراهی",
      title: "بیرون از سایت هم همراهت هستیم",
      subtitle: "کانال پلاگین، گروه پرسش‌وپاسخ و اینستاگرام رسمی مدرس.",
    },
    {
      id: "consultation",
      visible: true,
      order: 90,
      eyebrow: "/ شروع",
      title: "مشاوره رایگان",
      subtitle: "",
    },
  ],
};

export function mergeHomepageConfig(raw: unknown): HomepageConfig {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_HOMEPAGE);
  const input = raw as Partial<HomepageConfig>;
  const byId = new Map(
    (Array.isArray(input.sections) ? input.sections : []).map((s) => [s.id, s]),
  );
  const sections = DEFAULT_HOMEPAGE.sections.map((def) => {
    const over = byId.get(def.id);
    if (!over) return { ...def };
    return {
      ...def,
      visible: typeof over.visible === "boolean" ? over.visible : def.visible,
      order: typeof over.order === "number" ? over.order : def.order,
      eyebrow: typeof over.eyebrow === "string" ? over.eyebrow : def.eyebrow,
      title: typeof over.title === "string" ? over.title : def.title,
      subtitle: typeof over.subtitle === "string" ? over.subtitle : def.subtitle,
    };
  });
  sections.sort((a, b) => a.order - b.order);
  const proofItems =
    Array.isArray(input.proofItems) && input.proofItems.length > 0
      ? input.proofItems
          .filter((p) => p && typeof p.label === "string")
          .map((p) => ({
            label: String(p.label).slice(0, 40),
            detail: String(p.detail || "").slice(0, 80),
          }))
      : DEFAULT_HOMEPAGE.proofItems;
  return { version: 1, sections, proofItems };
}

export function sectionMap(config: HomepageConfig) {
  return Object.fromEntries(config.sections.map((s) => [s.id, s])) as Record<
    HomeSectionId,
    HomeSectionConfig
  >;
}
