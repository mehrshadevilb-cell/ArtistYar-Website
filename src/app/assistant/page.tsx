"use client";

import dynamic from "next/dynamic";

const AssistantClient = dynamic(() => import("./AssistantClient"), {
  ssr: false,
  loading: () => (
    <section className="container-ay flex min-h-[60vh] items-center justify-center py-16">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-4 text-sm text-ink-400">
        در حال آماده‌سازی راه‌یار…
      </div>
    </section>
  ),
});

export default function AssistantPage() {
  return <AssistantClient />;
}
