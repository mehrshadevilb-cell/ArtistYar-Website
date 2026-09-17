import type { Metadata } from "next";
import { ArrowUpLeft, AudioLines, CirclePlay } from "lucide-react";
import { instagramGallery } from "@/data/instagram-gallery";
import { SectionHeading } from "@/components/SectionHeading";
import { StatusChip } from "@/components/StatusChip";
import { listPublishedMedia } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "گالری نمونه‌کار و آموزش",
  description: "نمونه‌های صوتی، ویدیوهای آموزشی، تمرین‌های شنیداری و خروجی هنرجوهای راه‌یار از صفحه رسمی مهرشاد بنائی در Instagram.",
  keywords: ["نمونه کار میکس", "نمونه کار تنظیم", "آموزش میکس", "آموزش مسترینگ", "ویدیو آموزش موسیقی", "هنرجوی راه‌یار"],
  openGraph: {
    title: "گالری نمونه‌کار و آموزش | ArtistYar",
    description: "نمونه‌های صوتی و ویدیوهای آموزشی تنظیم، میکس و مسترینگ.",
    type: "website",
  },
};

export default async function GalleryPage() {
  const cloudinaryMedia = await listPublishedMedia();
  return (
    <section className="container-ay py-16">
      <SectionHeading
        eyebrow="گالری ArtistYar"
        title="بشنو، ببین، دقیق‌تر یاد بگیر"
        subtitle="نمونه‌های صوتی، خروجی‌های آموزشی و ویدیوهای کوتاه از صفحه رسمی مهرشاد بنائی در Instagram. برای حفظ کیفیت و ارجاع درست، پخش هر نمونه از پست اصلی انجام می‌شود."
      />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {instagramGallery.map((item) => (
          <article key={item.id} className="card-ay flex h-full flex-col p-6">
            <div className="flex items-center justify-between gap-3">
              <StatusChip tone={item.kind === "audio" ? "gold" : "ok"}>
                {item.kind === "audio" ? <span className="inline-flex items-center gap-1"><AudioLines size={13} /> نمونه صوتی</span> : <span className="inline-flex items-center gap-1"><CirclePlay size={13} /> ویدیوی آموزشی</span>}
              </StatusChip>
              <span className="text-xs text-ink-500">Instagram</span>
            </div>
            <h2 className="mt-6 text-xl font-semibold text-sand-50">{item.title}</h2>
            <p className="mt-3 flex-1 text-sm leading-7 text-ink-400">{item.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {item.tags.map((tag) => <span key={tag} className="rounded-full border border-white/[.1] px-2.5 py-1 text-[11px] text-ink-400">{tag}</span>)}
            </div>
            <a href={item.href} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm text-gold-400 hover:text-gold-300">
              مشاهده پست اصلی <ArrowUpLeft size={15} />
            </a>
          </article>
        ))}
      </div>
      <div className="mt-10 rounded-2xl border border-white/[.08] bg-white/[.02] p-6 text-sm leading-7 text-ink-400">
        این گالری از محتوای عمومی صفحه <a className="text-gold-400 hover:text-gold-300" href="https://www.instagram.com/prodbymehrshad/" target="_blank" rel="noreferrer">@prodbymehrshad</a> انتخاب شده است. برای معرفی نام یا اثر هنرجوها در سایت، رضایت آن‌ها باید جداگانه ثبت شود.
      </div>
      {cloudinaryMedia.length ? <>
        <div className="mt-16"><SectionHeading eyebrow="محتوای تازه" title="آثار و آموزش‌های منتشرشده در آرتیست‌یار" subtitle="این بخش از فایل‌هایی ساخته می‌شود که تیم آرتیست‌یار از پنل مدیریت در Cloudinary منتشر کرده است." /></div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cloudinaryMedia.map((item) => <article key={item.id} className="card-ay flex h-full flex-col p-6"><div className="flex items-center justify-between gap-3"><StatusChip tone={item.category === "student-work" ? "gold" : "ok"}>{item.category === "student-work" ? "نمونه‌کار هنرجو" : "آموزش رایگان"}</StatusChip><span className="text-xs text-ink-500">Cloudinary</span></div><h2 className="mt-6 text-xl font-semibold text-sand-50">{item.title}</h2><p className="mt-3 flex-1 text-sm leading-7 text-ink-400">{item.description || "محتوای آموزشی آرتیست‌یار."}</p><div className="mt-6"><a href={item.url} target="_blank" rel="noreferrer" className="text-sm text-gold-400 hover:text-gold-300">مشاهده محتوا ↗</a></div></article>)}
        </div>
      </> : null}
    </section>
  );
}
