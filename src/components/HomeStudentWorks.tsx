import { ArrowLeft } from "lucide-react";
import { listPublishedMedia } from "@/lib/supabase-media";
import { MediaPlayer } from "@/components/MediaPlayer";
import { Reveal } from "@/components/Reveal";
import { SafeLink } from "@/components/SafeLink";

export async function HomeStudentWorks() {
  let items: Awaited<ReturnType<typeof listPublishedMedia>> = [];
  try {
    const all = await listPublishedMedia();
    items = all
      .filter((item) => item.category === "student-work" && item.kind === "audio")
      .slice(0, 4);
    if (items.length === 0) {
      items = all.filter((item) => item.kind === "audio").slice(0, 4);
    }
  } catch {
    items = [];
  }

  return (
    <section id="projects" className="projects-section border-y border-white/[.06]">
      <div className="container-ay section-space">
        <Reveal>
          <div className="projects-heading">
            <div>
              <p className="eyebrow">/ نمونه‌کار هنرجوها</p>
              <h2 className="section-title mt-4">
                خروجی واقعی
                <br />
                <span className="text-gold-400">قابل شنیدن.</span>
              </h2>
            </div>
            <p className="section-sub max-w-md">
              فایل‌های صوتی منتشرشده از گالری هنرجوها — با کاور و پخش مستقیم.
            </p>
          </div>
        </Reveal>

        {items.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-white/[.08] bg-white/[.02] p-6 text-sm text-ink-400">
            هنوز نمونه‌کار صوتی برای نمایش ثبت نشده است. از گالری کامل دیدن کنید.
          </p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {items.map((item, i) => (
              <Reveal key={item.id} delay={i * 40}>
                <article className="student-mp3-card card-ay flex h-full flex-col overflow-hidden p-4 sm:p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="rounded-full border border-gold-500/25 bg-gold-500/10 px-2.5 py-1 text-[10px] text-gold-400">
                      نمونه‌کار هنرجو
                    </span>
                    <span className="text-[10px] text-ink-500">{(item.format || "mp3").toUpperCase()}</span>
                  </div>
                  <MediaPlayer
                    src={item.url}
                    kind="audio"
                    title={item.title}
                    coverUrl={item.coverUrl}
                    artist={item.artist || null}
                    album={item.album || null}
                    genre={item.genre || null}
                    year={item.year}
                  />
                  {item.description ? (
                    <p className="mt-3 text-sm leading-7 text-ink-400">{item.description}</p>
                  ) : null}
                </article>
              </Reveal>
            ))}
          </div>
        )}

        <div className="mt-7 text-center">
          <SafeLink href="/gallery" hard className="btn-ghost inline-flex gap-2 text-sm">
            مشاهده کامل نمونه‌کارها در گالری <ArrowLeft size={14} aria-hidden />
          </SafeLink>
        </div>
      </div>
    </section>
  );
}
