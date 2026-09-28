/**
 * Practice Audio Engine — reliable Web Audio synthesis for ear-training.
 * Design goals: always audible on desktop + mobile, simple graph, no silent fails.
 */
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
  try {
    if (!sharedCtx || sharedCtx.state === "closed") {
      sharedCtx = new AC();
    }
    if (sharedCtx.state === "suspended") {
      await sharedCtx.resume();
    }
  } catch {
    return sharedCtx;
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

/** Must be called from a user gesture (tap/click). Creates + resumes context. */
export async function unlockPracticeAudio(): Promise<boolean> {
  const AC = getAC();
  if (!AC) return false;
  try {
    if (!sharedCtx || sharedCtx.state === "closed") {
      sharedCtx = new AC();
    }
    if (sharedCtx.state === "suspended") {
      await sharedCtx.resume();
    }
  } catch {
    return false;
  }
  try {
    const o = sharedCtx.createOscillator();
    const g = sharedCtx.createGain();
    g.gain.value = 0.00001;
    o.connect(g).connect(sharedCtx.destination);
    o.start();
    o.stop(sharedCtx.currentTime + 0.04);
  } catch {
    /* */
  }
  return sharedCtx.state === "running" || sharedCtx.state === "suspended";
}

function makeNoise(ctx: AudioContext, seconds: number, color: "white" | "pink" | "brown" = "pink"): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    if (color === "pink") {
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      data[i] = (b0 + b1 + b2 + white * 0.25) * 0.18;
    } else if (color === "brown") {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 4;
    } else {
      data[i] = white * 0.35;
    }
  }
  return buf;
}

function applyDsp(ctx: AudioContext, input: AudioNode, dsp: DspChain | undefined): AudioNode {
  if (!dsp || !dsp.type || dsp.type === "none") return input;
  try {
    if (dsp.type === "filter" || dsp.type === "eq") {
      const f = ctx.createBiquadFilter();
      f.type = (dsp.filterType as BiquadFilterType) || "peaking";
      f.frequency.value = Number(dsp.frequency) || 1000;
      f.Q.value = Number(dsp.Q) || 1;
      f.gain.value = Number(dsp.gain) || 0;
      input.connect(f);
      return f;
    }
    if (dsp.type === "gain") {
      const g = ctx.createGain();
      g.gain.value = Number(dsp.gain) ?? 1;
      input.connect(g);
      return g;
    }
  } catch {
    /* */
  }
  return input;
}

function linEnv(g: GainNode, now: number, duration: number, peak = 0.45) {
  const d = Math.max(0.05, duration);
  g.gain.cancelScheduledValues(now);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(peak, now + Math.min(0.02, d * 0.1));
  g.gain.linearRampToValueAtTime(peak * 0.85, now + d * 0.7);
  g.gain.linearRampToValueAtTime(0.0001, now + d);
}

export async function playExerciseRound(opts: {
  source: AudioProgram;
  dsp: DspChain;
}): Promise<PracticePlaybackHandle | null> {
  stopLiveTone();
  stopPracticePlayback();

  const unlocked = await unlockPracticeAudio();
  const ctx = sharedCtx || (await getPracticeAudioContext());
  if (!ctx) return null;

  try {
    if (ctx.state === "suspended") await ctx.resume();
  } catch {
    if (!unlocked) return null;
  }

  const source = opts.source;
  const dsp = opts.dsp;
  const now = ctx.currentTime + 0.03;
  const scheduled: AudioNode[] = [];

  const stop = () => {
    for (const n of scheduled) {
      try {
        if ("stop" in n && typeof (n as OscillatorNode).stop === "function") {
          (n as OscillatorNode).stop();
        }
        n.disconnect();
      } catch {
        /* */
      }
    }
    scheduled.length = 0;
    if (activeStop === stop) activeStop = null;
  };
  activeStop = stop;

  try {
    const kind = (source as { kind?: string }).kind || (source as { type?: string }).type || "tone";
    const seconds = Math.max(0.25, Number((source as { duration?: number; seconds?: number }).duration || (source as { seconds?: number }).seconds || 1.2));

    if (kind === "noise" || kind === "noise-burst") {
      const buf = makeNoise(ctx, seconds + 0.1, ((source as { color?: string }).color as "white" | "pink" | "brown") || "pink");
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      linEnv(g, now, seconds, 0.35);
      let node: AudioNode = src;
      node = applyDsp(ctx, node, dsp);
      node.connect(g).connect(ctx.destination);
      src.start(now);
      src.stop(now + seconds + 0.05);
      scheduled.push(src, g);
    } else if (kind === "tone" || kind === "sine" || !kind) {
      const toneHz = Math.max(40, Math.min(12000, Number((source as { toneHz?: number; hz?: number }).toneHz || (source as { hz?: number }).hz || 440)));
      const partials = Math.max(1, Math.min(6, Number((source as { partials?: number }).partials) || 1));
      const fund = toneHz;
      for (let i = 0; i < partials; i++) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = i === 0 ? "sine" : "sine";
        o.frequency.value = fund * (i + 1);
        const peak = (0.42 / partials) * (i === 0 ? 1 : 0.45 / (i + 1));
        linEnv(g, now, seconds, peak);
        let node: AudioNode = o;
        if (i === 0) node = applyDsp(ctx, node, dsp);
        else o.connect(g);
        if (i === 0) node.connect(g).connect(ctx.destination);
        else g.connect(ctx.destination);
        o.start(now);
        o.stop(now + seconds + 0.05);
        scheduled.push(o, g);
      }
    } else if (kind === "interval") {
      const intervalHz = Math.max(40, Number((source as { intervalHz?: number }).intervalHz || 440));
      const root = Math.max(40, Number((source as { rootHz?: number }).rootHz || intervalHz / 1.5));
      const gap = 0.35;
      for (const [hz, t0] of [
        [root, now],
        [intervalHz, now + gap + 0.15],
      ] as const) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = hz;
        linEnv(g, t0, 0.55, 0.4);
        o.connect(g).connect(ctx.destination);
        o.start(t0);
        o.stop(t0 + 0.6);
        scheduled.push(o, g);
      }
    } else {
      // fallback audible tone
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 440;
      linEnv(g, now, 0.6, 0.4);
      o.connect(g).connect(ctx.destination);
      o.start(now);
      o.stop(now + 0.65);
      scheduled.push(o, g);
    }
  } catch {
    stop();
    return null;
  }

  return { stop, startTime: now };
}

/** Simple test tone — useful for debugging playback path. */
export async function playTestTone(hz = 440, seconds = 0.5): Promise<boolean> {
  await unlockPracticeAudio();
  const ctx = await getPracticeAudioContext();
  if (!ctx) return false;
  try {
    if (ctx.state !== "running") await ctx.resume();
  } catch {
    return false;
  }
  stopPracticePlayback();
  const now = ctx.currentTime + 0.02;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.value = hz;
  linEnv(g, now, seconds, 0.5);
  o.connect(g).connect(ctx.destination);
  o.start(now);
  o.stop(now + seconds + 0.05);
  activeStop = () => {
    try {
      o.stop();
    } catch {
      /* */
    }
  };
  return true;
}

/** Continuous sine for slider dialing (Dialed-style live feedback). */
let liveOsc: OscillatorNode | null = null;
let liveGain: GainNode | null = null;
let liveCtx: AudioContext | null = null;

export async function startLiveTone(hz: number, peak = 0.28): Promise<boolean> {
  await unlockPracticeAudio();
  const ctx = await getPracticeAudioContext();
  if (!ctx) return false;
  try {
    if (ctx.state !== "running") await ctx.resume();
  } catch {
    /* */
  }
  stopPracticePlayback();
  const safe = Math.max(40, Math.min(16000, Number(hz) || 440));
  try {
    if (liveOsc && liveCtx === ctx) {
      liveOsc.frequency.setTargetAtTime(safe, ctx.currentTime, 0.01);
      if (liveGain) {
        liveGain.gain.cancelScheduledValues(ctx.currentTime);
        liveGain.gain.setTargetAtTime(peak, ctx.currentTime, 0.02);
      }
      return true;
    }
    stopLiveTone();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = safe;
    g.gain.value = 0.0001;
    o.connect(g).connect(ctx.destination);
    o.start();
    g.gain.setTargetAtTime(peak, ctx.currentTime, 0.02);
    liveOsc = o;
    liveGain = g;
    liveCtx = ctx;
    return true;
  } catch {
    stopLiveTone();
    return false;
  }
}

export function setLiveToneHz(hz: number) {
  if (!liveOsc || !liveCtx) return;
  const safe = Math.max(40, Math.min(16000, Number(hz) || 440));
  try {
    liveOsc.frequency.setTargetAtTime(safe, liveCtx.currentTime, 0.012);
  } catch {
    /* */
  }
}

export function stopLiveTone() {
  try {
    if (liveGain && liveCtx) {
      liveGain.gain.cancelScheduledValues(liveCtx.currentTime);
      liveGain.gain.setTargetAtTime(0.0001, liveCtx.currentTime, 0.02);
    }
  } catch {
    /* */
  }
  const o = liveOsc;
  const g = liveGain;
  const ctx = liveCtx;
  liveOsc = null;
  liveGain = null;
  liveCtx = null;
  if (o) {
    try {
      if (ctx) o.stop(ctx.currentTime + 0.06);
      else o.stop();
    } catch {
      try {
        o.disconnect();
      } catch {
        /* */
      }
    }
  }
  if (g) {
    try {
      g.disconnect();
    } catch {
      /* */
    }
  }
}
