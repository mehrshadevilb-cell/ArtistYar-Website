import type { Metadata } from "next";
import { ArrowUpLeft, AudioLines, CirclePlay, FolderOpen, GraduationCap, ExternalLink, Mic2 } from "lucide-react";
import { instagramGallery } from "@/data/instagram-gallery";
import { SectionHeading } from "@/components/SectionHeading";
import { StatusChip } from "@/components/StatusChip";
import { listPublishedMedia } from "@/lib/supabase-media";
import { MediaPlayer } from "@/components/MediaPlayer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "خروجی‌ها و گالری ArtistYar",
  description: "خروجی هنرجوها، آثار مهرشاد، آموزش‌های موسیقی و آرشیو محتوای Instagram آرتیست‌یار.",
};

function categoryLabel(category: string) {
  if (category === "student-work") return "نمونه‌کار هنرجو";
  if (category === "prodby-mehrshad") return "ProdBy Mehrshad";
  return "آموزش رایگان";
}

function InstagramCard({ item }: { item: (typeof instagramGallery)[number] }) {
  return (
    <article className="card-ay gallery-card flex h-full flex-col p-6">
      <div className="flex items-center justify-between gap-3">
        <StatusChip tone={item.kind === "audio" ? "gold" : "ok"}>
          {item.kind === "audio" ? (
            <span className="inline-flex items-center gap-1">
              <AudioLines size={13} /> صوتی
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <CirclePlay size={13} /> ویدیو
            </span>
          )}
        </StatusChip>
        <span className="inline-flex items-center gap-1 text-xs text-ink-500">
          <ExternalLink size={13} /> Instagram
        </span>
      </div>
      <h3 className="mt-6 text-xl font-semibold text-sand-50">{item.title}</h3>
      <p className="mt-3 flex-1 text-sm leading-7 text-ink-400">{item.description}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {item.tags.map((tag) => (
          <span key={tag} className="rounded-full border border-white/[.1] px-2.5 py-1 text-[11px] text-ink-400">
            {tag}
          </span>
        ))}
      </div>
      <a
        href={item.href}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex items-center gap-2 text-sm text-gold-400 hover:text-gold-300"
      >
        مشاهده پست اصلی <ArrowUpLeft size={15} />
      </a>
    </article>
  );
}

export default async function GalleryPage() {
  const uploadedMedia = await listPublishedMedia();
  const studentInstagram = instagramGallery.filter((item) => item.tags.includes("نمونه‌کار هنرجو"));
  const creatorInstagram = instagramGallery.filter(
    (item) => !item.tags.includes("نمونه‌کار هنرجو") && item.kind === "audio",
  );
  const educationInstagram = instagramGallery.filter((item) => item.kind === "video");
  const studentUploads = uploadedMedia.filter((item) => item.category === "student-work");
  const mehrshadUploads = uploadedMedia.filter((item) => item.category === "prodby-mehrshad");
  const educationUploads = uploadedMedia.filter((item) => item.category === "free-training");

  return (
    <section className="container-ay py-16">
      <SectionHeading
        eyebrow="گالری ArtistYar"
        title="هر خروجی، جای خودش"
        subtitle="خروجی هنرجوها، آثار مهرشاد، آموزش‌ها و آرشیو منابع Instagram را جدا و شفاف ببین."
      />
      <div className="gallery-index-grid mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <a href="#student-projects" className="card-ay p-5 transition hover:-translate-y-1">
          <GraduationCap className="text-gold-400" size={22} />
          <strong className="mt-4 block text-sand-50">پروژه‌های هنرجوها</strong>
          <span className="mt-2 block text-xs text-ink-500">تمرین‌ها و خروجی‌های منتشرشده</span>
        </a>
        <a href="#mehrshad-portfolio" className="card-ay p-5 transition hover:-translate-y-1">
          <Mic2 className="text-gold-400" size={22} />
          <strong className="mt-4 block text-sand-50">آثار مهرشاد</strong>
          <span className="mt-2 block text-xs text-ink-500">ProdBy Mehrshad · تنظیم و میکس</span>
        </a>
        <a href="#education" className="card-ay p-5 transition hover:-translate-y-1">
          <FolderOpen className="text-gold-400" size={22} />
          <strong className="mt-4 block text-sand-50">آموزش‌ها</strong>
          <span className="mt-2 block text-xs text-ink-500">فایل‌ها و آموزش‌های رایگان</span>
        </a>
        <a href="#instagram-files" className="card-ay p-5 transition hover:-translate-y-1">
          <ExternalLink className="text-gold-400" size={22} />
          <strong className="mt-4 block text-sand-50">آرشیو Instagram</strong>
          <span className="mt-2 block text-xs text-ink-500">لینک همه منابع صفحه اصلی</span>
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
          {studentInstagram.map((item) => (
            <InstagramCard key={item.id} item={item} />
          ))}
          {!studentUploads.length && !studentInstagram.length ? (
            <Empty text="هنوز پروژه‌ای برای نمایش در این بخش ثبت نشده است." />
          ) : null}
        </div>
      </section>

      <section id="mehrshad-portfolio" className="scroll-mt-28 pt-20">
        <SectionHeading
          eyebrow="02 / ProdBy Mehrshad"
          title="آثار و پروژه‌های مهرشاد"
          subtitle="نمونه‌کارهای شخصی از فولدر ProdBy Mehrshad در Supabase، جدا از خروجی هنرجوها؛ به‌همراه آرشیو Instagram."
        />
        <div className="gallery-grid mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mehrshadUploads.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
          {creatorInstagram.map((item) => (
            <InstagramCard key={item.id} item={item} />
          ))}
          {!mehrshadUploads.length && !creatorInstagram.length ? (
            <Empty text="هنوز اثری برای نمایش در این بخش ثبت نشده است. فایل‌های فولدر ProdBy Mehrshad را از پنل مدیریت محتوا ثبت کن." />
          ) : null}
        </div>
      </section>

      <section id="education" className="scroll-mt-28 pt-20">
        <SectionHeading
          eyebrow="03 / آموزش"
          title="آموزش‌ها و فایل‌های رایگان"
          subtitle="فایل‌های آموزشی Supabase و ویدیوهای آموزشی Instagram در این بخش قرار می‌گیرند."
        />
        <div className="gallery-grid mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {educationUploads.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
          {educationInstagram.map((item) => (
            <InstagramCard key={item.id} item={item} />
          ))}
          {!educationUploads.length && !educationInstagram.length ? (
            <Empty text="هنوز آموزش رایگانی برای نمایش ثبت نشده است." />
          ) : null}
        </div>
      </section>

      <section id="instagram-files" className="scroll-mt-28 pt-20">
        <SectionHeading
          eyebrow="04 / آرشیو منبع"
          title="فایل‌ها و منابع صفحه Instagram"
          subtitle="فهرست کامل محتوای عمومی انتخاب‌شده از @prodbymehrshad؛ فایل اصلی در Instagram باز می‌شود."
        />
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {instagramGallery.map((item) => (
            <a
              key={item.id}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-4 rounded-2xl border border-white/[.08] bg-white/[.02] p-5 transition hover:border-gold-400/40 hover:bg-white/[.04]"
            >
              <span>
                <strong className="block text-sm text-sand-50">{item.title}</strong>
                <span className="mt-1 block text-xs text-ink-500">{item.tags.join(" · ")}</span>
              </span>
              <ArrowUpLeft className="shrink-0 text-gold-400" size={17} />
            </a>
          ))}
        </div>
        <div className="mt-8 rounded-2xl border border-white/[.08] bg-white/[.02] p-6 text-sm leading-7 text-ink-400">
          این آرشیو از محتوای عمومی صفحه{" "}
          <a
            className="text-gold-400 hover:text-gold-300"
            href="https://www.instagram.com/prodbymehrshad/"
            target="_blank"
            rel="noreferrer"
          >
            @prodbymehrshad
          </a>{" "}
          انتخاب شده است.
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
          className="mt-5 aspect-square w-full rounded-2xl border border-white/[.08] object-cover"
        />
      ) : null}

      <p className="mt-4 flex-1 text-sm leading-7 text-ink-400">
        {item.description || (item.category === "prodby-mehrshad" ? "نمونه‌کار ProdBy Mehrshad." : "محتوای آموزشی آرتیست‌یار.")}
      </p>

      {item.kind === "video" ? null : (
        <a href={item.url} target="_blank" rel="noreferrer" className="mt-5 text-sm text-gold-400 hover:text-gold-300">
          بازکردن فایل ↗
        </a>
      )}
    </article>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-white/[.08] bg-white/[.02] p-6 text-sm leading-7 text-ink-500">{text}</p>;
}
