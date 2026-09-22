import Link from "next/link";
import type { Course } from "@/data/courses";

const formatLabel = {
  digital: "مسیر آموزشی",
  online: "کلاس آنلاین",
  hybrid: "مسیر ترکیبی",
} as const;

function fallbackTone(id: string): string {
  if (id === "rahyar") return "from-gold-500/25 via-amber-900/20 to-ink-950";
  if (id === "theory") return "from-sky-500/20 via-indigo-900/25 to-ink-950";
  if (id === "piano") return "from-emerald-500/15 via-teal-900/20 to-ink-950";
  if (id === "mixing" || id === "mastering") return "from-violet-500/20 via-fuchsia-900/20 to-ink-950";
  return "from-white/10 via-white/[0.03] to-ink-950";
}

export function CourseCard({ course }: { course: Course }) {
  return (
    <article className="card-ay group flex h-full flex-col overflow-hidden transition hover:border-gold-500/25 hover:bg-white/[0.045]">
      <div
        className={`relative flex aspect-square items-end justify-between border-b border-white/[0.06] bg-gradient-to-br p-5 ${fallbackTone(course.id)}`}
      >
        <span className="text-3xl font-semibold tracking-tight text-sand-50/90">
          {course.title.slice(0, 1)}
        </span>
        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] text-ink-300 backdrop-blur-sm">
          {formatLabel[course.format]}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-ink-300">
            {course.tag}
          </span>
        </div>
        <h3 className="mt-4 text-xl font-semibold tracking-tight text-sand-50">
          {course.title}
        </h3>
        <p className="mt-3 flex-1 text-sm leading-7 text-ink-400">{course.summary}</p>
        <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4 text-xs text-ink-400">
          <span>{course.level}</span>
          <span className="text-sand-100">{course.priceLabel}</span>
        </div>
        <Link
          href={`/courses#${course.id}`}
          className="mt-4 text-sm text-gold-400 transition group-hover:text-gold-300"
        >
          بیشتر درباره این مسیر ←
        </Link>
      </div>
    </article>
  );
}
