export type InstagramGalleryItem = {
  id: string;
  kind: "video" | "audio";
  title: string;
  description: string;
  href: string;
  tags: string[];
};

/** Curated public posts from @prodbymehrshad; media stays on Instagram. */
export const instagramGallery: InstagramGalleryItem[] = [
  {
    id: "student-mix-erfan",
    kind: "audio",
    title: "میکس تنظیم هنرجو",
    description: "نمونه‌ای از کار روی میکس تنظیم هنرجو؛ شنیدن خروجی در پست اصلی Instagram.",
    href: "https://www.instagram.com/reel/Da5u4gLMGmd/",
    tags: ["میکس", "نمونه‌کار هنرجو"],
  },
  {
    id: "student-output-novenamir",
    kind: "audio",
    title: "خروجی آموزش راه‌یار",
    description: "یک نمونه عمومی از خروجی آموزش به سبک راه‌یار.",
    href: "https://www.instagram.com/reel/DbJhnvpMsCT/",
    tags: ["تنظیم", "خروجی آموزشی"],
  },
  {
    id: "nima-arrangement",
    kind: "audio",
    title: "Dige Naya — Nimaan",
    description: "تنظیم، میکس و مسترینگ: مهرشاد بنائی.",
    href: "https://www.instagram.com/reel/DbTAI7cMDZX/",
    tags: ["تنظیم", "میکس و مسترینگ"],
  },
  {
    id: "hearing-reverb",
    kind: "video",
    title: "تمرین تقویت شنوایی؛ ریورب",
    description: "یک تمرین شنیداری برای تشخیص تفاوت ریورب در میکس.",
    href: "https://www.instagram.com/reel/DcbHwLTMIIj/",
    tags: ["تقویت شنوایی", "ریورب"],
  },
  {
    id: "hearing-compression",
    kind: "video",
    title: "تمرین تقویت شنوایی؛ کمپرس",
    description: "تمرین شنیداری برای تشخیص میزان کمپرس در صدا.",
    href: "https://www.instagram.com/reel/DbKX06iMlmC/",
    tags: ["تقویت شنوایی", "کمپرس"],
  },
  {
    id: "sample-rate",
    kind: "video",
    title: "سمپل‌ریت به زبان ساده",
    description: "آموزش کوتاه درباره سمپل‌ریت و تصمیم‌های درست‌تر در تولید موسیقی.",
    href: "https://www.instagram.com/reel/Db-8To4McdF/",
    tags: ["سمپل‌ریت", "تولید موسیقی"],
  },
  {
    id: "aliasing",
    kind: "video",
    title: "آلیاسینگ به زبان ساده",
    description: "قسمتی از مجموعه آموزش ضبط صدا، تنظیم و میکس.",
    href: "https://www.instagram.com/reel/DbY5A7IIm5o/",
    tags: ["آلیاسینگ", "ضبط صدا"],
  },
  {
    id: "kick-frequency",
    kind: "video",
    title: "تشخیص فرکانس و ساخت کیک",
    description: "یادگیری تحلیل صدا و ساخت کیک اختصاصی در مسیر آموزشی راه‌یار.",
    href: "https://www.instagram.com/reel/Da0pns6sF0o/",
    tags: ["فرکانس", "ساخت صدا"],
  },
];
