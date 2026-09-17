"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

type DepthSceneProps = {
  children: ReactNode;
  className?: string;
};

/** A dependency-free 3D stage: scroll depth + pointer tilt, with reduced-motion support. */
export function DepthScene({ children, className = "" }: DepthSceneProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const frame = useRef(0);
  const target = useRef({ x: 0, y: 0, progress: 0 });
  const current = useRef({ x: 0, y: 0, progress: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      target.current.progress = Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - viewportCenter) / Math.max(window.innerHeight, 1)));
    };

    const onPointer = (event: PointerEvent) => {
      target.current.x = ((event.clientX / window.innerWidth) - 0.5) * 2;
      target.current.y = ((event.clientY / window.innerHeight) - 0.5) * 2;
    };

    const tick = () => {
      const t = target.current;
      const c = current.current;
      c.x += (t.x - c.x) * 0.07;
      c.y += (t.y - c.y) * 0.07;
      c.progress += (t.progress - c.progress) * 0.08;
      el.style.setProperty("--depth-rotate-y", `${(c.x * 5).toFixed(2)}deg`);
      el.style.setProperty("--depth-rotate-x", `${(-c.y * 4 - c.progress * 5).toFixed(2)}deg`);
      el.style.setProperty("--depth-shift-y", `${(-c.progress * 20).toFixed(2)}px`);
      el.style.setProperty("--depth-glow", `${(0.12 + Math.abs(c.progress) * 0.1).toFixed(3)}`);
      frame.current = requestAnimationFrame(tick);
    };

    measure();
    frame.current = requestAnimationFrame(tick);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      cancelAnimationFrame(frame.current);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  const style = {
    "--depth-rotate-x": "0deg",
    "--depth-rotate-y": "0deg",
    "--depth-shift-y": "0px",
    "--depth-glow": "0.12",
  } as CSSProperties;

  return (
    <div ref={ref} className={`depth-scene ${className}`.trim()} style={style}>
      <div className="depth-scene-grid" aria-hidden="true" />
      <div className="depth-scene-content">{children}</div>
    </div>
  );
}
