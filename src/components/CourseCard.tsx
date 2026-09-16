import Link from "next/link";
import type { Course } from "@/data/courses";

const formatLabel = {
  digital: "مسیر آموزشی",
  online: "کلاس آنلاین",
  hybrid: "مسیر ترکیبی",
} as const;

export function CourseCard({ course }: { course: Course }) {
  return (
    <article className="card-ay group flex h-full flex-col p-6 transition hover:border-gold-500/25 hover:bg-white/[0.045]">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-ink-300">
          {course.tag}
        </span>
        <span className="text-[11px] text-gold-400">{formatLabel[course.format]}</span>
      </div>
      <h3 className="mt-5 text-xl font-semibold tracking-tight text-sand-50">
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
    </article>
  );
}
