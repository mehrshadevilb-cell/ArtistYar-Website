import type { Metadata } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "راه‌یار AI؛ دستیار هوشمند آموزش موسیقی",
  description:
    "با راه‌یار AI درباره تنظیم، میکس، مسترینگ، ملودی و مسیر یادگیری تولید موسیقی سؤال بپرس و قدم‌به‌قدم راهنمایی بگیر.",
  alternates: { canonical: "/assistant" },
  openGraph: {
    type: "website",
    url: "/assistant",
    title: "راه‌یار AI؛ دستیار هوشمند آموزش موسیقی",
    description: "دستیار آموزشی ArtistYar برای عیب‌یابی میکس و ساخت مسیر یادگیری تولید موسیقی.",
  },
};

const assistantJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "راه‌یار AI",
  alternateName: ["RahYar AI", "دستیار هوشمند آرتیست‌یار"],
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  url: `${siteUrl}/assistant`,
  inLanguage: "fa-IR",
  description:
    "دستیار آموزشی فارسی برای عیب‌یابی میکس، مفاهیم تولید موسیقی و راهنمایی مسیر یادگیری در آکادمی راه‌یار.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "IRR",
  },
  provider: {
    "@type": "EducationalOrganization",
    name: "ArtistYar",
    url: siteUrl,
  },
};

export default function AssistantLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(assistantJsonLd) }}
      />
      {children}
    </>
  );
}
