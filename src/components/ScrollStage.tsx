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
 * Soft depth on scroll — restrained so multi-section journeys stay fluid.
 * Desktop only; mobile stays native and sharp.
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
        // Calmer motion: less blur/opacity loss so the page never feels "locked"
        const enterY = isStrong ? 16 : 10;
        const enterBlurPx = isStrong ? 1.5 : 0.6;
        const exitBlurPx = isStrong ? 2.5 : 0.8;
        const exitOpacity = isStrong ? 0.82 : 0.96;
        const exitScale = isStrong ? 0.985 : 0.998;

        const ctx = gsap.context(() => {
          gsap.set(el, { force3D: true, transformOrigin: "50% 30%" });
          clearStage(el);

          if (enterBlur) {
            gsap.fromTo(
              el,
              {
                autoAlpha: 0.94,
                y: enterY,
                filter: `blur(${enterBlurPx}px)`,
                scale: 0.997,
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
                  start: "top 94%",
                  end: "top 72%",
                  scrub: 0.45,
                  invalidateOnRefresh: true,
                },
              },
            );
          }

          if (exitBlur) {
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
                  start: isStrong ? "top -8%" : "bottom 32%",
                  end: isStrong ? "bottom top" : "bottom -12%",
                  scrub: 0.55,
                  invalidateOnRefresh: true,
                  onLeaveBack: () => clearStage(el),
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
