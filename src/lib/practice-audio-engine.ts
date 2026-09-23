import type { AudioProgram, DspChain } from "@/lib/practice-exercises/types";

export type PracticePlaybackHandle = { stop: () => void; startTime: number };

let sharedCtx: AudioContext | null = null;
let activeSources: Array<AudioScheduledSourceNode> = [];
let activeNodes: AudioNode[] = [];

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
    try { await sharedCtx.resume(); } catch { /* */ }
  }
  return sharedCtx;
}

export function stopPracticePlayback() {
  for (const s of activeSources) { try { s.stop(); } catch { /* */ } }
  for (const n of activeNodes) { try { n.disconnect(); } catch { /* */ } }
  activeSources = [];
  activeNodes = [];
}

function dbToGain(db: number) { return Math.pow(10, db / 20); }

function buildDsp(ctx: AudioContext, dsp: DspChain, dest: AudioNode): AudioNode {
  if (!dsp || (dsp as { type?: string }).type === "none") return dest;
  const t = (dsp as { type: string }).type;
  if (t === "stack") {
    let d = dest;
    const nodes = (dsp as { nodes: DspChain[] }).nodes || [];
    for (let i = nodes.length - 1; i >= 0; i--) d = buildDsp(ctx, nodes[i], d);
    return d;
  }
  if (t === "peaking" || t === "lowshelf" || t === "highshelf" || t === "lowpass" || t === "highpass" || t === "bandpass") {
    const f = ctx.createBiquadFilter();
    f.type = t as BiquadFilterType;
    const dd = dsp as { frequency?: number; gainDb?: number; q?: number };
    if (dd.frequency != null) f.frequency.value = Math.max(20, Math.min(20000, dd.frequency));
    if (dd.gainDb != null) f.gain.value = dd.gainDb;
    if (dd.q != null) f.Q.value = Math.max(0.1, dd.q);
    f.connect(dest); activeNodes.push(f); return f;
  }
  if (t === "gain") {
    const g = ctx.createGain();
    g.gain.value = dbToGain((dsp as { gainDb?: number }).gainDb ?? 0);
    g.connect(dest); activeNodes.push(g); return g;
  }
  if (t === "pan") {
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, (dsp as { value?: number }).value ?? 0));
    p.connect(dest); activeNodes.push(p); return p;
  }
  if (t === "compressor") {
    const c = ctx.createDynamicsCompressor();
    const dd = dsp as { threshold?: number; ratio?: number; attack?: number; release?: number; knee?: number };
    c.threshold.value = dd.threshold ?? -24;
    c.ratio.value = dd.ratio ?? 4;
    c.attack.value = Math.max(0.001, dd.attack ?? 0.01);
    c.release.value = Math.max(0.01, dd.release ?? 0.25);
    if (dd.knee != null) c.knee.value = dd.knee;
    c.connect(dest); activeNodes.push(c); return c;
  }
  if (t === "delay") {
    const dd = dsp as { timeSec?: number; feedback?: number; mix?: number };
    const delay = ctx.createDelay(2);
    delay.delayTime.value = Math.max(0, Math.min(1.5, dd.timeSec ?? 0.2));
    const fb = ctx.createGain(); fb.gain.value = Math.max(0, Math.min(0.85, dd.feedback ?? 0.25));
    const wet = ctx.createGain(); wet.gain.value = Math.max(0, Math.min(1, dd.mix ?? 0.35));
    const dry = ctx.createGain(); dry.gain.value = 1 - wet.gain.value;
    delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(dest); dry.connect(dest);
    activeNodes.push(delay, fb, wet, dry); return dry;
  }
  if (t === "distort") {
    const sh = ctx.createWaveShaper();
    const drive = Math.max(1, Math.min(40, (dsp as { drive?: number }).drive ?? 4));
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = ((Math.PI + drive) * x) / (Math.PI + drive * Math.abs(x)); }
    sh.curve = curve; sh.connect(dest); activeNodes.push(sh); return sh;
  }
  return dest;
}

function scheduleTone(ctx: AudioContext, freq: number, type: OscillatorType, when: number, dur: number, dest: AudioNode, gainDb = -12) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = Math.max(20, Math.min(16000, freq));
  const peak = dbToGain(gainDb);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(peak, when + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(0.05, dur));
  osc.connect(g); g.connect(dest);
  osc.start(when); osc.stop(when + dur + 0.05);
  activeSources.push(osc); activeNodes.push(g);
}

export async function playExerciseRound(opts: { source: AudioProgram; dsp: DspChain }): Promise<PracticePlaybackHandle | null> {
  stopPracticePlayback();
  const ctx = await getPracticeAudioContext();
  if (!ctx) return null;

  const master = ctx.createGain();
  master.gain.value = 0.85;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -3; limiter.ratio.value = 20; limiter.attack.value = 0.003; limiter.release.value = 0.1;
  master.connect(limiter); limiter.connect(ctx.destination);
  activeNodes.push(master, limiter);

  const input = buildDsp(ctx, opts.dsp, master);
  const t0 = ctx.currentTime + 0.02;
  const src = opts.source;

  if (src.kind === "tone") {
    scheduleTone(ctx, src.frequency, src.type || "sine", t0, src.duration ?? 1.2, input, -10);
  } else if (src.kind === "harmonic") {
    const dur = src.duration ?? 1.2;
    src.partials.forEach((amp, i) => {
      if (amp <= 0) return;
      scheduleTone(ctx, src.fundamental * (i + 1), "sine", t0, dur, input, -14 + 20 * Math.log10(Math.max(0.01, amp)));
    });
  } else if (src.kind === "noise") {
    const seconds = Math.min(3, Math.max(0.3, src.seconds || 1));
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.22;
    const n = ctx.createBufferSource(); n.buffer = buf;
    const g = ctx.createGain(); g.gain.value = 0.55;
    n.connect(g); g.connect(input);
    n.start(t0); n.stop(t0 + seconds);
    activeSources.push(n); activeNodes.push(g);
  } else if (src.kind === "percussion") {
    for (let i = 0; i < src.hits; i++) scheduleTone(ctx, src.toneHz, "square", t0 + i * src.spacing, 0.08, input, -8);
  } else if (src.kind === "loop") {
    const dur = src.duration ?? 1.5;
    const base = src.pattern === "bass" ? 80 : src.pattern === "pluck" ? 440 : src.pattern === "kit" ? 200 : 220;
    scheduleTone(ctx, base, src.pattern === "bass" ? "triangle" : "sine", t0, dur, input, -12);
    if (src.pattern === "kit") scheduleTone(ctx, 1200, "square", t0 + 0.2, 0.05, input, -16);
  } else if (src.kind === "stems") {
    const dur = src.duration ?? 1.5;
    for (const st of src.stems) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, st.pan));
      pan.connect(input); activeNodes.push(pan);
      scheduleTone(ctx, st.toneHz, "sine", t0, dur, pan, st.gainDb ?? -14);
    }
  }

  return { stop: () => stopPracticePlayback(), startTime: t0 };
}
