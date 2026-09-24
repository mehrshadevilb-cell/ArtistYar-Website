"use client";

import dynamic from "next/dynamic";

export const QuickConsultationFormLazy = dynamic(
  () => import("@/components/QuickConsultationForm").then((m) => m.QuickConsultationForm),
  { ssr: false, loading: () => null },
);
