"use client";

import { useLayoutEffect, useRef, type ElementType, type HTMLAttributes, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type ScrollStageProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  intensity?: "calm" | "strong";
  enterBlur?: boolean;
  exitBlur?: boolean;
} & Omit<HTMLAttributes<HTMLElement>, "children" | "className">;

function clearStage(el: HTMLElement) {
  gsap.set(el, {
    autoAlpha: 1,
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "none",
    clearProps: "filter",
  });
}

/**
 * Soft depth on scroll.
 * Exit always uses explicit from→to so scrub reverse restores a sharp state
 * when the user scrolls back (hero no longer stays blurred).
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
          clearStage(el);
          return;
        }
        if (!context.conditions?.desktop) {
          clearStage(el);
          return;
        }

        const isStrong = intensity === "strong";
        const enterY = isStrong ? 24 : 14;
        const enterBlurPx = isStrong ? 3 : 1.25;
        const exitBlurPx = isStrong ? 6 : 2;
        const exitOpacity = isStrong ? 0.55 : 0.94;
        const exitScale = isStrong ? 0.97 : 0.996;

        const ctx = gsap.context(() => {
          gsap.set(el, { force3D: true, transformOrigin: "50% 30%" });
          clearStage(el);

          if (enterBlur) {
            gsap.fromTo(
              el,
              {
                autoAlpha: 0.92,
                y: enterY,
                filter: `blur(${enterBlurPx}px)`,
                scale: 0.995,
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
                  end: "top 70%",
                  scrub: 0.7,
                  invalidateOnRefresh: true,
                },
              },
            );
          }

          if (exitBlur) {
            // Explicit FROM sharp → TO soft so reverse always restores sharp.
            // onLeaveBack / onEnterBack force-clear residual filter on the hero.
            gsap.fromTo(
              el,
              {
                autoAlpha: 1,
                scale: 1,
                filter: "blur(0px)",
              },
              {
                autoAlpha: exitOpacity,
                scale: exitScale,
                filter: `blur(${exitBlurPx}px)`,
                ease: "none",
                immediateRender: false,
                scrollTrigger: {
                  trigger: el,
                  // Leave based on top edge for short sections (hero),
                  // still late enough that a tiny scroll doesn't blur.
                  start: isStrong ? "top -5%" : "bottom 38%",
                  end: isStrong ? "bottom top" : "bottom -8%",
                  scrub: 1,
                  invalidateOnRefresh: true,
                  onLeaveBack: () => clearStage(el),
                  onEnterBack: () => {
                    // Coming back from below: keep progressive scrub, but
                    // if progress is near 0 force sharp.
                  },
                  onUpdate: (self) => {
                    if (self.progress <= 0.02) clearStage(el);
                  },
                },
              },
            );
          }
        }, el);

        return () => {
          ctx.revert();
          clearStage(el);
        };
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
