/**
 * Practice Audio Engine — Web Audio synthesis for ear-training rounds.
 * source → DSP chain → safety limiter → master gain → destination
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
  sharedCtx ||= new AC();
  if (sharedCtx.state === "suspended") {
    try { await sharedCtx.resume(); } catch { /* user gesture required */ }
  }
  return sharedCtx.state === "running" || sharedCtx.state === "suspended" ? sharedCtx : null;
}

export function stopPracticePlayback() {
  if (activeStop) {
    try { activeStop(); } catch { /* */ }
    activeStop = null;
  }
}

/** Call from a user gesture (tap) so iOS/Android allow audio. */
export async function unlockPracticeAudio(): Promise<boolean> {
  const ctx = await getPracticeAudioContext();
  if (!ctx) return false;
  if (ctx.state === "suspended") {
    try { await ctx.resume(); } catch { return false; }
  }
  // Silent buffer tick to fully unlock some mobile browsers
  try {
    const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    src.connect(g).connect(ctx.destination);
    src.start(0);
  } catch { /* ignore */ }
  return ctx.state === "running" || ctx.state === "suspended";
}

function makeNoise(ctx: AudioContext, seconds: number, color: "white" | "pink" | "brown" = "white"): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    if (color === "pink") {
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      data[i] = (b0 + b1 + b2 + white * 0.3) * 0.11;
    } else if (color === "brown") {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else {
      data[i] = white;
    }
  }
  return buf;
}

function applyDsp(ctx: AudioContext, input: AudioNode, dsp: DspChain): AudioNode {
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
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, Number(dsp.value) || 0));
    input.connect(p);
    return p;
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

function createMasterBus(ctx: AudioContext) {
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.knee.value = 4;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.12;
  const master = ctx.createGain();
  master.gain.value = 0.55;
  limiter.connect(master);
  master.connect(ctx.destination);
  return {
    input: limiter as AudioNode,
    disconnect: () => {
      try { limiter.disconnect(); } catch { /* */ }
      try { master.disconnect(); } catch { /* */ }
    },
  };
}

function scheduleEnvelope(g: GainNode, now: number, duration: number, peak = 0.35) {
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(peak, now + 0.02);
  g.gain.setValueAtTime(peak, now + Math.max(0.05, duration - 0.08));
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
}

export async function playExerciseRound(opts: {
  source: AudioProgram;
  dsp: DspChain;
}): Promise<PracticePlaybackHandle | null> {
  stopPracticePlayback();
  const ctx = await getPracticeAudioContext();
  if (!ctx) return null;
  if (ctx.state === "suspended") {
    try { await ctx.resume(); } catch { return null; }
  }
  if (ctx.state !== "running") return null;

  const now = ctx.currentTime + 0.03;
  const scheduled: Array<OscillatorNode | AudioBufferSourceNode> = [];
  const bus = createMasterBus(ctx);
  const source = opts.source;
  const dsp = opts.dsp || { type: "none" };

  const stop = () => {
    for (const s of scheduled) {
      try { s.stop(); } catch { /* */ }
      try { s.disconnect(); } catch { /* */ }
    }
    scheduled.length = 0;
    bus.disconnect();
    activeStop = null;
  };
  activeStop = stop;

  try {
    if (source.kind === "noise") {
      const seconds = Math.min(4, Math.max(0.4, source.seconds || 1.2));
      const buf = makeNoise(ctx, seconds, source.color || "white");
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      scheduleEnvelope(g, now, seconds, 0.28);
      const processed = applyDsp(ctx, src, dsp);
      processed.connect(g).connect(bus.input);
      src.start(now);
      src.stop(now + seconds + 0.05);
      scheduled.push(src);
    } else if (source.kind === "harmonic") {
      const duration = Math.min(3, Math.max(0.4, source.duration || 1.2));
      const fund = Math.max(40, Math.min(16000, source.fundamental || 440));
      const partials = source.partials?.length ? source.partials : [1, 0.4, 0.2];
      const intervalHz = Number((source as { intervalHz?: number }).intervalHz) || 0;
      const mix = ctx.createGain();
      mix.gain.value = 1;
      const processed = applyDsp(ctx, mix, dsp);
      const outG = ctx.createGain();
      const totalDur = intervalHz > 0 ? duration * 2 + 0.18 : duration;
      scheduleEnvelope(outG, now, totalDur, 0.32);
      processed.connect(outG).connect(bus.input);
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
        const t2 = now + duration + 0.15;
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
        o.frequency.exponentialRampToValueAtTime(toneHz * 0.4, t + 0.12);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.4, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        const processed = applyDsp(ctx, o, dsp);
        processed.connect(g).connect(bus.input);
        o.start(t);
        o.stop(t + 0.22);
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
      scheduleEnvelope(outG, now, duration, 0.28);
      processed.connect(outG).connect(bus.input);
      freqs.forEach((hz, i) => {
        const o = ctx.createOscillator();
        const pg = ctx.createGain();
        o.type = source.pattern === "bass" ? "sawtooth" : source.pattern === "pluck" ? "triangle" : "sine";
        o.frequency.value = hz;
        pg.gain.value = 0.2 / freqs.length + (i === 0 ? 0.08 : 0);
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
        const panner = ctx.createStereoPanner();
        o.type = "sine";
        o.frequency.value = Math.max(40, Math.min(12000, stem.toneHz || 220));
        const gainLin = Math.pow(10, (Number(stem.gainDb) || 0) / 20) * 0.2;
        scheduleEnvelope(g, now, duration, Math.min(0.4, gainLin));
        panner.pan.value = Math.max(-1, Math.min(1, Number(stem.pan) || 0));
        o.connect(g).connect(panner);
        const processed = applyDsp(ctx, panner, dsp);
        processed.connect(bus.input);
        o.start(now);
        o.stop(now + duration + 0.05);
        scheduled.push(o);
      });
    }
  } catch {
    stop();
    return null;
  }

  return { stop, startTime: now };
}
