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
    summary: "مسیر جامع برای اینکه تنظیم، میکس و مسترینگ را اصولی یاد بگیری و روی پروژه خودت اجرا کنی.",
    level: "مقدماتی تا پیشرفته",
    format: "digital",
    priceLabel: "بر اساس پلن",
  },
  {
    id: "theory",
    title: "تئوری موسیقی",
    tag: "بنیان",
    summary: "پایه‌هایی که برای ساخت ملودی، انتخاب آکورد و تصمیم‌های درست‌تر در تولید موسیقی لازم داری.",
    level: "مقدماتی",
    format: "digital",
    priceLabel: "بر اساس پلن",
  },
  {
    id: "arrangement",
    title: "تنظیم",
    tag: "کلاس آنلاین",
    summary: "چیدمان، لایه‌بندی و انتخاب صدا را روی قطعه خودت جلو ببر؛ بدون حفظ کردن فرمول‌های بی‌استفاده.",
    level: "متوسط",
    format: "online",
    priceLabel: "جلسه‌ای",
  },
  {
    id: "mixing",
    title: "میکس",
    tag: "کلاس آنلاین",
    summary: "یاد بگیر چرا میکست کدر یا شلوغ می‌شود و چطور به تعادل، عمق و وضوح برسی.",
    level: "متوسط تا پیشرفته",
    format: "online",
    priceLabel: "جلسه‌ای",
  },
  {
    id: "mastering",
    title: "مسترینگ",
    tag: "کلاس آنلاین",
    summary: "آخرین مرحله برای اینکه قطعه‌ات روی سیستم‌های مختلف درست و قابل انتشار شنیده شود.",
    level: "پیشرفته",
    format: "online",
    priceLabel: "جلسه‌ای",
  },
  {
    id: "piano",
    title: "پیانو",
    tag: "کلاس آنلاین",
    summary: "پیانو را به‌عنوان ابزار ساخت ملودی، آکورد و ایده‌پردازی در تولید موسیقی یاد بگیر.",
    level: "همه سطوح",
    format: "online",
    priceLabel: "جلسه‌ای",
  },
];
