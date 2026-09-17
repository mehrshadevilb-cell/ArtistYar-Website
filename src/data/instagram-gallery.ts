export type InstagramGalleryItem = {
  id: string;
  kind: "video" | "audio";
  title: string;
  description: string;
  href: string;
  coverUrl?: string;
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
    coverUrl: "/instagram-covers/student-mix-erfan.jpg",
    tags: ["میکس", "نمونه‌کار هنرجو"],
  },
  {
    id: "student-output-novenamir",
    kind: "audio",
    title: "خروجی آموزش راه‌یار",
    description: "یک نمونه عمومی از خروجی آموزش به سبک راه‌یار.",
    href: "https://www.instagram.com/reel/DbJhnvpMsCT/",
    coverUrl: "/instagram-covers/student-output-novenamir.jpg",
    tags: ["تنظیم", "خروجی آموزشی"],
  },
  {
    id: "nima-arrangement",
    kind: "audio",
    title: "Dige Naya — Nimaan",
    description: "تنظیم، میکس و مسترینگ: مهرشاد بنائی.",
    href: "https://www.instagram.com/reel/DbTAI7cMDZX/",
    coverUrl: "/instagram-covers/nima-arrangement.jpg",
    tags: ["تنظیم", "میکس و مسترینگ"],
  },
  {
    id: "hearing-reverb",
    kind: "video",
    title: "تمرین تقویت شنوایی؛ ریورب",
    description: "یک تمرین شنیداری برای تشخیص تفاوت ریورب در میکس.",
    href: "https://www.instagram.com/reel/DcbHwLTMIIj/",
    coverUrl: "/instagram-covers/hearing-reverb.jpg",
    tags: ["تقویت شنوایی", "ریورب"],
  },
  {
    id: "hearing-compression",
    kind: "video",
    title: "تمرین تقویت شنوایی؛ کمپرس",
    description: "تمرین شنیداری برای تشخیص میزان کمپرس در صدا.",
    href: "https://www.instagram.com/reel/DbKX06iMlmC/",
    coverUrl: "/instagram-covers/hearing-compression.jpg",
    tags: ["تقویت شنوایی", "کمپرس"],
  },
  {
    id: "sample-rate",
    kind: "video",
    title: "سمپل‌ریت به زبان ساده",
    description: "آموزش کوتاه درباره سمپل‌ریت و تصمیم‌های درست‌تر در تولید موسیقی.",
    href: "https://www.instagram.com/reel/Db-8To4McdF/",
    coverUrl: "/instagram-covers/sample-rate.jpg",
    tags: ["سمپل‌ریت", "تولید موسیقی"],
  },
  {
    id: "aliasing",
    kind: "video",
    title: "آلیاسینگ به زبان ساده",
    description: "قسمتی از مجموعه آموزش ضبط صدا، تنظیم و میکس.",
    href: "https://www.instagram.com/reel/DbY5A7IIm5o/",
    coverUrl: "/instagram-covers/aliasing.jpg",
    tags: ["آلیاسینگ", "ضبط صدا"],
  },
  {
    id: "kick-frequency",
    kind: "video",
    title: "تشخیص فرکانس و ساخت کیک",
    description: "یادگیری تحلیل صدا و ساخت کیک اختصاصی در مسیر آموزشی راه‌یار.",
    href: "https://www.instagram.com/reel/Da0pns6sF0o/",
    coverUrl: "/instagram-covers/kick-frequency.jpg",
    tags: ["فرکانس", "ساخت صدا"],
  },
];
