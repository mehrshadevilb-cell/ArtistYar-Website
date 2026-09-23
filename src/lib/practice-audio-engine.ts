import type { AudioProgram, DspChain } from "@/lib/practice-exercises/types";

export type PracticePlaybackHandle = { stop: () => void; startTime: number };

let sharedCtx: AudioContext | null = null;
let activeStop: (() => void) | null = null;

function getAC(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  return window.AudioContext || w.webkitAudioContext || null;
}

export async function getPracticeAudioContext(): Promise<AudioContext | null> {
  const AC = getAC();
  if (!AC) return null;
  sharedCtx ||= new AC();
  if (sharedCtx.state === "suspended") {
    try {
      await sharedCtx.resume();
    } catch {
      /* */
    }
  }
  return sharedCtx;
}

export function stopPracticePlayback() {
  if (activeStop) {
    try {
      activeStop();
    } catch {
      /* */
    }
    activeStop = null;
  }
}

export async function playExerciseRound(_opts: {
  source: AudioProgram;
  dsp: DspChain;
}): Promise<PracticePlaybackHandle | null> {
  stopPracticePlayback();
  const ctx = await getPracticeAudioContext();
  if (!ctx) return null;
  const stop = () => {
    activeStop = null;
  };
  activeStop = stop;
  return { stop, startTime: ctx.currentTime };
}
