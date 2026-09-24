import type { CSSProperties, ReactNode } from "react";

type DepthSceneProps = {
  children: ReactNode;
  className?: string;
};

/** Static hero art stage — no client JS. */
export function DepthScene({ children, className = "" }: DepthSceneProps) {
  const style = {
    "--depth-rotate-x": "0deg",
    "--depth-rotate-y": "0deg",
    "--depth-shift-y": "0px",
    "--depth-glow": "0.12",
    pointerEvents: "none",
  } as CSSProperties;

  return (
    <div className={`depth-scene ${className}`.trim()} style={style} aria-hidden="true">
      <div className="depth-scene-grid" aria-hidden="true" />
      <div className="depth-scene-content">{children}</div>
    </div>
  );
}
