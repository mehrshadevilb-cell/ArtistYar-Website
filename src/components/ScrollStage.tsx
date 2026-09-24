import type { ElementType, HTMLAttributes, ReactNode } from "react";

type ScrollStageProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  intensity?: "calm" | "strong";
  enterBlur?: boolean;
  exitBlur?: boolean;
} & Omit<HTMLAttributes<HTMLElement>, "children" | "className">;

/** Zero-JS section shell (formerly GSAP-driven). */
export function ScrollStage({
  children,
  className = "",
  as: Tag = "div",
  intensity: _i,
  enterBlur: _e,
  exitBlur: _x,
  ...rest
}: ScrollStageProps) {
  return (
    <Tag className={`scroll-stage ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}
