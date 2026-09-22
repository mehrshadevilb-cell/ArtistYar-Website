"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type ScrollDepthProps = {
  children: ReactNode;
  className?: string;
  intensity?: number;
};

/**
 * Desktop-only gentle vertical drift. No 3D rotate / scale (those felt sticky).
 * Never intercepts pointer events.
 */
export function ScrollDepth({ children, className = "", intensity = 1 }: ScrollDepthProps) {
  const root = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        desktop: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
      },
      ({ conditions }) => {
        if (!conditions?.desktop) return;

        const y = Math.min(18, 14 * intensity);

        const ctx = gsap.context(() => {
          gsap.fromTo(
            el,
            { y: y },
            {
              y: -y * 0.35,
              ease: "none",
              scrollTrigger: {
                trigger: el,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.2,
                invalidateOnRefresh: true,
              },
            },
          );
        }, el);

        return () => ctx.revert();
      },
    );

    return () => mm.revert();
  }, [intensity]);

  return (
    <div
      ref={root}
      className={`scroll-depth ${className}`.trim()}
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}
