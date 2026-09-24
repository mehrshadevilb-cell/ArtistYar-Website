"use client";

import dynamic from "next/dynamic";

export const FloatingAssistantLazy = dynamic(
  () => import("@/components/FloatingAssistant").then((m) => m.FloatingAssistant),
  { ssr: false },
);
