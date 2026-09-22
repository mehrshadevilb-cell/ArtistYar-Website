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
  /** kept for API compat — blur is no longer applied (perf) */
  enterBlur?: boolean;
  exitBlur?: boolean;
} & Omit<HTMLAttributes<HTMLElement>, "children" | "className">;

function clearStage(el: HTMLElement) {
  gsap.set(el, {
    autoAlpha: 1,
    opacity: 1,
    y: 0,
    scale: 1,
    clearProps: "filter,transform,opacity",
  });
}

/**
 * Light scroll-linked presence — transform + opacity only.
 * No CSS filters (blur was a major source of scroll jank).
 * Desktop only; mobile stays fully native.
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
        if (context.conditions?.reduce || !context.conditions?.desktop) {
          clearStage(el);
          return;
        }

        const strong = intensity === "strong";
        const enterY = strong ? 14 : 8;
        const exitOpacity = strong ? 0.9 : 0.97;
        const exitScale = strong ? 0.99 : 0.999;

        const ctx = gsap.context(() => {
          gsap.set(el, { force3D: true, transformOrigin: "50% 40%" });
          clearStage(el);

          if (enterBlur) {
            gsap.fromTo(
              el,
              { autoAlpha: 0.96, y: enterY },
              {
                autoAlpha: 1,
                y: 0,
                ease: "none",
                immediateRender: false,
                scrollTrigger: {
                  trigger: el,
                  start: "top 96%",
                  end: "top 75%",
                  // Near-zero lag so wheel/trackpad feel immediate
                  scrub: 0.15,
                  invalidateOnRefresh: true,
                },
              },
            );
          }

          if (exitBlur) {
            gsap.fromTo(
              el,
              { autoAlpha: 1, scale: 1 },
              {
                autoAlpha: exitOpacity,
                scale: exitScale,
                ease: "none",
                immediateRender: false,
                scrollTrigger: {
                  trigger: el,
                  start: strong ? "top -10%" : "bottom 28%",
                  end: strong ? "bottom top" : "bottom -15%",
                  scrub: 0.2,
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
