"use client";

import { useCallback, useEffect, useState } from "react";

export type LatestPlugin = {
  id: string;
  title: string;
  developer?: string | null;
  version?: string | null;
  category: string;
  formats?: string[];
  platforms?: string[];
  description?: string;
  telegram_photo_file_id?: string | null;
  telegram_post_url?: string | null;
  cover_storage_path?: string | null;
  cover_public_url?: string | null;
  file_name?: string | null;
  created_at: string;
};

type Props = {
  initialItems: LatestPlugin[];
  channelHref?: string;
  hideHeader?: boolean;
};

function coverSrc(p: LatestPlugin) {
  if (p.cover_public_url) return p.cover_public_url;
  const fileId = String(p.telegram_photo_file_id || "").trim();
  if (fileId) return "/api/plugins/image?file_id=" + encodeURIComponent(fileId);
  return null;
}

function downloadHref(p: LatestPlugin) {
  if (p.telegram_post_url) return p.telegram_post_url;
  return "/api/plugins/download?id=" + encodeURIComponent(p.id);
}

export default function LatestPluginsLive({ initialItems, channelHref, hideHeader = false }: Props) {
  const [items, setItems] = useState<LatestPlugin[]>(initialItems.slice(0, 3));
  const [live, setLive] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/plugins?limit=3", {
        method: "GET",
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      if (!response.ok) return;
      const data = await response.json();
      if (!data?.ok || !Array.isArray(data.items)) return;
      const next = (data.items as LatestPlugin[]).slice(0, 3);
      setItems((prev) => {
        const prevKey = prev.map((p) => p.id + ":" + (p.cover_public_url || p.telegram_photo_file_id || "")).join("|");
        const nextKey = next.map((p) => p.id + ":" + (p.cover_public_url || p.telegram_photo_file_id || "")).join("|");
        if (prevKey === nextKey) return prev;
        setUpdatedAt(new Date().toISOString());
        return next;
      });
      setLive(true);
    } catch {
      // Keep last known items.
    }
  }, []);

  useEffect(() => {
    setItems(initialItems.slice(0, 3));
  }, [initialItems]);

  useEffect(() => {
    // SSR already provided initialItems — avoid competing with first paint.
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    let idleHandle: number | null = null;

    const startPolling = () => {
      if (cancelled) return;
      if (!initialItems.length) void refresh();
      timer = setInterval(() => {
        if (document.visibilityState === "visible") void refresh();
      }, 120_000);
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleHandle = window.requestIdleCallback(startPolling, { timeout: 8000 }) as unknown as number;
    } else {
      idleHandle = window.setTimeout(startPolling, 5000) as unknown as number;
    }

    const onVisible = () => {
      if (document.visibilityState === "visible" && !initialItems.length) void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      if (idleHandle != null) {
        if ("cancelIdleCallback" in window) window.cancelIdleCallback(idleHandle);
        else window.clearTimeout(idleHandle);
      }
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, initialItems.length]);

  return (
    <section className={hideHeader ? "" : "mb-10"}>
      {!hideHeader ? (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[.22em] text-gold-300/80">Live · آخرین انتشار</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-.02em] text-sand-50 sm:text-2xl">
              ۳ پلاگین تازه منتشرشده
            </h2>
            <p className="mt-1 text-xs text-ink-500">
              کاور ذخیره‌شده · دانلود مستقیم از تلگرام
              {live ? " · متصل" : ""}
              {updatedAt ? " · " + new Date(updatedAt).toLocaleTimeString("fa-IR") : ""}
            </p>
          </div>
          {channelHref ? (
            <a href={channelHref} target="_blank" rel="noopener noreferrer" className="btn-ghost hidden sm:inline-flex">
              کانال تلگرام
            </a>
          ) : null}
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-2xl border border-white/[.08] bg-white/[.02] p-6 text-sm text-ink-400">
          فعلاً پلاگینی برای نمایش نیست.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {items.map((p, index) => {
            const src = coverSrc(p);
            return (
              <article
                key={p.id}
                className="group overflow-hidden rounded-2xl border border-white/[.08] bg-ink-950/40 shadow-[0_20px_50px_-30px_rgba(0,0,0,.8)]"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-ink-900">
                  <div
                    className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(214,174,92,.28),transparent_42%)]"
                    aria-hidden
                  />
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt={p.title}
                      className="relative z-[1] h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      loading={index === 0 ? "eager" : "lazy"}
                      onError={(e) => {
                        e.currentTarget.remove();
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 z-[2] h-16 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute left-3 top-3 z-[2] rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[10px] text-white/85 backdrop-blur">
                    {p.category || "Plugin"}
                  </div>
                  {p.version ? (
                    <div className="absolute right-3 top-3 z-[2] rounded-full border border-gold-300/25 bg-black/55 px-2.5 py-1 text-[10px] text-gold-200 backdrop-blur">
                      v{p.version}
                    </div>
                  ) : null}
                </div>
                <div className="p-4">
                  <h3 className="truncate text-base font-semibold text-sand-50">{p.title}</h3>
                  {p.developer ? (
                    <p className="mt-0.5 truncate text-xs font-medium text-gold-300">{p.developer}</p>
                  ) : null}
                  {p.description ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-6 text-ink-400">{p.description}</p>
                  ) : null}
                  <div className="mt-3 flex gap-2">
                    <a
                      href={downloadHref(p)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary flex-1 text-center text-xs"
                    >
                      دانلود از تلگرام
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
