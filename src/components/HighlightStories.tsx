"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink, X } from "lucide-react";
import type { InstagramGalleryItem } from "@/data/instagram-gallery";

type HighlightStoriesProps = { items: InstagramGalleryItem[] };

export function HighlightStories({ items }: HighlightStoriesProps) {
  const [active, setActive] = useState<number | null>(null);
  const current = active === null ? null : items[active];

  useEffect(() => {
    if (active === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
      if (event.key === "ArrowLeft") setActive((value) => (value === null ? 0 : (value + 1) % items.length));
      if (event.key === "ArrowRight") setActive((value) => (value === null ? 0 : (value - 1 + items.length) % items.length));
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [active, items.length]);

  if (!items.length) return null;

  function move(delta: number) {
    setActive((value) => value === null ? 0 : (value + delta + items.length) % items.length);
  }

  return <>
    <div className="highlight-rail" aria-label="هایلایت‌های اینستاگرام آرتیست‌یار">
      {items.map((item, index) => <button key={item.id} type="button" className="highlight-story" onClick={() => setActive(index)} aria-label={`نمایش هایلایت ${item.title}`}>
        <span className={`highlight-ring ${item.kind === "video" ? "highlight-ring-video" : ""}`}>
          <span className="highlight-art">{item.coverUrl ? <img src={item.coverUrl} alt="" loading="lazy" /> : String(index + 1).padStart(2, "۰")}</span>
        </span>
        <span className="highlight-label">{item.title}</span>
      </button>)}
    </div>

    {current ? <div className="highlight-modal" role="dialog" aria-modal="true" aria-label={current.title} onClick={() => setActive(null)}>
      <div className="highlight-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="highlight-progress" aria-hidden="true">{items.map((item, index) => <span key={item.id} className={index === active ? "is-active" : ""} />)}</div>
        <button type="button" className="highlight-close" onClick={() => setActive(null)} aria-label="بستن"><X size={18} /></button>
        <div className="highlight-modal-art">
          {current.coverUrl ? <img src={current.coverUrl} alt={`کاور ${current.title}`} /> : <span className="highlight-modal-index">{String((active ?? 0) + 1).padStart(2, "۰")}</span>}
          <span className="highlight-modal-kind">{current.kind === "video" ? "VIDEO / INSTAGRAM" : "AUDIO / INSTAGRAM"}</span>
        </div>
        <div className="highlight-modal-copy"><p className="eyebrow">/ Instagram Highlight</p><h3>{current.title}</h3><p>{current.description}</p><div className="highlight-modal-actions"><button type="button" className="btn-ghost" onClick={() => move(-1)}><ArrowRight size={16} /> قبلی</button><a className="btn-primary" href={current.href} target="_blank" rel="noreferrer">مشاهده در Instagram <ExternalLink size={15} /></a><button type="button" className="btn-ghost" onClick={() => move(1)}>بعدی <ArrowLeft size={16} /></button></div><small>به‌دلیل محدودیت API رسمی Meta، رسانه در Instagram میزبانی می‌شود و اینجا با کاور curated و لینک امن نمایش داده می‌شود.</small></div>
      </div>
    </div> : null}
  </>;
}
