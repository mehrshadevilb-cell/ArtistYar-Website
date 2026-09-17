import type { Metadata } from "next";
import { ArrowUpLeft, AudioLines, CirclePlay, FolderOpen, GraduationCap, ExternalLink, Mic2 } from "lucide-react";
import { instagramGallery } from "@/data/instagram-gallery";
import { SectionHeading } from "@/components/SectionHeading";
import { StatusChip } from "@/components/StatusChip";
import { listPublishedMedia } from "@/lib/supabase-media";
import { MediaPlayer } from "@/components/MediaPlayer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "خروجی‌ها و گالری ArtistYar", description: "خروجی هنرجوها، آثار مهرشاد، آموزش‌های موسیقی و آرشیو محتوای Instagram آرتیست‌یار." };

function InstagramCard({ item }: { item: typeof instagramGallery[number] }) {
  return <article className="card-ay flex h-full flex-col p-6"><div className="flex items-center justify-between gap-3"><StatusChip tone={item.kind === "audio" ? "gold" : "ok"}>{item.kind === "audio" ? <span className="inline-flex items-center gap-1"><AudioLines size={13} /> صوتی</span> : <span className="inline-flex items-center gap-1"><CirclePlay size={13} /> ویدیو</span>}</StatusChip><span className="inline-flex items-center gap-1 text-xs text-ink-500"><ExternalLink size={13} /> Instagram</span></div><h3 className="mt-6 text-xl font-semibold text-sand-50">{item.title}</h3><p className="mt-3 flex-1 text-sm leading-7 text-ink-400">{item.description}</p><div className="mt-5 flex flex-wrap gap-2">{item.tags.map((tag) => <span key={tag} className="rounded-full border border-white/[.1] px-2.5 py-1 text-[11px] text-ink-400">{tag}</span>)}</div><a href={item.href} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm text-gold-400 hover:text-gold-300">مشاهده پست اصلی <ArrowUpLeft size={15} /></a></article>;
}

export default async function GalleryPage() {
  const uploadedMedia = await listPublishedMedia();
  const studentInstagram = instagramGallery.filter((item) => item.tags.includes("نمونه‌کار هنرجو"));
  const creatorInstagram = instagramGallery.filter((item) => !item.tags.includes("نمونه‌کار هنرجو") && item.kind === "audio");
  const educationInstagram = instagramGallery.filter((item) => item.kind === "video");
  const studentUploads = uploadedMedia.filter((item) => item.category === "student-work");
  const educationUploads = uploadedMedia.filter((item) => item.category === "free-training");

  return <section className="container-ay py-16">
    <SectionHeading eyebrow="گالری ArtistYar" title="هر خروجی، جای خودش" subtitle="خروجی هنرجوها، آثار مهرشاد، آموزش‌ها و آرشیو منابع Instagram را جدا و شفاف ببین." />
    <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><a href="#student-projects" className="card-ay p-5 transition hover:-translate-y-1"><GraduationCap className="text-gold-400" size={22} /><strong className="mt-4 block text-sand-50">پروژه‌های هنرجوها</strong><span className="mt-2 block text-xs text-ink-500">تمرین‌ها و خروجی‌های منتشرشده</span></a><a href="#mehrshad-portfolio" className="card-ay p-5 transition hover:-translate-y-1"><Mic2 className="text-gold-400" size={22} /><strong className="mt-4 block text-sand-50">آثار مهرشاد</strong><span className="mt-2 block text-xs text-ink-500">تنظیم، میکس و مسترینگ</span></a><a href="#education" className="card-ay p-5 transition hover:-translate-y-1"><FolderOpen className="text-gold-400" size={22} /><strong className="mt-4 block text-sand-50">آموزش‌ها</strong><span className="mt-2 block text-xs text-ink-500">فایل‌ها و آموزش‌های رایگان</span></a><a href="#instagram-files" className="card-ay p-5 transition hover:-translate-y-1"><ExternalLink className="text-gold-400" size={22} /><strong className="mt-4 block text-sand-50">آرشیو Instagram</strong><span className="mt-2 block text-xs text-ink-500">لینک همه منابع صفحه اصلی</span></a></div>

    <section id="student-projects" className="scroll-mt-28 pt-20"><SectionHeading eyebrow="01 / هنرجوها" title="پروژه‌ها و خروجی‌های هنرجویی" subtitle="این بخش فقط برای کارهایی است که به‌عنوان خروجی هنرجو ثبت شده‌اند. انتشار نام یا اثر، نیازمند رضایت هنرجو است." /><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{studentUploads.map((item) => <MediaCard key={item.id} item={item} />)}{studentInstagram.map((item) => <InstagramCard key={item.id} item={item} />)}{!studentUploads.length && !studentInstagram.length ? <Empty text="هنوز پروژه‌ای برای نمایش در این بخش ثبت نشده است." /> : null}</div></section>

    <section id="mehrshad-portfolio" className="scroll-mt-28 pt-20"><SectionHeading eyebrow="02 / نمونه‌کار" title="آثار و پروژه‌های مهرشاد" subtitle="نمونه‌هایی از تنظیم، میکس و مسترینگ مهرشاد بنائی؛ ارجاع هر اثر به پست اصلی Instagram انجام می‌شود." /><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{creatorInstagram.map((item) => <InstagramCard key={item.id} item={item} />)}{!creatorInstagram.length ? <Empty text="هنوز اثری برای نمایش در این بخش ثبت نشده است." /> : null}</div></section>

    <section id="education" className="scroll-mt-28 pt-20"><SectionHeading eyebrow="03 / آموزش" title="آموزش‌ها و فایل‌های رایگان" subtitle="فایل‌های آموزشی Supabase و ویدیوهای آموزشی Instagram در این بخش قرار می‌گیرند." /><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{educationUploads.map((item) => <MediaCard key={item.id} item={item} />)}{educationInstagram.map((item) => <InstagramCard key={item.id} item={item} />)}{!educationUploads.length && !educationInstagram.length ? <Empty text="هنوز آموزش رایگانی برای نمایش ثبت نشده است." /> : null}</div></section>

    <section id="instagram-files" className="scroll-mt-28 pt-20"><SectionHeading eyebrow="04 / آرشیو منبع" title="فایل‌ها و منابع صفحه Instagram" subtitle="فهرست کامل محتوای عمومی انتخاب‌شده از @prodbymehrshad؛ فایل اصلی در Instagram باز می‌شود." /><div className="mt-10 grid gap-3 sm:grid-cols-2">{instagramGallery.map((item) => <a key={item.id} href={item.href} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-4 rounded-2xl border border-white/[.08] bg-white/[.02] p-5 transition hover:border-gold-400/40 hover:bg-white/[.04]"><span><strong className="block text-sm text-sand-50">{item.title}</strong><span className="mt-1 block text-xs text-ink-500">{item.tags.join(" · ")}</span></span><ArrowUpLeft className="shrink-0 text-gold-400" size={17} /></a>)}</div><div className="mt-8 rounded-2xl border border-white/[.08] bg-white/[.02] p-6 text-sm leading-7 text-ink-400">این آرشیو از محتوای عمومی صفحه <a className="text-gold-400 hover:text-gold-300" href="https://www.instagram.com/prodbymehrshad/" target="_blank" rel="noreferrer">@prodbymehrshad</a> انتخاب شده است.</div></section>
  </section>;
}

function MediaCard({ item }: { item: Awaited<ReturnType<typeof listPublishedMedia>>[number] }) { return <article className="card-ay flex h-full flex-col p-6"><div className="flex items-center justify-between gap-3"><StatusChip tone={item.category === "student-work" ? "gold" : "ok"}>{item.category === "student-work" ? "نمونه‌کار هنرجو" : "آموزش رایگان"}</StatusChip><span className="text-xs text-ink-500">Supabase Storage</span></div><h3 className="mt-6 text-xl font-semibold text-sand-50">{item.title}</h3>{item.kind === "audio" || item.kind === "video" ? <div className="mt-5"><MediaPlayer src={item.url} kind={item.kind} title={item.title} /></div> : null}<p className="mt-3 flex-1 text-sm leading-7 text-ink-400">{item.description || "محتوای آموزشی آرتیست‌یار."}</p><a href={item.url} target="_blank" rel="noreferrer" className="mt-6 text-sm text-gold-400 hover:text-gold-300">بازکردن فایل ↗</a></article>; }
function Empty({ text }: { text: string }) { return <p className="rounded-2xl border border-white/[.08] bg-white/[.02] p-6 text-sm leading-7 text-ink-500">{text}</p>; }
