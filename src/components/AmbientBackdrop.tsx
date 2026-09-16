"use client";

import { useEffect, useRef } from "react";

/** Soft floating orbs with scroll parallax — multi-depth atmosphere. */
export function AmbientBackdrop() {
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const orbs = el.querySelectorAll<HTMLElement>("[data-parallax]");

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        orbs.forEach((orb) => {
          const speed = Number(orb.dataset.parallax || 0.2);
          const drift = y * speed;
          orb.style.setProperty("--scroll-y", `${drift.toFixed(1)}px`);
        });
        el.style.setProperty("--grid-shift", `${(y * 0.12).toFixed(1)}px`);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div
      ref={root}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="ambient-orb ambient-orb-a" data-parallax="0.18" />
      <div className="ambient-orb ambient-orb-b" data-parallax="0.32" />
      <div className="ambient-orb ambient-orb-c" data-parallax="0.48" />
      <div className="ambient-grid absolute inset-0 bg-grid-faint bg-grid opacity-[0.35]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-gold-500/30 to-transparent" />
    </div>
  );
}
