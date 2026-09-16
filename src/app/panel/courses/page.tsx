"use client";

import { studentCourses } from "@/lib/demo-data";

export default function PanelCoursesPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-sand-50">دوره‌های من</h2>
      {studentCourses.map((c) => (
        <article key={c.id} className="card-ay p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-medium text-sand-50">{c.title}</h3>
              <p className="mt-1 text-xs text-ink-400">وضعیت: {c.status}</p>
            </div>
            {"accessUntil" in c && c.accessUntil ? (
              <span className="text-xs text-ink-400">تا {c.accessUntil}</span>
            ) : null}
            {"remainingSessions" in c && c.remainingSessions != null ? (
              <span className="text-xs text-gold-400">
                {c.remainingSessions} جلسه باقی‌مانده
              </span>
            ) : null}
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gold-500/80"
              style={{ width: `${c.progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-ink-500">پیشرفت تقریبی {c.progress}٪</p>
        </article>
      ))}
    </div>
  );
}
