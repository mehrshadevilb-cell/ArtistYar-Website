import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { StatusChip } from "@/components/StatusChip";
import { listPublishedMedia } from "@/lib/supabase-media";
import { MediaPlayer } from "@/components/MediaPlayer";
import { GalleryAdminTools } from "@/components/GalleryAdminTools";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "نمونه‌کار هنرجوها | ArtistYar",
  description: "نمونه‌کارها و خروجی‌های هنرجوهای ArtistYar.",
  alternates: { canonical: "/gallery" },
  openGraph: {
    type: "website",
    url: "/gallery",
    title: "نمونه‌کار هنرجوها | ArtistYar",
    description: "نمونه‌کارها و خروجی‌های هنرجوهای آرتیست‌یار.",
  },
};

function categoryLabel(category: string) {
  if (category === "student-work") return "نمونه‌کار هنرجو";
  if (category === "prodby-mehrshad") return "ProdBy Mehrshad";
  return "آموزش رایگان";
}

export default async function GalleryPage() {
  const uploadedMedia = await listPublishedMedia();
  const studentUploads = uploadedMedia.filter((item) => item.category === "student-work");

  return (
    <section className="container-ay py-16">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <SectionHeading
          eyebrow="نمونه‌کار هنرجوها"
          title="نمونه‌کار هنرجوها"
          subtitle="این صفحه فقط برای نمایش نمونه‌کارها و خروجی‌های هنرجوهای آرتیست‌یار است."
        />
        <GalleryAdminTools />
      </div>

      <div className="gallery-index-grid mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <a
          href="#student-projects"
          className="card-ay p-5 transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
        >
          <GraduationCap className="text-gold-400" size={22} />
          <strong className="mt-4 block text-sand-50">نمونه‌کار هنرجوها</strong>
          <span className="mt-2 block text-xs text-ink-500">تمرین‌ها و خروجی‌های منتشرشده</span>
        </a>
      </div>

      <section id="student-projects" className="scroll-mt-28 pt-20">
        <SectionHeading
          eyebrow="01 / هنرجوها"
          title="پروژه‌ها و خروجی‌های هنرجویی"
          subtitle="این بخش فقط برای کارهایی است که به‌عنوان خروجی هنرجو ثبت شده‌اند. انتشار نام یا اثر، نیازمند رضایت هنرجو است."
        />
        <div className="gallery-grid mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {studentUploads.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
          {!studentUploads.length ? <Empty text="هنوز نمونه‌کاری برای نمایش ثبت نشده است." /> : null}
        </div>
      </section>
    </section>
  );
}

function MediaCard({ item }: { item: Awaited<ReturnType<typeof listPublishedMedia>>[number] }) {
  const isPlayable = item.kind === "audio" || item.kind === "video";

  return (
    <article className="card-ay gallery-card flex h-full flex-col p-6">
      <div className="flex items-center justify-between gap-3">
        <StatusChip tone={item.category === "prodby-mehrshad" ? "gold" : item.category === "student-work" ? "gold" : "ok"}>
          {categoryLabel(item.category)}
        </StatusChip>
        <span className="text-xs text-ink-500">{item.format ? item.format.toUpperCase() : "فایل"}</span>
      </div>

      <GalleryAdminTools item={item} />
      <h3 className="mt-5 text-xl font-semibold text-sand-50">{item.title}</h3>

      {isPlayable ? (
        <div className="mt-5">
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
        </div>
      ) : item.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.coverUrl}
          alt={`کاور ${item.title}`}
          loading="lazy"
          decoding="async"
          className="mt-5 aspect-square w-full rounded-2xl border border-white/[.08] object-cover"
        />
      ) : null}

      <p className="mt-4 flex-1 text-sm leading-7 text-ink-400">
        {item.description || (item.category === "prodby-mehrshad" ? "نمونه‌کار ProdBy Mehrshad." : "محتوای آموزشی آرتیست‌یار.")}
      </p>

      {item.kind === "video" ? null : (
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="mt-5 text-sm text-gold-400 hover:text-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-4 focus-visible:ring-offset-ink-950"
          aria-label={`باز کردن فایل ${item.title} در تب جدید`}
        >
          بازکردن فایل ↗
        </a>
      )}
    </article>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-white/[.08] bg-white/[.02] p-6 text-sm leading-7 text-ink-500">{text}</p>;
}
