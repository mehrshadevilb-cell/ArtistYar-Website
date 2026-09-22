"use client";

import type { ReactNode } from "react";

type ScrollDepthProps = {
  children: ReactNode;
  className?: string;
  intensity?: number;
};

/**
 * Static compatibility shell.
 *
 * The previous GSAP 3D scroll timeline is intentionally disabled. Keeping the
 * wrapper preserves the existing page structure without intercepting or
 * slowing native scrolling.
 */
export function ScrollDepth({ children, className = "" }: ScrollDepthProps) {
  return (
    <div className={`scroll-depth ${className}`.trim()}>
      {children}
    </div>
  );
}
