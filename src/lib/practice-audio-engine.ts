/**
 * ArtistYar Practice — shared Web Audio foundation (Phase 1).
 *
 * Goals:
 * - Single shared AudioContext (resume-safe)
 * - Deterministic, cancellable playback with no overlapping sources
 * - Normalized level + safety limiter (no clipping)
 * - Clean disconnect / stop on cancel, unmount, or next play
 * - Ready for Phase 2 SoundGym exercises (EQ, filter, dynamics, reverb, etc.)
 */

export type PracticePlaybackHandle = {
  stop: () => void;
  startTime: number;
};

type MasterBus = {
  input: AudioNode;
  master: GainNode;
  limiter: DynamicsCompressorNode;
  disconnect: () => void;
};

let sharedCtx: AudioContext | null = null;
let activeStop: (() => void) | null = null;
const activeSources: Array<AudioScheduledSourceNode> = [];

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  return window.AudioContext || w.webkitAudioContext || null;
}

export async function getPracticeAudioContext(): Promise<AudioContext | null> {
  const AC = getAudioContextCtor();
  if (!AC) return null;
  sharedCtx ||= new AC();
  if (sharedCtx.state === "suspended") {
    try {
      await sharedCtx.resume();
    } catch {
      /* */
    }
  }
  return sharedCtx.state === "running" || sharedCtx.state === "suspended" ? sharedCtx : null;
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
  for (const source of activeSources) {
    try {
      source.stop();
    } catch {
      /* */
    }
    try {
      source.disconnect();
    } catch {
      /* */
    }
  }
  activeSources.length = 0;
}

function trackSource(source: AudioScheduledSourceNode) {
  activeSources.push(source);
}

export function createPracticeMasterBus(ctx: AudioContext): MasterBus {
  const master = ctx.createGain();
  master.gain.value = 0.55;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.knee.value = 4;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.12;
  limiter.connect(master);
  master.connect(ctx.destination);
  return {
    input: limiter,
    master,
    limiter,
    disconnect: () => {
      try {
        limiter.disconnect();
      } catch {
        /* */
      }
      try {
        master.disconnect();
      } catch {
        /* */
      }
    },
  };
}

export function createNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function practiceSeeded(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function practiceShuffle<T>(items: readonly T[], seed: number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(practiceSeeded(seed + i * 19) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function beginPracticePlayback(): Promise<{
  ctx: AudioContext;
  bus: MasterBus;
  now: number;
  handle: PracticePlaybackHandle;
} | null> {
  stopPracticePlayback();
  const ctx = await getPracticeAudioContext();
  if (!ctx) return null;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return null;
    }
  }
  if (ctx.state !== "running") return null;
  const bus = createPracticeMasterBus(ctx);
  const now = ctx.currentTime + 0.03;
  const scheduled: AudioScheduledSourceNode[] = [];
  const stop = () => {
    for (const source of scheduled) {
      try {
        source.stop();
      } catch {
        /* */
      }
      try {
        source.disconnect();
      } catch {
        /* */
      }
    }
    scheduled.length = 0;
    bus.disconnect();
    if (activeStop === stop) activeStop = null;
  };
  activeStop = stop;
  const handle: PracticePlaybackHandle = { stop, startTime: now };
  const track = (source: AudioScheduledSourceNode) => {
    scheduled.push(source);
    trackSource(source);
  };
  (handle as PracticePlaybackHandle & { _track?: (s: AudioScheduledSourceNode) => void })._track = track;
  return { ctx, bus, now, handle };
}

export function registerPracticeSource(
  handle: PracticePlaybackHandle,
  source: AudioScheduledSourceNode,
) {
  const withTrack = handle as PracticePlaybackHandle & { _track?: (s: AudioScheduledSourceNode) => void };
  if (withTrack._track) withTrack._track(source);
  else trackSource(source);
}

export function safeExpGain(gain: AudioParam, value: number, time: number) {
  const v = Math.max(0.0001, value);
  gain.exponentialRampToValueAtTime(v, time);
}

export async function playPracticeTone(opts: {
  frequency: number;
  durationSec?: number;
  type?: OscillatorType;
  peakGain?: number;
}): Promise<PracticePlaybackHandle | null> {
  const session = await beginPracticePlayback();
  if (!session) return null;
  const { ctx, bus, now, handle } = session;
  const duration = opts.durationSec ?? 1.2;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = opts.type || "sine";
  osc.frequency.value = opts.frequency;
  g.gain.setValueAtTime(0.0001, now);
  safeExpGain(g.gain, opts.peakGain ?? 0.35, now + 0.02);
  safeExpGain(g.gain, 0.0001, now + duration);
  osc.connect(g).connect(bus.input);
  osc.start(now);
  osc.stop(now + duration + 0.05);
  registerPracticeSource(handle, osc);
  return handle;
}

export async function disposePracticeAudio() {
  stopPracticePlayback();
  if (sharedCtx) {
    try {
      await sharedCtx.close();
    } catch {
      /* */
    }
    sharedCtx = null;
  }
}
