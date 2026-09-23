"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LiveProductCard, type LiveProduct } from "./LiveProductCard";
import { StatusChip } from "./StatusChip";

/** Course cards only — section heading is owned by the homepage for hierarchy control. */
export function HomeLiveCourses() {
  const [items, setItems] = useState<LiveProduct[]>([]);
  const [source, setSource] = useState<"loading" | "rahyar" | "demo" | "error">("loading");

  useEffect(() => {
    fetch("/api/rahyar/products")
      .then((r) => r.json())
      .then((data) => {
        setSource(data.source === "rahyar" ? "rahyar" : data.source || "demo");
        setItems((data.items || []).slice(0, 4));
      })
      .catch(() => setSource("error"));
  }, []);

  return (
    <section className="container-ay pb-16 pt-4 sm:pb-20">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
          دیدن همه پکیج‌ها
        </Link>
      </div>

      {source === "loading" ? (
        <div className="product-grid mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card-ay h-72 animate-pulse bg-white/[0.04]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-8 text-sm text-ink-400">فعلاً پکیجی برای نمایش نیست.</p>
      ) : (
        <div className="product-grid mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((p) => (
            <LiveProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
