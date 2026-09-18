/** Official community & social destinations for ArtistYar / RahYar */
export const communityLinks = {
  telegramPlugins: {
    href: "https://t.me/ProAudios",
    title: "کانال دانلود VST و پلاگین",
    short: "ProAudios",
    description: "دانلود و معرفی VST، پلاگین و ابزارهای تولید موسیقی.",
    kind: "telegram" as const,
  },
  telegramGroup: {
    href: "https://t.me/ProAudiosGP",
    title: "گروه پرسش و پاسخ",
    short: "ProAudiosGP",
    description: "گروه عمومی برای سؤال، تجربه و کمک هم‌مسیرها.",
    kind: "telegram" as const,
  },
  instagram: {
    href: "https://www.instagram.com/prodbymehrshad/",
    title: "اینستاگرام مهرشاد بنائی",
    short: "@prodbymehrshad",
    description: "آموزش‌های کوتاه، نمونه‌کار و مسیر هنرجوها.",
    kind: "instagram" as const,
  },
} as const;

export const communityLinkList = [
  communityLinks.telegramPlugins,
  communityLinks.telegramGroup,
  communityLinks.instagram,
] as const;
