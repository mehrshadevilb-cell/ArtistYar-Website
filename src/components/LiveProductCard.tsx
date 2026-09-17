import Image from "next/image";
import Link from "next/link";
import { StatusChip } from "./StatusChip";

export type LiveProduct = {
  id: number;
  title: string;
  description?: string | null;
  price: number;
  is_active?: boolean;
  delivery_type?: "spotplayer" | "telegram" | string;
  thumbnail?: string | null;
};

function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/‌/g, "")
    .replace(/[^\u0600-\u06FF\u0660-\u0669a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function fallbackTone(title: string): string {
  if (title.includes("راه‌یار") || title.includes("راهیار")) return "from-gold-500/25 via-amber-900/20 to-ink-950";
  if (title.includes("تئوری")) return "from-sky-500/20 via-indigo-900/25 to-ink-950";
  if (title.includes("آرتیست")) return "from-violet-500/20 via-fuchsia-900/20 to-ink-950";
  return "from-white/10 via-white/[0.03] to-ink-950";
}

function fallbackInitial(title: string): string {
  const clean = title.replace(/\s+/g, "").trim();
  return clean.slice(0, 1) || "آ";
}

function coverClass(title: string): string {
  if (title.includes("پرو")) return "product-cover product-cover-pro";
  if (title.includes("راه‌یار") || title.includes("راهیار")) return "product-cover product-cover-rahyar";
  if (title.includes("تئوری")) return "product-cover product-cover-theory";
  if (title.includes("آرتیست")) return "product-cover product-cover-artist";
  return "product-cover";
}

/** Server-friendly card (no client JS). */
export function LiveProductCard({ product }: { product: LiveProduct }) {
  const hasImage = Boolean(product.thumbnail);
  const slug = slugify(product.title);

  return (
    <article className="card-ay group flex h-full flex-col overflow-hidden transition hover:border-gold-500/25 hover:bg-white/[0.045]">
      <div className="relative aspect-[16/10] overflow-hidden border-b border-white/[0.06]">
        {hasImage ? (
          <Image
            src={product.thumbnail!}
            alt={product.title}
            fill
            sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1100px) 50vw, 25vw"
            quality={78}
            className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] ${coverClass(product.title)}`}
            loading="lazy"
          />
        ) : (
          <div className={`flex h-full w-full items-end justify-between bg-gradient-to-br p-5 ${fallbackTone(product.title)}`}>
            <span className="text-4xl font-semibold tracking-tight text-sand-50/90">{fallbackInitial(product.title)}</span>
            <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] text-ink-300 backdrop-blur-sm">
              {product.delivery_type === "telegram" ? "تلگرام" : "دیجیتال"}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <StatusChip tone="gold">
            {product.delivery_type === "telegram" ? "کانال تلگرام" : "دوره دیجیتال"}
          </StatusChip>
          {product.is_active === false ? <StatusChip tone="warn">غیرفعال</StatusChip> : <StatusChip tone="ok">فعال</StatusChip>}
        </div>

        <h3 className="mt-4 text-lg font-semibold tracking-tight text-sand-50 sm:mt-5 sm:text-xl">{product.title}</h3>
        <p className="mt-3 flex-1 text-sm leading-7 text-ink-400">{product.description || "آموزش کاربردی برای اینکه موسیقی را درست‌تر بسازی."}</p>

        <div className="mt-5 flex flex-col items-stretch gap-3 border-t border-white/[0.06] pt-4 sm:mt-6 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium text-gold-400 sm:shrink-0">
            {product.price > 0 ? `${product.price.toLocaleString("fa-IR")} تومان` : "تماس بگیرید"}
          </span>
          <Link
            href={`/courses/${slug}`}
            className="btn-ghost min-h-11 !px-3 !py-2.5 text-center text-xs sm:min-h-0 sm:!border-0 sm:!bg-transparent sm:!px-0 sm:!py-0"
          >
            جزئیات و شروع مسیر
          </Link>
        </div>
      </div>
    </article>
  );
}
