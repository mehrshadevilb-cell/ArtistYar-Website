"use client";

import { useLayoutEffect, useRef, type ElementType, type HTMLAttributes, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type ScrollStageProps = {
  children: ReactNode;
  className?: string;
  /** HTML tag or component wrapper */
  as?: ElementType;
  /** Stronger exit blur (hero) vs calm (content) */
  intensity?: "calm" | "strong";
  /** Soft focus while entering the viewport (default true) */
  enterBlur?: boolean;
  /** Soft focus while leaving the viewport (default true) */
  exitBlur?: boolean;
} & Omit<HTMLAttributes<HTMLElement>, "children" | "className">;

/**
 * Apple / bixa-style depth on scroll.
 * Exit blur is tied to the section *bottom* so tall blocks (e.g. MP3 grid)
 * stay sharp while still on screen — blur only as they actually leave.
 */
export function ScrollStage({
  children,
  className = "",
  as: Tag = "div",
  intensity = "calm",
  enterBlur = true,
  exitBlur = true,
  ...rest
}: ScrollStageProps) {
  const root = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        desktop: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        reduce: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        if (context.conditions?.reduce) {
          gsap.set(el, { clearProps: "all" });
          return;
        }
        if (!context.conditions?.desktop) return;

        const isStrong = intensity === "strong";
        const blurMax = isStrong ? 10 : 4;
        const scaleMin = isStrong ? 0.96 : 0.99;
        const opacityMin = isStrong ? 0.55 : 0.88;
        const enterBlurPx = isStrong ? 5 : 3;

        const ctx = gsap.context(() => {
          if (enterBlur) {
            gsap.fromTo(
              el,
              {
                opacity: 0.88,
                y: 22,
                filter: `blur(${enterBlurPx}px)`,
                scale: 0.992,
              },
              {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                scale: 1,
                ease: "none",
                scrollTrigger: {
                  trigger: el,
                  // Become sharp earlier so content is clear while reading
                  start: "top 90%",
                  end: "top 62%",
                  scrub: 0.9,
                  invalidateOnRefresh: true,
                },
              },
            );
          } else {
            gsap.set(el, { opacity: 1, y: 0, filter: "blur(0px)", scale: 1 });
          }

          if (exitBlur) {
            // CRITICAL: use bottom of element, not top.
            // With start "top top", tall sections (MP3 list) blur while still fully visible.
            gsap.fromTo(
              el,
              {
                opacity: 1,
                scale: 1,
                filter: "blur(0px)",
              },
              {
                opacity: opacityMin,
                scale: scaleMin,
                filter: `blur(${blurMax}px)`,
                ease: "none",
                scrollTrigger: {
                  trigger: el,
                  // Start only when the section is mostly scrolled past
                  start: "bottom 55%",
                  end: "bottom 5%",
                  scrub: 1.1,
                  invalidateOnRefresh: true,
                },
              },
            );
          }
        }, el);

        return () => ctx.revert();
      },
    );

    return () => mm.revert();
  }, [intensity, enterBlur, exitBlur]);

  return (
    <Tag
      ref={root as never}
      className={`scroll-stage ${className}`.trim()}
      data-scroll-stage={intensity}
      {...rest}
    >
      {children}
    </Tag>
  );
}
