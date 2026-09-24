import type { ReactNode } from "react";

type ScrollDepthProps = {
  children: ReactNode;
  className?: string;
  intensity?: number;
};

/** Compatibility shell — no scroll interception. */
export function ScrollDepth({ children, className = "" }: ScrollDepthProps) {
  return <div className={`scroll-depth ${className}`.trim()}>{children}</div>;
}
