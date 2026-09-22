"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";

type ParallaxProps = {
  children?: ReactNode;
  /** 0 = lag, 1 = normal. Default 0.35 */
  speed?: number;
  className?: string;
  pointer?: boolean;
};

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Lightweight parallax — rAF only while intersecting and moving; stops when idle.
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
  const visible = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    // Skip heavy parallax on touch-primary / narrow viewports
    if (window.matchMedia("(max-width: 767px)").matches) return;

    const updateTarget = () => {
      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight || 1;
      const centerOffset = rect.top + rect.height / 2 - viewH / 2;
      target.current.y = centerOffset * (speed - 1) * 0.35;
    };

    const stop = () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
    };

    const tick = () => {
      if (!visible.current || document.visibilityState === "hidden") {
        frame.current = 0;
        return;
      }
      const c = current.current;
      const t = target.current;
      c.y += (t.y - c.y) * 0.12;
      c.px += (t.px - c.px) * 0.1;
      c.py += (t.py - c.py) * 0.1;
      el.style.transform = `translate3d(${c.px.toFixed(2)}px, ${c.y.toFixed(2)}px, 0)`;

      const moving =
        Math.abs(t.y - c.y) > 0.05 ||
        Math.abs(t.px - c.px) > 0.05 ||
        Math.abs(t.py - c.py) > 0.05;
      if (moving) {
        frame.current = requestAnimationFrame(tick);
      } else {
        frame.current = 0;
      }
    };

    const start = () => {
      if (frame.current || !visible.current) return;
      frame.current = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      if (!visible.current) return;
      updateTarget();
      start();
    };

    const onPointer = (e: PointerEvent) => {
      if (!pointer || !visible.current) return;
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      target.current.px = nx * 8 * speed;
      target.current.py = ny * 5 * speed;
      start();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible.current = Boolean(entry?.isIntersecting);
        if (visible.current) {
          updateTarget();
          start();
        } else {
          stop();
        }
      },
      { rootMargin: "80px 0px" },
    );
    io.observe(el);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    if (pointer) window.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      stop();
      io.disconnect();
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

/** Hero shell: light drift + fade; desktop only. */
export function ParallaxHero({ children, className = "" }: ParallaxHeroProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    if (window.matchMedia("(max-width: 767px)").matches) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        const max = Math.max(el.offsetHeight, 1);
        const p = Math.min(y / max, 1.2);
        el.style.setProperty("--parallax-y", `${(y * 0.18).toFixed(1)}px`);
        el.style.setProperty("--parallax-fade", `${Math.max(0.35, 1 - p * 0.55).toFixed(3)}`);
        el.style.setProperty("--parallax-scale", "1");
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
