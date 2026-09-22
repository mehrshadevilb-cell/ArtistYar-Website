"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

type DepthSceneProps = {
  children: ReactNode;
  className?: string;
};

/** Desktop 3D stage. Mobile stays flat. Never captures pointer events. */
export function DepthScene({ children, className = "" }: DepthSceneProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const frame = useRef<number | null>(null);
  const visible = useRef(false);
  const target = useRef({ x: 0, y: 0, progress: 0 });
  const current = useRef({ x: 0, y: 0, progress: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const motionQuery = window.matchMedia(
      "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
    );
    if (!motionQuery.matches) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      target.current.progress = Math.max(
        -1,
        Math.min(
          1,
          (rect.top + rect.height / 2 - viewportCenter) /
            Math.max(window.innerHeight, 1),
        ),
      );
    };

    const onPointer = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      target.current.x =
        ((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
      target.current.y =
        ((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2;
    };

    const stop = () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };

    const tick = () => {
      if (!visible.current || document.visibilityState === "hidden") {
        frame.current = null;
        return;
      }

      const t = target.current;
      const c = current.current;
      c.x += (t.x - c.x) * 0.07;
      c.y += (t.y - c.y) * 0.07;
      c.progress += (t.progress - c.progress) * 0.08;

      el.style.setProperty("--depth-rotate-y", `${(c.x * 5).toFixed(2)}deg`);
      el.style.setProperty(
        "--depth-rotate-x",
        `${(-c.y * 4 - c.progress * 5).toFixed(2)}deg`,
      );
      el.style.setProperty(
        "--depth-shift-y",
        `${(-c.progress * 20).toFixed(2)}px`,
      );
      el.style.setProperty(
        "--depth-glow",
        `${(0.12 + Math.abs(c.progress) * 0.1).toFixed(3)}`,
      );

      frame.current = requestAnimationFrame(tick);
    };

    const start = () => {
      if (
        frame.current === null &&
        visible.current &&
        document.visibilityState !== "hidden"
      ) {
        frame.current = requestAnimationFrame(tick);
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible.current = Boolean(entry?.isIntersecting);
        if (visible.current) {
          measure();
          start();
        } else {
          stop();
        }
      },
      { rootMargin: "160px 0px" },
    );

    const onVisibility = () => {
      if (document.visibilityState === "hidden") stop();
      else start();
    };

    observer.observe(el);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const style = {
    "--depth-rotate-x": "0deg",
    "--depth-rotate-y": "0deg",
    "--depth-shift-y": "0px",
    "--depth-glow": "0.12",
    pointerEvents: "none",
  } as CSSProperties;

  return (
    <div ref={ref} className={`depth-scene ${className}`.trim()} style={style} aria-hidden="true">
      <div className="depth-scene-grid" aria-hidden="true" />
      <div className="depth-scene-content">{children}</div>
    </div>
  );
}
