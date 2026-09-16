"use client";

export function ScrollCue() {
  return (
    <div className="mt-14 flex flex-col items-center gap-2 text-ink-500">
      <span className="text-[10px] uppercase tracking-[0.28em]">اسکرول کن</span>
      <span className="scroll-cue-line" />
    </div>
  );
}
