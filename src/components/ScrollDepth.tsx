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
 * Desktop-only scroll depth. CSS keeps the mobile layout flat so narrow
 * WebViews cannot crop or project the hero outside the viewport.
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

        const ctx = gsap.context(() => {
          gsap.fromTo(
            el,
            {
              rotateX: 5 * intensity,
              rotateY: -2 * intensity,
              scale: 0.985,
              y: 28,
              transformPerspective: 1200,
              transformOrigin: "50% 50%",
            },
            {
              rotateX: -3 * intensity,
              rotateY: 2 * intensity,
              scale: 1,
              y: 0,
              ease: "none",
              scrollTrigger: {
                trigger: el,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.8,
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
      style={{ transformStyle: "preserve-3d", willChange: "transform" }}
    >
      {children}
    </div>
  );
}
