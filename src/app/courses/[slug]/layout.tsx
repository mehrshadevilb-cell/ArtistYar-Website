import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getCatalog } from "@/lib/catalog";

type Props = { children: React.ReactNode; params: Promise<{ slug: string }> };

function slugify(title: string): string {
  return title.trim().toLowerCase().replace(/\u200c/g, "").replace(/[^\u0600-\u06FF\u0660-\u0669a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const catalog = await getCatalog();
  const product = catalog.items.find((item) => slugify(item.title) === slug);
  if (!product) return { title: "دوره پیدا نشد", robots: { index: false, follow: false } };
  const description = product.description || "دوره پروژه‌محور ArtistYar برای یادگیری تنظیم، میکس، مسترینگ و تولید موسیقی.";
  return {
    title: product.title,
    description,
    alternates: { canonical: "/courses/" + slug },
    openGraph: {
      type: "website",
      url: "/courses/" + slug,
      title: product.title + " | ArtistYar",
      description,
      ...(product.thumbnail ? { images: [{ url: product.thumbnail, alt: product.title }] } : {}),
    },
  };
}

export default async function CourseDetailLayout({ children, params }: Props) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const product = catalog.items.find((item) => slugify(item.title) === slug);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(/\/$/, "");
  const courseJsonLd = product ? {
    "@context": "https://schema.org",
    "@type": "Course",
    name: product.title,
    description: product.description || "دوره پروژه‌محور ArtistYar برای یادگیری تولید موسیقی.",
    url: siteUrl + "/courses/" + slug,
    provider: { "@type": "Organization", name: "ArtistYar", sameAs: siteUrl },
    ...(product.thumbnail ? { image: product.thumbnail } : {}),
  } : null;

  return (
    <>
      <Breadcrumbs items={[{ name: "دوره‌ها", href: "/courses" }, { name: product?.title || "دوره" }]} />
      {courseJsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }} /> : null}
      {children}
    </>
  );
}
