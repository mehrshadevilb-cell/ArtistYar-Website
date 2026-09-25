import Link from "next/link";

export type BreadcrumbItem = { name: string; href?: string };

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const all = [{ name: "خانه", href: "/" }, ...items];
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(/\/$/, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.href ? { item: siteUrl + item.href } : {}),
    })),
  };

  return (
    <div className="container-ay pt-5 sm:pt-7">
      <nav aria-label="مسیر صفحه" className="text-xs text-ink-500">
        <ol className="flex flex-wrap items-center gap-2">
          {all.map((item, index) => (
            <li key={item.name + "-" + index} className="flex items-center gap-2">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {item.href && index < all.length - 1 ? <Link href={item.href} className="transition hover:text-gold-400">{item.name}</Link> : <span aria-current="page" className="text-ink-300">{item.name}</span>}
            </li>
          ))}
        </ol>
      </nav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
