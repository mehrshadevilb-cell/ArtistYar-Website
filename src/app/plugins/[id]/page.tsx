import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPluginsDb } from "@/lib/plugins-db";

export const dynamic = "force-dynamic";
export const revalidate = 60;

type Props = { params: Promise<{ id: string }> };

async function loadPlugin(id: string) {
  const db = getPluginsDb();
  if (!db) return null;
  const result = await db
    .from("telegram_plugin_posts")
    .select(
      "id,title,developer,version,category,formats,platforms,description,features,tags,telegram_photo_file_id,telegram_post_url,cover_public_url,cover_storage_path,file_name,created_at,status",
    )
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (result.error || !result.data) return null;
  return result.data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const plugin = await loadPlugin(id);
  if (!plugin) {
    return { title: "پلاگین یافت نشد | ArtistYar", robots: { index: false, follow: false } };
  }
  const title = `${plugin.title}${plugin.developer ? " — " + plugin.developer : ""} | ArtistYar`;
  const description =
    String(plugin.description || "").trim().slice(0, 160) ||
    `دانلود ${plugin.title} از کانال پلاگین‌های ArtistYar`;
  const canonical = `https://artistyaar.ir/plugins/${plugin.id}`;
  const images =
    plugin.cover_public_url && !String(plugin.cover_public_url).includes("telesco.pe")
      ? [String(plugin.cover_public_url)]
      : [];
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "ArtistYar",
      type: "website",
      locale: "fa_IR",
      images,
    },
    twitter: {
      card: images.length ? "summary_large_image" : "summary",
      title,
      description,
      images,
    },
  };
}

function coverSrc(plugin: {
  cover_public_url?: string | null;
  telegram_photo_file_id?: string | null;
}) {
  const stored = String(plugin.cover_public_url || "").trim();
  if (
    stored &&
    !/telesco\.pe|telegram\.org|telegram-cdn/i.test(stored) &&
    /supabase\.co|artistyaar\.ir|artistyar/i.test(stored)
  ) {
    return stored;
  }
  if (plugin.telegram_photo_file_id) {
    return "/api/plugins/image?file_id=" + encodeURIComponent(plugin.telegram_photo_file_id);
  }
  return null;
}

export default async function PluginDetailPage({ params }: Props) {
  const { id } = await params;
  const plugin = await loadPlugin(id);
  if (!plugin) notFound();

  const src = coverSrc(plugin);
  const formats = Array.isArray(plugin.formats) ? plugin.formats : [];
  const platforms = Array.isArray(plugin.platforms) ? plugin.platforms : [];
  const features = Array.isArray(plugin.features) ? plugin.features : [];
  const telegramHref = String(plugin.telegram_post_url || "").trim() || null;
  const channelHref =
    process.env.NEXT_PUBLIC_TELEGRAM_PLUGIN_CHANNEL ||
    process.env.TELEGRAM_PLUGIN_CHANNEL_USERNAME ||
    "https://t.me/ProAudios";

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12" dir="rtl">
      <nav className="mb-6 text-xs text-ink-500">
        <Link href="/plugins" className="hover:text-gold-300">
          کتابخانه پلاگین
        </Link>
        <span className="mx-2 opacity-50">/</span>
        <span className="text-ink-400">{plugin.title}</span>
      </nav>

      <article className="overflow-hidden rounded-[24px] border border-white/[.08] bg-white/[.02]">
        <div className="relative aspect-[16/9] overflow-hidden bg-ink-950">
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,rgba(214,174,92,.28),transparent_42%)]"
            aria-hidden
          />
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={plugin.title}
              className="relative z-[1] h-full w-full object-cover"
              loading="eager"
            />
          ) : (
            <div className="relative z-[1] flex h-full flex-col justify-end p-6 text-left">
              <span className="text-[11px] uppercase tracking-[.28em] text-gold-300/70">
                ArtistYar / Plugin Lab
              </span>
              <span className="mt-2 text-2xl font-semibold text-sand-50/90">{plugin.title}</span>
            </div>
          )}
        </div>

        <div className="space-y-5 p-6 sm:p-8">
          <header>
            <p className="text-[11px] uppercase tracking-[.22em] text-gold-300/80">
              {plugin.category || "Plugin"}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-.02em] text-sand-50 sm:text-3xl">
              {plugin.title}
            </h1>
            {plugin.developer ? (
              <p className="mt-1 text-sm font-medium text-gold-300">{plugin.developer}</p>
            ) : null}
          </header>

          <div className="flex flex-wrap gap-2">
            {plugin.version ? (
              <span className="rounded-full border border-gold-300/25 bg-gold-300/10 px-3 py-1 text-[11px] text-gold-200">
                v{plugin.version}
              </span>
            ) : null}
            {formats.map((f) => (
              <span
                key={f}
                className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-[11px] text-sand-100"
              >
                {f}
              </span>
            ))}
            {platforms.map((p) => (
              <span
                key={p}
                className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-[11px] text-sand-100"
              >
                {p}
              </span>
            ))}
          </div>

          {plugin.description ? (
            <p className="text-sm leading-7 text-ink-300 whitespace-pre-wrap">{plugin.description}</p>
          ) : null}

          {features.length ? (
            <div>
              <h2 className="text-sm font-semibold text-sand-50">ویژگی‌ها</h2>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ink-300">
                {features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-2">
            {telegramHref ? (
              <a
                href={telegramHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex text-sm"
              >
                دانلود از تلگرام
              </a>
            ) : (
              <a
                href={"/api/plugins/download?id=" + encodeURIComponent(plugin.id)}
                className="btn-primary inline-flex text-sm"
              >
                دانلود از تلگرام
              </a>
            )}
            <Link href="/plugins" className="btn-ghost inline-flex text-sm">
              بازگشت به کتابخانه
            </Link>
            <a
              href={
                String(channelHref).startsWith("http")
                  ? String(channelHref)
                  : "https://t.me/" + String(channelHref).replace(/^@/, "")
              }
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost inline-flex text-sm"
            >
              کانال پلاگین‌ها
            </a>
          </div>

          <p className="text-[11px] text-ink-500">
            منبع: کانال تلگرام ArtistYar · فایل فقط روی تلگرام میزبانی می‌شود
          </p>
        </div>
      </article>
    </main>
  );
}
