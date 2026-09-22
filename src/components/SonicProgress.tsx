"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { usePathname } from "next/navigation";

/**
 * Sonic Progress — minimal site-wide scroll feedback (bixa-like restraint).
 * Desktop: 1px vertical rail + soft playhead.
 * Mobile: thin horizontal rail under the header + soft playhead.
 * Never intercepts pointer/touch; observes native scroll only.
 */
export function SonicProgress() {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const headRef = useRef<HTMLDivElement | null>(null);
  const frame = useRef(0);
  const target = useRef(0);
  const current = useRef(0);
  const lastY = useRef(0);
  const lastT = useRef(0);
  const velocity = useRef(0);
  const activeUntil = useRef(0);

  useEffect(() => {
    const root = rootRef.current;
    const fill = fillRef.current;
    const head = headRef.current;
    if (!root || !fill || !head) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Hide on dense app shells where a progress rail competes with tools
    const hide =
      pathname?.startsWith("/admin") ||
      pathname?.startsWith("/panel") ||
      pathname?.startsWith("/login");

    if (hide) {
      root.hidden = true;
      return;
    }
    root.hidden = false;

    if (reduce) {
      // Still show a static position marker — no easing / pulse
      const measure = () => {
        const max = Math.max(
          document.documentElement.scrollHeight - window.innerHeight,
          1,
        );
        const p = Math.min(1, Math.max(0, window.scrollY / max));
        root.style.setProperty("--sp-progress", p.toFixed(4));
        root.dataset.band = p < 0.02 ? "start" : p > 0.98 ? "end" : "mid";
        root.dataset.active = "0";
      };
      measure();
      window.addEventListener("scroll", measure, { passive: true });
      window.addEventListener("resize", measure, { passive: true });
      return () => {
        window.removeEventListener("scroll", measure);
        window.removeEventListener("resize", measure);
      };
    }

    const measure = () => {
      const max = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1,
      );
      const y = window.scrollY || 0;
      const p = Math.min(1, Math.max(0, y / max));
      target.current = p;

      const now = performance.now();
      const dt = Math.max(now - lastT.current, 1);
      const dy = Math.abs(y - lastY.current);
      velocity.current = dy / dt;
      lastY.current = y;
      lastT.current = now;

      // Active while the user is actually moving through the page
      if (dy > 0.5) {
        activeUntil.current = now + 420;
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
      // Soft lerp — feels continuous during long / multi-tick section transitions
      const ease = 0.12;
      current.current += (target.current - current.current) * ease;
      if (Math.abs(target.current - current.current) < 0.00015) {
        current.current = target.current;
      }

      const p = current.current;
      root.style.setProperty("--sp-progress", p.toFixed(5));
      root.dataset.band = p < 0.02 ? "start" : p > 0.98 ? "end" : "mid";

      const active = now < activeUntil.current;
      root.dataset.active = active ? "1" : "0";

      // Subtle intensity from velocity (capped) — micro-glow only while moving
      const intensity = Math.min(1, velocity.current * 18);
      root.style.setProperty("--sp-intensity", intensity.toFixed(3));

      frame.current = requestAnimationFrame(tick);
    };

    const start = () => {
      if (frame.current) return;
      frame.current = requestAnimationFrame(tick);
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
    start();

    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    // Recalculate after route paint / image load shifts document height
    const ro = new ResizeObserver(() => measure());
    ro.observe(document.documentElement);

    return () => {
      stop();
      window.removeEventListener("scroll", measure);
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
          ["--sp-intensity" as string]: "0",
        } as CSSProperties
      }
    >
      <div className="sonic-progress-track" />
      <div ref={fillRef} className="sonic-progress-fill" />
      <div ref={headRef} className="sonic-progress-head" />
    </div>
  );
}
