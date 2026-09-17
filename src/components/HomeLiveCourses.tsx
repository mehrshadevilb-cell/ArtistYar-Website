"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LiveProductCard, type LiveProduct } from "./LiveProductCard";
import { SectionHeading } from "./SectionHeading";
import { StatusChip } from "./StatusChip";

export function HomeLiveCourses() {
  const [items, setItems] = useState<LiveProduct[]>([]);
  const [source, setSource] = useState<"loading" | "rahyar" | "demo" | "error">(
    "loading",
  );

  useEffect(() => {
    fetch("/api/rahyar/products")
      .then((r) => r.json())
      .then((data) => {
        setSource(data.source === "rahyar" ? "rahyar" : data.source || "demo");
        setItems((data.items || []).slice(0, 3));
      })
      .catch(() => setSource("error"));
  }, []);

  return (
    <section className="container-ay py-20 sm:py-24">
      <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-end">
        <SectionHeading
          eyebrow="مسیرهای پیشنهادی"
          title="از بنیان تا انتشار"
          subtitle="مسیرت را انتخاب کن و یادگیری را روی موسیقی خودت جلو ببر."
        />
        <div className="flex items-center gap-3">
          <StatusChip tone={source === "rahyar" ? "ok" : source === "loading" ? "neutral" : "warn"}>
            {source === "rahyar"
              ? "زنده"
              : source === "loading"
                ? "در حال بارگذاری"
                : source === "demo"
                  ? "دمو"
                  : "خطا"}
          </StatusChip>
          <Link href="/courses" className="btn-ghost !py-2.5 text-xs">
            دیدن همه مسیرها
          </Link>
        </div>
      </div>

      {source === "loading" ? (
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-ay h-72 animate-pulse bg-white/[0.04]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-12 text-sm text-ink-400">فعلاً دوره‌ای برای نمایش نیست.</p>
      ) : (
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <LiveProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
