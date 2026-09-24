"use client";

import dynamic from "next/dynamic";

export const HomeLiveCoursesLazy = dynamic(
  () => import("@/components/HomeLiveCourses").then((m) => m.HomeLiveCourses),
  {
    loading: () => (
      <div className="container-ay py-10" aria-hidden="true">
        <div className="h-72 animate-pulse rounded-2xl bg-white/[0.04]" />
      </div>
    ),
  },
);
