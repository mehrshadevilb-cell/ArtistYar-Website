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

/** Server-friendly card (no client JS). Order CTA is a link to /courses. */
export function LiveProductCard({ product }: { product: LiveProduct }) {
  // Telegram file IDs are not browser URLs; use the intentional fallback artwork.
  const hasImage = Boolean(product.thumbnail && /^https?:\/\//i.test(product.thumbnail));

  return (
    <article className="card-ay group flex h-full flex-col overflow-hidden transition hover:border-gold-500/25 hover:bg-white/[0.045]">
      <div className="relative aspect-[16/10] overflow-hidden border-b border-white/[0.06]">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.thumbnail!}
            alt={product.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div
            className={`flex h-full w-full items-end justify-between bg-gradient-to-br p-5 ${fallbackTone(product.title)}`}
          >
            <span className="text-4xl font-semibold tracking-tight text-sand-50/90">
              {fallbackInitial(product.title)}
            </span>
            <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] text-ink-300 backdrop-blur-sm">
              {product.delivery_type === "telegram" ? "تلگرام" : "دیجیتال"}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-3">
          <StatusChip tone="gold">
            {product.delivery_type === "telegram" ? "کانال تلگرام" : "دوره دیجیتال"}
          </StatusChip>
          {product.is_active === false ? (
            <StatusChip tone="warn">غیرفعال</StatusChip>
          ) : (
            <StatusChip tone="ok">فعال</StatusChip>
          )}
        </div>

        <h3 className="mt-5 text-xl font-semibold tracking-tight text-sand-50">
          {product.title}
        </h3>
        <p className="mt-3 flex-1 text-sm leading-7 text-ink-400">
          {product.description || "آموزش کاربردی برای اینکه موسیقی را درست‌تر بسازی."}
        </p>

        <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4">
          <span className="text-sm font-medium text-gold-400">
            {product.price > 0
              ? `${product.price.toLocaleString("fa-IR")} تومان`
              : "تماس بگیرید"}
          </span>
          <a
            href={`/courses#p-${product.id}`}
            className="text-xs text-sand-100 underline-offset-4 hover:text-gold-300 hover:underline"
          >
            جزئیات و شروع مسیر
          </a>
        </div>
      </div>
    </article>
  );
}
