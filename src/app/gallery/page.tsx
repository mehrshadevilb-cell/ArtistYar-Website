import type { Metadata } from "next";
import { listPublishedMedia } from "@/lib/supabase-media";
import { MediaPlayer } from "@/components/MediaPlayer";
import { GalleryAdminTools } from "@/components/GalleryAdminTools";
import { StatusChip } from "@/components/StatusChip";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "نمونه‌کار هنرجوها | ArtistYar",
  description: "نمونه‌کارها و خروجی‌های صوتی هنرجوهای ArtistYar با پخش مستقیم.",
  alternates: { canonical: "/gallery" },
  openGraph: {
    type: "website",
    url: "/gallery",
    title: "نمونه‌کار هنرجوها | ArtistYar",
    description: "نمونه‌کارها و خروجی‌های صوتی هنرجوهای آرتیست‌یار.",
  },
};

function categoryLabel(category: string) {
  if (category === "student-work") return "نمونه‌کار هنرجو";
  if (category === "prodby-mehrshad") return "ProdBy Mehrshad";
  return "آموزش رایگان";
}

export default async function GalleryPage() {
  const uploadedMedia = await listPublishedMedia();
  const audioItems = uploadedMedia.filter((item) => item.kind === "audio");
  const studentAudio = audioItems.filter((item) => item.category === "student-work");
  const otherAudio = audioItems.filter((item) => item.category !== "student-work");
  const nonAudio = uploadedMedia.filter((item) => item.kind !== "audio");

  const primary = studentAudio.length > 0 ? studentAudio : audioItems;

  return (
    <section className="container-ay py-10 sm:py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">/ گالری</p>
          <h1 className="mt-2 text-2xl font-medium text-sand-50 sm:text-3xl">نمونه‌کار هنرجوها</h1>
          <p className="mt-2 max-w-xl text-sm leading-7 text-ink-400">
            پخش مستقیم فایل‌های صوتی منتشرشده — با کاور هر ترک روی پلیر.
          </p>
        </div>
        <GalleryAdminTools />
      </div>

      <div className="gallery-grid grid gap-4 sm:grid-cols-2">
        {primary.map((item) => (
          <MediaCard key={item.id} item={item} />
        ))}
        {!primary.length ? (
          <p className="rounded-2xl border border-white/[.08] bg-white/[.02] p-6 text-sm leading-7 text-ink-500 sm:col-span-2">
            هنوز فایل صوتی برای نمایش ثبت نشده است.
          </p>
        ) : null}
      </div>

      {studentAudio.length > 0 && otherAudio.length > 0 ? (
        <div className="mt-12">
          <p className="eyebrow">/ سایر خروجی‌ها</p>
          <h2 className="mt-2 text-xl font-medium text-sand-50">فایل‌های بیشتر</h2>
          <div className="gallery-grid mt-6 grid gap-4 sm:grid-cols-2">
            {otherAudio.map((item) => (
              <MediaCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      ) : null}

      {nonAudio.length > 0 ? (
        <div className="mt-12">
          <p className="eyebrow">/ سایر رسانه‌ها</p>
          <h2 className="mt-2 text-xl font-medium text-sand-50">ویدیو و تصویر</h2>
          <div className="gallery-grid mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nonAudio.map((item) => (
              <MediaCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MediaCard({ item }: { item: Awaited<ReturnType<typeof listPublishedMedia>>[number] }) {
  const isPlayable = item.kind === "audio" || item.kind === "video";

  return (
    <article className="card-ay gallery-card flex h-full flex-col p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <StatusChip tone={item.category === "student-work" ? "gold" : item.category === "prodby-mehrshad" ? "gold" : "ok"}>
          {categoryLabel(item.category)}
        </StatusChip>
        <span className="text-xs text-ink-500">{item.format ? item.format.toUpperCase() : "فایل"}</span>
      </div>

      <GalleryAdminTools item={item} />
      <h3 className="mb-3 text-lg font-semibold text-sand-50">{item.title}</h3>

      {isPlayable ? (
        <MediaPlayer
          src={item.url}
          kind={item.kind as "audio" | "video"}
          title={item.title}
          coverUrl={item.coverUrl}
          artist={item.artist || null}
          album={item.album || null}
          genre={item.genre || null}
          year={item.year}
          protectDownload={item.kind === "video"}
        />
      ) : item.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.coverUrl}
          alt={`کاور ${item.title}`}
          loading="lazy"
          decoding="async"
          className="aspect-square w-full rounded-2xl border border-white/[.08] object-cover"
        />
      ) : null}

      {item.description ? <p className="mt-3 flex-1 text-sm leading-7 text-ink-400">{item.description}</p> : null}
    </article>
  );
}
