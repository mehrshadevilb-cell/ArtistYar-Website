"use client";

/** Soft floating orbs — Bixa-like atmosphere on a dark canvas. */
export function AmbientBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="ambient-orb ambient-orb-a" />
      <div className="ambient-orb ambient-orb-b" />
      <div className="ambient-orb ambient-orb-c" />
      <div className="absolute inset-0 bg-grid-faint bg-grid opacity-[0.35]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-gold-500/30 to-transparent" />
    </div>
  );
}
