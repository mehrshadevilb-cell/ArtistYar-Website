"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";

type ParallaxProps = {
  children: ReactNode;
  /** Scroll speed relative to page. 0 = sticky-ish lag, 1 = normal, >1 = faster. Default 0.35 */
  speed?: number;
  className?: string;
  /** Also shift slightly on horizontal pointer for depth */
  pointer?: boolean;
};

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Lightweight parallax layer driven by scroll (and optional pointer).
 * Uses transform + rAF; no external deps.
 */
export function Parallax({
  children,
  speed = 0.35,
  className = "",
  pointer = false,
}: ParallaxProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const frame = useRef(0);
  const target = useRef({ y: 0, px: 0, py: 0 });
  const current = useRef({ y: 0, px: 0, py: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const updateTarget = () => {
      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight || 1;
      // distance of element center from viewport center
      const centerOffset = rect.top + rect.height / 2 - viewH / 2;
      target.current.y = centerOffset * (speed - 1) * 0.45;
    };

    const onScroll = () => {
      updateTarget();
    };

    const onPointer = (e: PointerEvent) => {
      if (!pointer) return;
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      target.current.px = nx * 12 * speed;
      target.current.py = ny * 8 * speed;
    };

    const tick = () => {
      const c = current.current;
      const t = target.current;
      c.y += (t.y - c.y) * 0.08;
      c.px += (t.px - c.px) * 0.06;
      c.py += (t.py - c.py) * 0.06;
      el.style.transform = `translate3d(${c.px.toFixed(2)}px, ${c.y.toFixed(2)}px, 0)`;
      frame.current = requestAnimationFrame(tick);
    };

    updateTarget();
    frame.current = requestAnimationFrame(tick);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    if (pointer) window.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      cancelAnimationFrame(frame.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (pointer) window.removeEventListener("pointermove", onPointer);
    };
  }, [speed, pointer]);

  return (
    <div ref={ref} className={`parallax-layer ${className}`.trim()}>
      {children}
    </div>
  );
}

type ParallaxHeroProps = {
  children: ReactNode;
  className?: string;
};

/** Hero shell: content drifts slower than scroll; fades slightly as you leave. */
export function ParallaxHero({ children, className = "" }: ParallaxHeroProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        const max = Math.max(el.offsetHeight, 1);
        const p = Math.min(y / max, 1.4);
        el.style.setProperty("--parallax-y", `${(y * 0.28).toFixed(1)}px`);
        el.style.setProperty("--parallax-fade", `${Math.max(0, 1 - p * 0.85).toFixed(3)}`);
        el.style.setProperty("--parallax-scale", `${(1 + p * 0.04).toFixed(4)}`);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const style = {
    "--parallax-y": "0px",
    "--parallax-fade": "1",
    "--parallax-scale": "1",
  } as CSSProperties;

  return (
    <section ref={ref} className={`parallax-hero ${className}`.trim()} style={style}>
      {children}
    </section>
  );
}
