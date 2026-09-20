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
  /** Disable exit blur (keep only enter reveal) */
  exitBlur?: boolean;
} & Omit<HTMLAttributes<HTMLElement>, "children" | "className">;

/**
 * Apple / bixa-style depth on scroll:
 * - sections ease in (slight blur → sharp)
 * - as they leave the top of the viewport they soften (blur + scale + fade)
 * Desktop only; respects prefers-reduced-motion.
 */
export function ScrollStage({
  children,
  className = "",
  as: Tag = "div",
  intensity = "calm",
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

        const blurMax = intensity === "strong" ? 14 : 8;
        const scaleMin = intensity === "strong" ? 0.94 : 0.97;
        const opacityMin = intensity === "strong" ? 0.45 : 0.62;

        const ctx = gsap.context(() => {
          gsap.fromTo(
            el,
            {
              opacity: 0.72,
              y: 36,
              filter: "blur(6px)",
              scale: 0.985,
            },
            {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              scale: 1,
              ease: "none",
              scrollTrigger: {
                trigger: el,
                start: "top 92%",
                end: "top 42%",
                scrub: 0.65,
                invalidateOnRefresh: true,
              },
            },
          );

          if (exitBlur) {
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
                  start: "top top",
                  end: "bottom top",
                  scrub: 0.85,
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
  }, [intensity, exitBlur]);

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
