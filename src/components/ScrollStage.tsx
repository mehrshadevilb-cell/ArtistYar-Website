"use client";

import { useLayoutEffect, useRef, type ElementType, type HTMLAttributes, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type ScrollStageProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  /** Hero uses strong; content stays calm */
  intensity?: "calm" | "strong";
  enterBlur?: boolean;
  exitBlur?: boolean;
} & Omit<HTMLAttributes<HTMLElement>, "children" | "className">;

/**
 * Soft depth on scroll (Apple / bixa inspired).
 * - Enter: light lift + tiny blur that clears while still low in the viewport
 * - Exit: only as the section actually leaves (bottom-based), never while reading
 * - Calm intensity avoids heavy filter so long sections (courses, lists) stay readable
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

        // Calm = readability first; strong = hero depth
        const enterY = isStrong ? 28 : 16;
        const enterBlurPx = isStrong ? 4 : 1.5;
        const exitBlurPx = isStrong ? 8 : 2.5;
        const exitOpacity = isStrong ? 0.5 : 0.92;
        const exitScale = isStrong ? 0.965 : 0.995;

        const ctx = gsap.context(() => {
          gsap.set(el, {
            force3D: true,
            transformOrigin: "50% 30%",
          });

          if (enterBlur) {
            // Clears early so content is sharp before the user focuses on it
            gsap.fromTo(
              el,
              {
                autoAlpha: 0.9,
                y: enterY,
                filter: `blur(${enterBlurPx}px)`,
                scale: 0.994,
              },
              {
                autoAlpha: 1,
                y: 0,
                filter: "blur(0px)",
                scale: 1,
                ease: "none",
                immediateRender: false,
                scrollTrigger: {
                  trigger: el,
                  start: "top 92%",
                  end: "top 68%",
                  scrub: 0.75,
                  invalidateOnRefresh: true,
                },
              },
            );
          } else {
            gsap.set(el, { autoAlpha: 1, y: 0, filter: "blur(0px)", scale: 1 });
          }

          if (exitBlur) {
            // Bottom-anchored: section stays sharp while any meaningful content is on screen.
            // Starts late so a small scroll down does not soft-focus the whole block.
            gsap.to(el, {
              autoAlpha: exitOpacity,
              scale: exitScale,
              filter: `blur(${exitBlurPx}px)`,
              ease: "none",
              immediateRender: false,
              scrollTrigger: {
                trigger: el,
                start: "bottom 40%",
                end: "bottom -5%",
                scrub: 1.25,
                invalidateOnRefresh: true,
              },
            });
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
