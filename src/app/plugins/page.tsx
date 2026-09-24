import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import LatestPluginsLive, { type LatestPlugin } from "@/components/plugins/LatestPluginsLive";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "کتابخانه پلاگین | ArtistYar",
  description:
    "سه پلاگین تازه منتشرشده ArtistYar با کاور، مشخصات فارسی و دانلود مستقیم از تلگرام.",
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
  return "https://t.me/ProAudios";
}

async function getLatestPlugins(): Promise<{ items: Plugin[]; unavailable: boolean }> {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return { items: [], unavailable: true };

  try {
    const db = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const result = await db
      .from("telegram_plugin_posts")
      .select(
        "id,title,developer,version,category,formats,platforms,description,features,tags,telegram_photo_file_id,telegram_post_url,file_name,cover_storage_path,cover_public_url,created_at",
      )
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(3);

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
      <div className="absolute bottom-7 left-7 right-7">
        <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[.32em] text-gold-300/80">
          <span className="h-px w-7 bg-gold-300/50" /> ARTISTYAR / PLUGIN LAB
        </div>
        <div className="text-4xl font-semibold tracking-[-.04em] text-sand-50 sm:text-5xl">
          LATEST
          <br />
          PLUGINS
        </div>
        <p className="mt-3 max-w-sm text-xs leading-6 text-ink-400">
          فایل‌ها فقط روی تلگرام · کاور ۳ انتشار آخر روی سایت
        </p>
      </div>
    </div>
  );
}

export default async function PluginsPage() {
  const result = await getLatestPlugins();
  const items = result.items;
  const channelHref = pluginChannelHref();

  return (
    <main className="container-ay py-8 sm:py-12">
      <div className="mb-8 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <div className="flex flex-col justify-center rounded-[28px] border border-white/[.07] bg-white/[.018] p-7 sm:p-10">
          <p className="eyebrow">/ Plugin Lab</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-.03em] text-sand-50 sm:text-5xl">
            کتابخانه پلاگین ArtistYar
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-ink-400 sm:text-base">
            سه پلاگین تازه منتشرشده با معرفی فارسی. دانلود فایل مستقیماً از تلگرام انجام می‌شود؛ سایت میزبان
            فایل پلاگین نیست.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs text-ink-300">
            <span className="rounded-full border border-gold-300/20 bg-gold-300/[.06] px-3 py-1.5 text-gold-200">
              کپشن هوشمند فارسی
            </span>
            <span className="rounded-full border border-white/[.08] px-3 py-1.5">دانلود از تلگرام</span>
            <span className="rounded-full border border-white/[.08] px-3 py-1.5">۳ کاور آخر</span>
          </div>
        </div>
        <CoverArt />
      </div>

      {result.unavailable ? (
        <div className="card-ay p-10 text-center">
          <h2 className="text-lg font-semibold text-sand-50">کتابخانه موقتاً در دسترس نیست</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-ink-400">
            اتصال برقرار نشد. چند لحظه دیگر دوباره تلاش کنید.
          </p>
          <Link href="/plugins" className="btn-primary mt-5 inline-flex">
            تلاش دوباره
          </Link>
        </div>
      ) : (
        <LatestPluginsLive initialItems={items} channelHref={channelHref} />
      )}
    </main>
  );
}
