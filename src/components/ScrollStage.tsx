"use client";

import { useRef, type ElementType, type HTMLAttributes, type ReactNode } from "react";

type ScrollStageProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  intensity?: "calm" | "strong";
  enterBlur?: boolean;
  exitBlur?: boolean;
} & Omit<HTMLAttributes<HTMLElement>, "children" | "className">;

/**
 * Native-scroll layout shell.
 *
 * ScrollStage used to attach GSAP ScrollTriggers that changed opacity, blur,
 * scale and position while the user was scrolling. Those effects made native
 * wheel/trackpad/touch input feel delayed and could leave sections visually
 * stuck. The shell is intentionally inert now: scrolling is fully owned by
 * the browser.
 */
export function ScrollStage({
  children,
  className = "",
  as: Tag = "div",
  ...rest
}: ScrollStageProps) {
  const root = useRef<HTMLElement | null>(null);

  return (
    <Tag
      ref={root as never}
      className={`scroll-stage ${className}`.trim()}
      {...rest}
    >
      {children}
    </Tag>
  );
}
