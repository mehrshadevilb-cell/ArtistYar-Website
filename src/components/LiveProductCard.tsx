import { StatusChip } from "./StatusChip";

export type LiveProduct = {
  id: number;
  title: string;
  description?: string | null;
  price: number;
  is_active?: boolean;
  delivery_type?: "spotplayer" | "telegram" | string;
};

/** Server-friendly card (no client JS). Order CTA is a link to /courses. */
export function LiveProductCard({ product }: { product: LiveProduct }) {
  return (
    <article className="card-ay flex h-full flex-col p-6 transition hover:border-gold-500/25 hover:bg-white/[0.045]">
      <div className="flex items-start justify-between gap-3">
        <StatusChip tone="gold">{product.delivery_type === "telegram" ? "کانال تلگرام" : "دوره دیجیتال"}</StatusChip>
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
    </article>
  );
}
