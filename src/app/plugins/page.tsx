import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import LatestPluginsLive, { type LatestPlugin } from "@/components/plugins/LatestPluginsLive";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "کتابخانه پلاگین | ArtistYar",
  description:
    "کتابخانه حرفه‌ای پلاگین‌های موسیقی ArtistYar با معرفی فارسی، مشخصات فنی و دسترسی سریع به فایل.",
};

type Plugin = LatestPlugin & {
  features?: string[];
  tags?: string[];
};

function pluginChannelHref() {
  const configured = (process.env.TELEGRAM_PLUGIN_CHANNEL_ID || "").trim();
  if (configured.startsWith("@") && configured.length > 1) {
    return "https://t.me/" + configured.slice(1);
  }
  const username = (process.env.TELEGRAM_PLUGIN_CHANNEL_USERNAME || "").trim().replace(/^@/, "");
  if (username) return "https://t.me/" + username;
  return "https://artistyaar.ir";
}

async function getPlugins(
  search = "",
  category = "",
): Promise<{ items: Plugin[]; unavailable: boolean }> {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return { items: [], unavailable: true };

  try {
    const db = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    let query = db
      .from("telegram_plugin_posts")
      .select(
        "id,title,developer,version,category,formats,platforms,description,features,tags,telegram_photo_file_id,telegram_post_url,file_name,created_at",
      )
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(60);

    const safeSearch = search.replace(/[%_]/g, "").slice(0, 80);
    const safeCategory = category.slice(0, 80);
    if (safeSearch) {
      query = query.or(
        "title.ilike.%" +
          safeSearch +
          "%,developer.ilike.%" +
          safeSearch +
          "%,description.ilike.%" +
          safeSearch +
          "%",
      );
    }
    if (safeCategory) query = query.eq("category", safeCategory);

    const result = await query;
    if (result.error) {
      console.error("plugins_page_query_failed", result.error.message);
      return { items: [], unavailable: true };
    }
    return { items: (result.data || []) as Plugin[], unavailable: false };
  } catch (error) {
    console.error("plugins_page_load_failed", error);
    return { items: [], unavailable: true };
  }
}

function CoverArt() {
  return (
    <div
      aria-hidden="true"
      className="relative min-h-[280px] overflow-hidden rounded-[28px] border border-white/[.08] bg-[#090909] shadow-2xl sm:min-h-[340px]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_35%,rgba(214,174,92,.28),transparent_28%),radial-gradient(circle_at_20%_75%,rgba(71,108,255,.16),transparent_30%)]" />
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full border border-gold-400/20 bg-gold-400/[.04] blur-[1px]" />
      <div className="absolute right-8 top-8 h-40 w-40 rounded-full border border-gold-300/15" />
      <div className="absolute right-16 top-16 h-24 w-24 rounded-full border border-gold-300/20" />
      <div className="absolute left-8 top-8 grid grid-cols-4 gap-2 opacity-70">
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-gold-300/60" />
        ))}
      </div>
      <div className="absolute bottom-7 left-7 right-7 flex items-end justify-between gap-6">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[.32em] text-gold-300/80">
            <span className="h-px w-7 bg-gold-300/50" /> ARTISTYAR / PLUGIN LAB
          </div>
          <div className="text-4xl font-semibold tracking-[-.04em] text-sand-50 sm:text-6xl">
            PLUGIN
            <br />
            LIBRARY
          </div>
        </div>
        <div className="hidden h-20 w-20 rounded-2xl border border-gold-300/20 bg-white/[.025] p-4 sm:block">
          <div className="grid h-full grid-cols-3 items-end gap-1">
            {[30, 55, 40, 72, 48, 84, 60, 42, 68].map((h, i) => (
              <span key={i} className="rounded-sm bg-gold-300/60" style={{ height: h + "%" }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function PluginsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; category?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const search = (params.q || "").trim();
  const category = (params.category || "").trim();
  const result = await getPlugins(search, category);
  const items = result.items;
  const categories = Array.from(new Set(items.map((p) => p.category).filter(Boolean))).slice(0, 12);
  const channelHref = pluginChannelHref();
  const latest = items.slice(0, 3);
  const showLatest = !search && !category;

  return (
    <main className="container-ay py-8 sm:py-12">
      <div className="mb-8 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <div className="flex flex-col justify-center rounded-[28px] border border-white/[.07] bg-white/[.018] p-7 sm:p-10">
          <p className="eyebrow">/ Plugin Lab</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-.03em] text-sand-50 sm:text-5xl">
            کتابخانه پلاگین‌های موسیقی
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-ink-400 sm:text-base">
            معرفی تمیز و فارسی پلاگین‌های منتشرشده در ArtistYar؛ مشخصات فنی، فرمت، پلتفرم و دسترسی مستقیم، بدون
            شلوغی.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs text-ink-300">
            <span className="rounded-full border border-gold-300/20 bg-gold-300/[.06] px-3 py-1.5 text-gold-200">
              معرفی هوشمند
            </span>
            <span className="rounded-full border border-white/[.08] px-3 py-1.5">مشخصات فنی</span>
            <span className="rounded-full border border-white/[.08] px-3 py-1.5">دانلود مستقیم</span>
            <span className="rounded-full border border-white/[.08] px-3 py-1.5">کاور تلگرام</span>
          </div>
        </div>
        <CoverArt />
      </div>

      {showLatest && !result.unavailable ? (
        <LatestPluginsLive initialItems={latest} channelHref={channelHref} />
      ) : null}

      <div className="sticky top-3 z-20 mb-7 rounded-2xl border border-white/[.07] bg-[#0a0a0a]/90 p-3 shadow-xl backdrop-blur-xl">
        <form action="/plugins" className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <input
              name="q"
              defaultValue={search}
              placeholder="جست‌وجوی پلاگین، سازنده یا توضیحات..."
              className="h-11 w-full rounded-xl border border-white/[.08] bg-white/[.035] px-4 text-sm text-sand-50 outline-none transition placeholder:text-ink-500 focus:border-gold-300/40"
            />
          </div>
          <select
            name="category"
            defaultValue={category}
            className="h-11 rounded-xl border border-white/[.08] bg-[#111] px-4 text-sm text-sand-50 outline-none focus:border-gold-300/40"
          >
            <option value="">همه دسته‌ها</option>
            {categories.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <button className="h-11 rounded-xl bg-gold-300 px-5 text-sm font-semibold text-black transition hover:bg-gold-200">
            جست‌وجو
          </button>
        </form>
      </div>

      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-ink-500">{items.length} نتیجه</p>
          <h2 className="mt-1 text-xl font-semibold text-sand-50">کاتالوگ پلاگین‌ها</h2>
        </div>
        <a href={channelHref} target="_blank" rel="noopener noreferrer" className="btn-ghost hidden sm:inline-flex">
          کانال ArtistYar ↗
        </a>
      </div>

      {result.unavailable ? (
        <div className="card-ay p-10 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-red-300/15 bg-red-300/[.05] text-lg">
            !
          </div>
          <h2 className="text-lg font-semibold text-sand-50">کتابخانه موقتاً در دسترس نیست</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-ink-400">
            اتصال کتابخانه پلاگین برقرار نشد. چند لحظه دیگر دوباره تلاش کنید.
          </p>
          <Link href="/plugins" className="btn-primary mt-5 inline-flex">
            تلاش دوباره
          </Link>
        </div>
      ) : !items.length ? (
        <div className="card-ay p-10 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-gold-300/15 bg-gold-300/[.05] text-xl">
            ⌕
          </div>
          <h2 className="text-lg font-semibold text-sand-50">موردی پیدا نشد</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-ink-400">
            عبارت جست‌وجو یا دسته‌بندی را تغییر بده.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => (
            <article
              key={p.id}
              className="group overflow-hidden rounded-[22px] border border-white/[.07] bg-white/[.018] transition duration-300 hover:-translate-y-1 hover:border-gold-300/20 hover:bg-white/[.03]"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-[#080808]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,rgba(214,174,92,.20),transparent_30%),radial-gradient(circle_at_20%_85%,rgba(74,94,180,.14),transparent_34%)]" />
                {p.telegram_photo_file_id ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={"/api/plugins/image?file_id=" + encodeURIComponent(p.telegram_photo_file_id)}
                    alt={p.title}
                    className="relative z-[1] h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : null}
                <div className="absolute bottom-3 left-3 right-3 z-[2] flex items-center justify-between gap-2">
                  <span className="rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[10px] text-white/80 backdrop-blur">
                    {p.category}
                  </span>
                  {p.version ? (
                    <span className="rounded-full border border-gold-300/20 bg-black/55 px-2.5 py-1 text-[10px] text-gold-200 backdrop-blur">
                      v{p.version}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold leading-7 text-sand-50">{p.title}</h2>
                    {p.developer ? (
                      <p className="mt-0.5 truncate text-xs font-medium text-gold-300">{p.developer}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 rounded-lg border border-white/[.07] bg-white/[.025] px-2 py-1 text-[9px] uppercase tracking-[.12em] text-ink-500">
                    Plugin
                  </span>
                </div>
                {p.description ? (
                  <p className="mt-3 line-clamp-3 text-sm leading-7 text-ink-400">{p.description}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(p.formats || []).slice(0, 4).map((x) => (
                    <span
                      key={x}
                      className="rounded-lg border border-white/[.07] bg-white/[.025] px-2 py-1 text-[10px] text-ink-300"
                    >
                      {x}
                    </span>
                  ))}
                  {(p.platforms || []).slice(0, 2).map((x) => (
                    <span
                      key={x}
                      className="rounded-lg border border-white/[.07] bg-white/[.025] px-2 py-1 text-[10px] text-ink-300"
                    >
                      {x}
                    </span>
                  ))}
                </div>
                {p.features?.length ? (
                  <div className="mt-4 border-t border-white/[.06] pt-3">
                    <p className="mb-1.5 text-[10px] uppercase tracking-[.16em] text-ink-500">ویژگی‌ها</p>
                    <p className="line-clamp-2 text-xs leading-6 text-ink-300">
                      {p.features.slice(0, 3).join(" · ")}
                    </p>
                  </div>
                ) : null}
                <div className="mt-5 flex gap-2">
                  <Link
                    href={"/api/plugins/download?id=" + encodeURIComponent(p.id)}
                    className="btn-primary flex-1 text-center"
                  >
                    دانلود پلاگین
                  </Link>
                  {p.telegram_post_url ? (
                    <a
                      href={p.telegram_post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost"
                    >
                      پست تلگرام
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
