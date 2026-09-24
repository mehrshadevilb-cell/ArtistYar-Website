import type { Metadata } from "next";
import Link from "next/link";
import LatestPluginsLive, { type LatestPlugin } from "@/components/plugins/LatestPluginsLive";
import { queryLatestPlugins } from "@/lib/plugins-db";

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
  const result = await queryLatestPlugins(3);
  const items = result.items as Plugin[];
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
          <div className="mt-5">
            <a
              href={channelHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/[.1] bg-white/[.04] px-4 py-2 text-xs text-sand-100 transition hover:border-gold-300/30 hover:bg-gold-300/[.08]"
            >
              کانال تلگرام پلاگین‌ها
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
        <CoverArt />
      </div>

      {result.unavailable ? (
        <div className="card-ay p-10 text-center">
          <h2 className="text-lg font-semibold text-sand-50">کتابخانه موقتاً در دسترس نیست</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-ink-400">
            {result.errorCode === "table_missing"
              ? "کاتالوگ هنوز راه‌اندازی نشده است. از کانال تلگرام بازدید کنید."
              : "اتصال برقرار نشد. چند لحظه دیگر دوباره تلاش کنید."}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link href="/plugins" className="btn-primary inline-flex">
              تلاش دوباره
            </Link>
            <a
              href={channelHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-full border border-white/[.12] px-4 py-2 text-sm text-sand-100"
            >
              مشاهده در تلگرام
            </a>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="card-ay p-10 text-center">
          <h2 className="text-lg font-semibold text-sand-50">هنوز پلاگینی منتشر نشده</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-ink-400">
            به‌زودی سه انتشار آخر با کاور و دانلود مستقیم از تلگرام اینجا نمایش داده می‌شود.
          </p>
          <a
            href={channelHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-5 inline-flex"
          >
            کانال تلگرام
          </a>
        </div>
      ) : (
        <LatestPluginsLive initialItems={items} channelHref={channelHref} />
      )}
    </main>
  );
}
