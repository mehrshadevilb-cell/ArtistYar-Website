import Image from "next/image";
import type { Metadata } from "next";
import { SectionHeading } from "@/components/SectionHeading";
import { StatusChip } from "@/components/StatusChip";
import { CommunityLinks } from "@/components/CommunityLinks";
import { SafeLink } from "@/components/SafeLink";
import { getCatalog } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "پکیج‌ها و مسیرهای آموزشی",
  description: "مسیرهای آموزشی آرتیست‌یار و راه‌یار: تنظیم، میکس، مسترینگ، تئوری و پکیج کامل.",
  alternates: { canonical: "/courses" },
};

export const revalidate = 60;

function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/\u200c/g, "")
    .replace(/[^\u0600-\u06FF\u0660-\u0669a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function coverTone(title: string): string {
  if (title.includes("راه‌یار") || title.includes("راهیار")) return "from-gold-500/25 via-amber-900/20 to-ink-950";
  if (title.includes("تئوری")) return "from-sky-500/20 via-indigo-900/25 to-ink-950";
  if (title.includes("آرتیست")) return "from-violet-500/20 via-fuchsia-900/20 to-ink-950";
  return "from-white/10 via-white/[0.03] to-ink-950";
}

function coverClass(title: string): string {
  if (title.includes("پرو")) return "product-cover product-cover-pro";
  if (title.includes("راه‌یار") || title.includes("راهیار")) return "product-cover product-cover-rahyar";
  if (title.includes("تئوری")) return "product-cover product-cover-theory";
  if (title.includes("آرتیست")) return "product-cover product-cover-artist";
  return "product-cover";
}

export default async function CoursesPage() {
  const catalog = await getCatalog();
  const items = catalog.items || [];
  const source = catalog.source;

  return (
    <section className="container-ay py-14 sm:py-16">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow="محصولات آکادمی راه‌یار"
          title="برای هر مسیر، یک صفحه اختصاصی"
          subtitle="هر پکیج را جداگانه ببین؛ توضیحات کامل، سرفصل‌ها، نتیجه مسیر و روش دریافت دسترسی در صفحه اختصاصی همان محصول قرار گرفته است."
        />
        <div className="self-start sm:self-auto">
          <StatusChip tone={source === "rahyar" ? "ok" : "warn"}>
            {source === "rahyar" ? "کاتالوگ زنده" : source === "demo" ? "نمایش نمونه" : source}
          </StatusChip>
        </div>
      </div>

      <div className="product-grid mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const slug = slugify(item.title);
          const key = item.id > 0 ? String(item.id) : `fallback-${slug}`;
          return (
            <article
              key={key}
              className="card-ay group flex h-full flex-col overflow-hidden transition hover:border-gold-500/25 hover:bg-white/[.035]"
            >
              <div className="relative aspect-[16/10] overflow-hidden border-b border-white/[.06]">
                {item.thumbnail ? (
                  <>
                    <Image
                      src={item.thumbnail}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1100px) 50vw, 25vw"
                      quality={78}
                      className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] ${coverClass(item.title)}`}
                      loading="lazy"
                    />
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/45 via-transparent to-transparent" aria-hidden="true" />
                  </>
                ) : (
                  <div className={`flex h-full w-full items-end justify-between bg-gradient-to-br p-5 ${coverTone(item.title)}`}>
                    <span className="text-4xl font-semibold tracking-tight text-sand-50/90">
                      {item.title.replace(/\s+/g, "").slice(0, 1)}
                    </span>
                    <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] text-ink-300 backdrop-blur-sm">
                      {item.delivery_type === "telegram" ? "تلگرام" : "دیجیتال"}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-4 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <StatusChip tone="gold">{item.delivery_type === "telegram" ? "کانال تلگرام" : "دوره دیجیتال"}</StatusChip>
                  <StatusChip tone={item.is_active === false ? "warn" : "ok"}>
                    {item.is_active === false ? "غیرفعال" : "فعال"}
                  </StatusChip>
                </div>
                <h2 className="mt-4 text-lg font-semibold tracking-tight text-sand-50 sm:text-xl">{item.title}</h2>
                <p className="mt-3 flex-1 text-sm leading-7 text-ink-400">
                  {item.description ||
                    "برای دیدن توضیحات کامل، سرفصل‌ها و نحوه دریافت دسترسی وارد صفحه اختصاصی محصول شو."}
                </p>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[.06] pt-4">
                  <span className="text-sm font-medium text-gold-400">
                    {item.price > 0 ? `${item.price.toLocaleString("fa-IR")} تومان` : "تماس بگیرید"}
                  </span>
                  <SafeLink
                    href={`/courses/${slug}`}
                    hard
                    className="btn-ghost min-h-11 !px-4 !py-2.5 text-center text-xs focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
                    ariaLabel={`مشاهده صفحه ${item.title}`}
                  >
                    مشاهده مسیر
                  </SafeLink>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!items.length ? (
        <div className="card-ay mx-auto mt-10 max-w-lg p-8 text-center">
          <p className="text-sm text-ink-300">
            فعلاً لیست مسیرها در دسترس نیست. از لینک‌های جامعه استفاده کن یا کمی بعد دوباره تلاش کن.
          </p>
          <div className="mt-6">
            <CommunityLinks variant="pills" className="justify-center" />
          </div>
        </div>
      ) : null}

      <div className="mt-16 border-t border-white/[0.06] pt-12">
        <CommunityLinks
          title="بعد از انتخاب مسیر"
          subtitle="برای ابزار، سؤال عمومی و نمونه‌های کوتاه این لینک‌ها همیشه در دسترس‌اند."
        />
      </div>
    </section>
  );
}
