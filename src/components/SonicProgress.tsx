"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { usePathname } from "next/navigation";

/**
 * Sonic Progress (v2) — bixa-like restraint.
 * Invisible at rest. A hairline + soft tip only while the user is scrolling,
 * so multi-section journeys feel continuous rather than frozen.
 * Observes native scroll only; never captures pointer/touch.
 */
export function SonicProgress() {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const frame = useRef(0);
  const target = useRef(0);
  const current = useRef(0);
  const lastY = useRef(0);
  const lastT = useRef(0);
  const activeUntil = useRef(0);
  const show = useRef(0); // 0..1 visibility of the cue

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const hide =
      pathname?.startsWith("/admin") ||
      pathname?.startsWith("/panel") ||
      pathname?.startsWith("/login");

    if (hide) {
      root.hidden = true;
      return;
    }
    root.hidden = false;

    // Reduced motion: no animated cue at all (content is enough)
    if (reduce) {
      root.dataset.active = "0";
      root.style.setProperty("--sp-show", "0");
      return;
    }

    const measure = () => {
      const max = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1,
      );
      const y = window.scrollY || 0;
      target.current = Math.min(1, Math.max(0, y / max));

      const now = performance.now();
      const dy = Math.abs(y - lastY.current);
      lastY.current = y;
      lastT.current = now;

      // Stay visible briefly after movement so section transitions feel continuous
      if (dy > 0.4) {
        activeUntil.current = now + 520;
      }
    };

    const stop = () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
    };

    const tick = () => {
      if (document.visibilityState === "hidden") {
        frame.current = 0;
        return;
      }

      const now = performance.now();
      const wantsShow = now < activeUntil.current ? 1 : 0;
      // Fade in faster than fade out
      const showEase = wantsShow ? 0.22 : 0.08;
      show.current += (wantsShow - show.current) * showEase;
      if (Math.abs(wantsShow - show.current) < 0.002) show.current = wantsShow;

      current.current += (target.current - current.current) * 0.14;
      if (Math.abs(target.current - current.current) < 0.0002) {
        current.current = target.current;
      }

      const p = current.current;
      const s = show.current;
      root.style.setProperty("--sp-progress", p.toFixed(5));
      root.style.setProperty("--sp-show", s.toFixed(4));
      root.dataset.active = s > 0.05 ? "1" : "0";

      // Keep looping while fading or still moving toward target
      if (s > 0.001 || Math.abs(target.current - current.current) > 0.0005 || wantsShow) {
        frame.current = requestAnimationFrame(tick);
      } else {
        frame.current = 0;
      }
    };

    const start = () => {
      if (frame.current) return;
      frame.current = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      measure();
      start();
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") stop();
      else {
        measure();
        start();
      }
    };

    lastY.current = window.scrollY || 0;
    lastT.current = performance.now();
    measure();
    // Do not start visible — only appear after the first scroll

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    const ro = new ResizeObserver(() => measure());
    ro.observe(document.documentElement);

    return () => {
      stop();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
    };
  }, [pathname]);

  return (
    <div
      ref={rootRef}
      className="sonic-progress"
      aria-hidden="true"
      data-active="0"
      style={
        {
          ["--sp-progress" as string]: "0",
          ["--sp-show" as string]: "0",
        } as CSSProperties
      }
    >
      {/* Short traveling segment — not a full-page bar */}
      <div className="sonic-progress-segment" />
      <div className="sonic-progress-tip" />
    </div>
  );
}
