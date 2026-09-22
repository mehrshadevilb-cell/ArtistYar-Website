"use client";

import type { CSSProperties, ReactNode } from "react";

type ParallaxProps = {
  children?: ReactNode;
  speed?: number;
  className?: string;
  pointer?: boolean;
};

/**
 * Static compatibility shell.
 *
 * Scroll-driven rAF parallax is disabled so the browser can perform native
 * scrolling without a continuously running animation loop.
 */
export function Parallax({ children, className = "" }: ParallaxProps) {
  return <div className={`parallax-layer ${className}`.trim()}>{children}</div>;
}

type ParallaxHeroProps = {
  children: ReactNode;
  className?: string;
};

export function ParallaxHero({ children, className = "" }: ParallaxHeroProps) {
  const style = {
    "--parallax-y": "0px",
    "--parallax-fade": "1",
    "--parallax-scale": "1",
  } as CSSProperties;

  return (
    <section className={`parallax-hero ${className}`.trim()} style={style}>
      {children}
    </section>
  );
}
