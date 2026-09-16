export type Course = {
  id: string;
  title: string;
  tag: string;
  summary: string;
  level: string;
  format: "digital" | "online" | "hybrid";
  priceLabel: string;
};

export const courses: Course[] = [
  {
    id: "rahyar",
    title: "راه‌یار",
    tag: "مسیر اصلی",
    summary: "مسیر جامع تولید موسیقی با تمرکز روی عمل و خروجی قابل ارائه.",
    level: "مقدماتی تا پیشرفته",
    format: "digital",
    priceLabel: "بر اساس پلن",
  },
  {
    id: "theory",
    title: "تئوری موسیقی",
    tag: "بنیان",
    summary: "درک هارمونی، ریتم و ساختار برای تصمیم‌های موسیقایی دقیق‌تر.",
    level: "مقدماتی",
    format: "digital",
    priceLabel: "بر اساس پلن",
  },
  {
    id: "arrangement",
    title: "تنظیم",
    tag: "کلاس آنلاین",
    summary: "جلسات یک‌به‌یک برای چیدمان، لایه‌بندی و شخصیت‌دادن به قطعه.",
    level: "متوسط",
    format: "online",
    priceLabel: "جلسه‌ای",
  },
  {
    id: "mixing",
    title: "میکس",
    tag: "کلاس آنلاین",
    summary: "تعادل، عمق و وضوح؛ از ایده‌ی خام تا میکس قابل پخش.",
    level: "متوسط تا پیشرفته",
    format: "online",
    priceLabel: "جلسه‌ای",
  },
  {
    id: "mastering",
    title: "مسترینگ",
    tag: "کلاس آنلاین",
    summary: "آماده‌سازی نهایی برای انتشار با استاندارد حرفه‌ای.",
    level: "پیشرفته",
    format: "online",
    priceLabel: "جلسه‌ای",
  },
  {
    id: "piano",
    title: "پیانو",
    tag: "کلاس آنلاین",
    summary: "تکنیک، بیان و کاربرد پیانو در تولید و اجرای معاصر.",
    level: "همه سطوح",
    format: "online",
    priceLabel: "جلسه‌ای",
  },
];
