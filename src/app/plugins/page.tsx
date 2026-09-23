
import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "VST و پلاگین‌ها | ArtistYar",
  description: "کتابخانه VST و پلاگین‌های منتشرشده در کانال ProAudios، با معرفی خودکار و لینک دانلود.",
};

type Plugin = {
  id: string; title: string; developer?: string | null; version?: string | null; category: string;
  formats?: string[]; platforms?: string[]; description?: string; features?: string[];
  tags?: string[]; telegram_photo_file_id?: string | null; telegram_post_url?: string | null;
  file_name?: string | null; created_at: string;
};

async function getPlugins(): Promise<Plugin[]> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(/\/$/, "");
  try {
    const res = await fetch(base + "/api/plugins?limit=48", { cache: "no-store" });
    const data = await res.json();
    return data?.items || [];
  } catch { return []; }
}

export default async function PluginsPage() {
  const items = await getPlugins();
  return (
    <section className="container-ay py-10 sm:py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">/ Plugin Lab</p>
          <h1 className="mt-2 text-2xl font-medium text-sand-50 sm:text-3xl">VST و پلاگین‌ها</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-400">
            محتوای کانال ProAudios به‌صورت خودکار به این کتابخانه متصل می‌شود؛ فایل‌ها روی Telegram می‌مانند و سایت فقط اطلاعات و اتصال امن به فایل را نگه می‌دارد.
          </p>
        </div>
        <a href="https://t.me/ProAudios" target="_blank" rel="noopener noreferrer" className="btn-ghost">
          کانال ProAudios ↗
        </a>
      </div>

      {!items.length ? (
        <div className="card-ay p-8 text-center text-sm leading-7 text-ink-400">
          هنوز پلاگینی از کانال دریافت نشده است. بعد از فعال شدن Webhook، پست‌های جدید خودکار اینجا ظاهر می‌شوند.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <article key={p.id} className="card-ay overflow-hidden">
              {p.telegram_photo_file_id ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={"/api/plugins/image?file_id=" + encodeURIComponent(p.telegram_photo_file_id)}
                  alt={p.title}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="aspect-[4/3] w-full bg-white/[.03]" />
              )}
              <div className="p-5">
                <div className="mb-3 flex items-center justify-between gap-2 text-xs text-ink-500">
                  <span>{p.category}</span>
                  {p.version ? <span>v{p.version}</span> : null}
                </div>
                <h2 className="text-lg font-semibold text-sand-50">{p.title}</h2>
                {p.developer ? <p className="mt-1 text-sm text-gold-400">{p.developer}</p> : null}
                {p.description ? <p className="mt-3 line-clamp-4 text-sm leading-7 text-ink-400">{p.description}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {(p.formats || []).slice(0, 4).map((x) => <span key={x} className="rounded-full border border-white/[.08] px-2.5 py-1 text-[11px] text-ink-300">{x}</span>)}
                  {(p.platforms || []).slice(0, 2).map((x) => <span key={x} className="rounded-full border border-white/[.08] px-2.5 py-1 text-[11px] text-ink-300">{x}</span>)}
                </div>
                <div className="mt-5 flex gap-2">
                  <Link href={"/api/plugins/download?id=" + encodeURIComponent(p.id)} className="btn-primary flex-1 text-center">
                    دانلود
                  </Link>
                  {p.telegram_post_url ? (
                    <a href={p.telegram_post_url} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                      Telegram
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
