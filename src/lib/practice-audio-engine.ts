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
    // Resume whenever possible — browsers only allow this after a user gesture
    if (sharedCtx.state === "suspended") {
      await sharedCtx.resume();
    }
  } catch {
    return sharedCtx; // may still be usable after next gesture
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
    // Create on the gesture path so iOS/Safari allow audio
    if (!sharedCtx || sharedCtx.state === "closed") {
      sharedCtx = new AC();
    }
    if (sharedCtx.state === "suspended") {
      await sharedCtx.resume();
    }
  } catch {
    return false;
  }
  // Quiet oscillator tick — fully unlocks mobile autoplay policies
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
  // Accept suspended: some engines report late; playback still often works
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
  if (!dsp || dsp.type === "none") return input;
  if (dsp.type === "peaking") {
    const f = ctx.createBiquadFilter();
    f.type = "peaking";
    f.frequency.value = Number(dsp.frequency) || 1000;
    f.gain.value = Number(dsp.gainDb) || 0;
    f.Q.value = Number(dsp.q) || 1.2;
    input.connect(f);
    return f;
  }
  if (dsp.type === "gain") {
    const g = ctx.createGain();
    g.gain.value = Math.pow(10, (Number(dsp.gainDb) || 0) / 20);
    input.connect(g);
    return g;
  }
  if (dsp.type === "pan") {
    try {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, Number(dsp.value) || 0));
      input.connect(p);
      return p;
    } catch {
      return input;
    }
  }
  if (dsp.type === "compressor") {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = Number((dsp as { threshold?: number }).threshold) || -28;
    comp.knee.value = Number((dsp as { knee?: number }).knee) || 6;
    comp.ratio.value = Number((dsp as { ratio?: number }).ratio) || 6;
    comp.attack.value = Number((dsp as { attack?: number }).attack) || 0.01;
    comp.release.value = Number((dsp as { release?: number }).release) || 0.2;
    input.connect(comp);
    return comp;
  }
  if (dsp.type === "stack" && Array.isArray(dsp.nodes)) {
    let node: AudioNode = input;
    for (const child of dsp.nodes) node = applyDsp(ctx, node, child as DspChain);
    return node;
  }
  return input;
}

/** Linear envelope — never uses exponentialRamp (avoids silent Web Audio failures). */
function linEnv(g: GainNode, now: number, duration: number, peak = 0.45) {
  const p = Math.max(0.05, Math.min(0.9, peak));
  g.gain.cancelScheduledValues(now);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(p, now + 0.025);
  g.gain.setValueAtTime(p, now + Math.max(0.06, duration - 0.08));
  g.gain.linearRampToValueAtTime(0, now + duration);
}

/**
 * Play one exercise round. Always tries to produce audible output.
 */
export async function playExerciseRound(opts: {
  source: AudioProgram;
  dsp: DspChain;
}): Promise<PracticePlaybackHandle | null> {
  stopPracticePlayback();

  const unlocked = await unlockPracticeAudio();
  const ctx = sharedCtx || (await getPracticeAudioContext());
  if (!ctx) return null;

  try {
    if (ctx.state === "suspended") await ctx.resume();
  } catch {
    if (!unlocked) return null;
  }

  // Proceed even if state is still "suspended" — scheduling often still produces audio
  const now = Math.max(0, ctx.currentTime) + 0.02;
  const scheduled: Array<OscillatorNode | AudioBufferSourceNode> = [];
  const master = ctx.createGain();
  master.gain.value = 0.7;
  master.connect(ctx.destination);

  const source = opts.source;
  const dsp = opts.dsp || { type: "none" };

  const stop = () => {
    for (const s of scheduled) {
      try {
        s.stop();
      } catch {
        /* */
      }
      try {
        s.disconnect();
      } catch {
        /* */
      }
    }
    scheduled.length = 0;
    try {
      master.disconnect();
    } catch {
      /* */
    }
    activeStop = null;
  };
  activeStop = stop;

  try {
    if (source.kind === "noise") {
      const seconds = Math.min(4, Math.max(0.5, source.seconds || 1.2));
      const buf = makeNoise(ctx, seconds, source.color || "pink");
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      linEnv(g, now, seconds, 0.5);
      const processed = applyDsp(ctx, src, dsp);
      processed.connect(g).connect(master);
      src.start(now);
      src.stop(now + seconds + 0.05);
      scheduled.push(src);
    } else if (source.kind === "harmonic") {
      const duration = Math.min(3, Math.max(0.45, source.duration || 1.0));
      const fund = Math.max(40, Math.min(16000, source.fundamental || 440));
      const partials = source.partials?.length ? source.partials : [1, 0.35, 0.15];
      const intervalHz = Number((source as { intervalHz?: number }).intervalHz) || 0;
      const mix = ctx.createGain();
      mix.gain.value = 1;
      const processed = applyDsp(ctx, mix, dsp);
      const outG = ctx.createGain();
      const totalDur = intervalHz > 40 ? duration * 2 + 0.2 : duration;
      linEnv(outG, now, totalDur, 0.55);
      processed.connect(outG).connect(master);
      partials.forEach((amp, i) => {
        const o = ctx.createOscillator();
        const pg = ctx.createGain();
        o.type = "sine";
        o.frequency.value = fund * (i + 1);
        pg.gain.value = Math.max(0, Math.min(1, Number(amp) || 0));
        o.connect(pg).connect(mix);
        o.start(now);
        o.stop(now + duration + 0.05);
        scheduled.push(o);
      });
      if (intervalHz > 40) {
        const t2 = now + duration + 0.18;
        partials.forEach((amp, i) => {
          const o = ctx.createOscillator();
          const pg = ctx.createGain();
          o.type = "sine";
          o.frequency.value = intervalHz * (i + 1);
          pg.gain.value = Math.max(0, Math.min(1, Number(amp) || 0));
          o.connect(pg).connect(mix);
          o.start(t2);
          o.stop(t2 + duration + 0.05);
          scheduled.push(o);
        });
      }
    } else if (source.kind === "percussion") {
      const hits = Math.min(8, Math.max(1, source.hits || 3));
      const spacing = Math.max(0.12, source.spacing || 0.35);
      const toneHz = Math.max(60, Math.min(8000, source.toneHz || 200));
      for (let h = 0; h < hits; h++) {
        const t = now + h * spacing;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(toneHz, t);
        o.frequency.linearRampToValueAtTime(toneHz * 0.45, t + 0.1);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.55, t + 0.008);
        g.gain.linearRampToValueAtTime(0, t + 0.16);
        const processed = applyDsp(ctx, o, dsp);
        processed.connect(g).connect(master);
        o.start(t);
        o.stop(t + 0.2);
        scheduled.push(o);
      }
    } else if (source.kind === "loop") {
      const duration = Math.min(3, Math.max(0.8, source.duration || 1.5));
      const patterns: Record<string, number[]> = {
        pad: [220, 277, 330, 440],
        pluck: [330, 392, 494],
        bass: [55, 82, 110],
        kit: [80, 160, 240],
      };
      const freqs = patterns[source.pattern] || patterns.pad;
      const mix = ctx.createGain();
      const processed = applyDsp(ctx, mix, dsp);
      const outG = ctx.createGain();
      linEnv(outG, now, duration, 0.45);
      processed.connect(outG).connect(master);
      freqs.forEach((hz, i) => {
        const o = ctx.createOscillator();
        const pg = ctx.createGain();
        o.type = source.pattern === "bass" ? "sawtooth" : source.pattern === "pluck" ? "triangle" : "sine";
        o.frequency.value = hz;
        pg.gain.value = 0.22 / freqs.length + (i === 0 ? 0.1 : 0);
        o.connect(pg).connect(mix);
        o.start(now);
        o.stop(now + duration + 0.05);
        scheduled.push(o);
      });
    } else if (source.kind === "stems") {
      const duration = Math.min(3, Math.max(0.8, source.duration || 1.5));
      (source.stems || []).forEach((stem) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = Math.max(40, Math.min(12000, stem.toneHz || 220));
        const gainLin = Math.pow(10, (Number(stem.gainDb) || 0) / 20) * 0.25;
        linEnv(g, now, duration, Math.min(0.5, gainLin));
        try {
          const panner = ctx.createStereoPanner();
          panner.pan.value = Math.max(-1, Math.min(1, Number(stem.pan) || 0));
          o.connect(g).connect(panner);
          const processed = applyDsp(ctx, panner, dsp);
          processed.connect(master);
        } catch {
          o.connect(g).connect(master);
        }
        o.start(now);
        o.stop(now + duration + 0.05);
        scheduled.push(o);
      });
    } else {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 440;
      linEnv(g, now, 0.6, 0.4);
      o.connect(g).connect(master);
      o.start(now);
      o.stop(now + 0.65);
      scheduled.push(o);
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
