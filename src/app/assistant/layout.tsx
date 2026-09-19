import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "راه‌یار AI؛ دستیار هوشمند آموزش موسیقی",
  description: "با راه‌یار AI درباره تنظیم، میکس، مسترینگ، ملودی و مسیر یادگیری تولید موسیقی سؤال بپرس و قدم‌به‌قدم راهنمایی بگیر.",
  alternates: { canonical: "/assistant" },
  openGraph: {
    type: "website",
    url: "/assistant",
    title: "راه‌یار AI؛ دستیار هوشمند آموزش موسیقی",
    description: "دستیار آموزشی ArtistYar برای عیب‌یابی میکس و ساخت مسیر یادگیری تولید موسیقی.",
  },
};

export default function AssistantLayout({ children }: { children: React.ReactNode }) {
  return children;
}
