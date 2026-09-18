"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  AudioLines,
  Check,
  Layers,
  Play,
  Sparkles,
  Waves,
  Zap,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { usePracticeAccess } from "@/components/usePracticeAccess";

type SkillId = "reverb" | "saturation" | "masking" | "transient";

type ProQuestion = {
  skill: SkillId;
  prompt: string;
  hint: string;
  answer: string;
  options: string[];
  audio: Record<string, number | string>;
  tier: number;
};

const SKILLS: Array<{
  id: SkillId;
  title: string;
  desc: string;
  icon: typeof Waves;
  color: string;
}> = [
  { id: "reverb", title: "Reverb Sense", desc: "Room · Hall · Plate · Decay · Pre-delay", icon: Waves, color: "text-cyan-300" },
  { id: "saturation", title: "Saturation", desc: "Clean · Warm · Tape · Heavy · Distorted", icon: Zap, color: "text-orange-300" },
  { id: "masking", title: "Masking", desc: "Sub · Low-mid · Presence · Air", icon: Layers, color: "text-violet-300" },
  { id: "transient", title: "Transient", desc: "Attack تند/نرم · Punch · Soft · Sustain", icon: AudioLines, color: "text-gold-300" },
];

function seeded(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function shuffled<T>(items: readonly T[], seed: number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(seeded(seed + i * 19) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** XP + round → 0 beginner … 3 expert */
function tierFromXp(xp: number, round: number): number {
  if (xp < 50 && round < 5) return 0;
  if (xp < 150 && round < 12) return 1;
  if (xp < 320) return 2;
  return 3;
}

const TIER_LABELS = [
  "مبتدی · تفاوت‌های واضح",
  "مقدماتی · جزئیات بیشتر",
  "متوسط · تشخیص دقیق",
  "حرفه‌ای · تفاوت‌های ظریف",
];

/* ─── Large progressive banks ─── */

const REVERB_BANK: ProQuestion[] = [
  // tier 0
  { skill: "reverb", tier: 0, prompt: "آیا این نمونه dry است یا با reverb؟", hint: "به دم بعد از قطع نت گوش کن.", answer: "بدون Reverb", options: ["Room کوتاه", "Hall بلند", "Plate فلزی", "بدون Reverb"], audio: { type: "dry", decay: 0.05, mix: 0, preDelay: 0 } },
  { skill: "reverb", tier: 0, prompt: "دم کوتاه و نزدیک = کدام فضا؟", hint: "Room معمولاً decay زیر ۰.۶s دارد.", answer: "Room کوتاه", options: ["Room کوتاه", "Hall بلند", "Plate فلزی", "بدون Reverb"], audio: { type: "room", decay: 0.4, mix: 0.38, preDelay: 0.008 } },
  { skill: "reverb", tier: 0, prompt: "فضای بزرگ و طولانی را پیدا کن.", hint: "Hall decay بلند و نرم دارد.", answer: "Hall بلند", options: ["Room کوتاه", "Hall بلند", "Plate فلزی", "بدون Reverb"], audio: { type: "hall", decay: 2.6, mix: 0.48, preDelay: 0.025 } },
  // tier 1
  { skill: "reverb", tier: 1, prompt: "رنگ فلزی و denser را تشخیص بده.", hint: "Plate معمولاً کمی metallic و سریع‌تر می‌نشیند.", answer: "Plate فلزی", options: ["Room کوتاه", "Hall بلند", "Plate فلزی", "بدون Reverb"], audio: { type: "plate", decay: 1.15, mix: 0.42, preDelay: 0.012 } },
  { skill: "reverb", tier: 1, prompt: "این reverb بیشتر شبیه کدام است؟", hint: "به طول دم و رنگ early reflections گوش کن.", answer: "Room کوتاه", options: ["Room کوتاه", "Hall بلند", "Plate فلزی", "Cathedral"], audio: { type: "room", decay: 0.55, mix: 0.36, preDelay: 0.01 } },
  { skill: "reverb", tier: 1, prompt: "فضای خیلی بزرگ (کلیسا/سالن) را بشنو.", hint: "Cathedral = decay خیلی بلند + pre-delay بیشتر.", answer: "Cathedral", options: ["Room کوتاه", "Hall بلند", "Plate فلزی", "Cathedral"], audio: { type: "hall", decay: 3.8, mix: 0.55, preDelay: 0.045 } },
  // tier 2
  { skill: "reverb", tier: 2, prompt: "میزان wet/dry را تخمین بزن — mix حدود ۴۰٪.", hint: "اگر dry هنوز واضح است ولی دم شنیده می‌شود ≈ ۴۰٪.", answer: "Mix متوسط (~40%)", options: ["تقریباً Dry", "Mix متوسط (~40%)", "Wet غالب", "فقط Wet"], audio: { type: "hall", decay: 1.8, mix: 0.4, preDelay: 0.02 } },
  { skill: "reverb", tier: 2, prompt: "pre-delay نسبتاً بلند را حس کن.", hint: "فاصلهٔ زمانی قبل از شروع دم = pre-delay.", answer: "Pre-delay بلند", options: ["Pre-delay کوتاه", "Pre-delay بلند", "بدون pre-delay", "فقط dry"], audio: { type: "hall", decay: 2.2, mix: 0.45, preDelay: 0.06 } },
  { skill: "reverb", tier: 2, prompt: "Plate کوتاه و درخشان را پیدا کن.", hint: "Plate کوتاه denser و کمی bright است.", answer: "Plate فلزی", options: ["Room کوتاه", "Hall بلند", "Plate فلزی", "Cathedral"], audio: { type: "plate", decay: 0.85, mix: 0.4, preDelay: 0.008 } },
  // tier 3
  { skill: "reverb", tier: 3, prompt: "تفاوت ظریف Room vs Plate کوتاه.", hint: "Plate denser و کمی metallic؛ Room طبیعی‌تر.", answer: "Plate فلزی", options: ["Room کوتاه", "Hall بلند", "Plate فلزی", "بدون Reverb"], audio: { type: "plate", decay: 0.7, mix: 0.35, preDelay: 0.006 } },
  { skill: "reverb", tier: 3, prompt: "Hall با decay متوسط و pre-delay کم.", hint: "دم حدود ۱.۴s و شروع تقریباً فوری.", answer: "Hall متوسط", options: ["Room کوتاه", "Hall متوسط", "Plate فلزی", "Cathedral"], audio: { type: "hall", decay: 1.4, mix: 0.4, preDelay: 0.012 } },
  { skill: "reverb", tier: 3, prompt: "آیا دم بعد از نت هنوز شنیده می‌شود؟", hint: "اگر دم کاملاً قطع شده = dry یا mix خیلی کم.", answer: "بدون Reverb", options: ["Room کوتاه", "Hall بلند", "Plate فلزی", "بدون Reverb"], audio: { type: "dry", decay: 0.04, mix: 0, preDelay: 0 } },
];

const SAT_BANK: ProQuestion[] = [
  { skill: "saturation", tier: 0, prompt: "کدام سطح saturation شنیده می‌شود؟", hint: "اگر تقریباً سینوسی و تمیز است = Clean.", answer: "Clean", options: ["Clean", "Warm", "Heavy", "Distorted"], audio: { drive: 1.0 } },
  { skill: "saturation", tier: 0, prompt: "گرمای ملایم را پیدا کن.", hint: "هارمونیک‌های نرم و قله‌های گرد = Warm.", answer: "Warm", options: ["Clean", "Warm", "Heavy", "Distorted"], audio: { drive: 2.4 } },
  { skill: "saturation", tier: 1, prompt: "اشباع سنگین را تشخیص بده.", hint: "هارمونیک‌های زیاد + تراکم دینامیک.", answer: "Heavy", options: ["Clean", "Warm", "Heavy", "Distorted"], audio: { drive: 4.8 } },
  { skill: "saturation", tier: 1, prompt: "این نمونه چقدر خراب/خشن است؟", hint: "اگر clipping واضح و خشن است = Distorted.", answer: "Distorted", options: ["Clean", "Warm", "Heavy", "Distorted"], audio: { drive: 9.2 } },
  { skill: "saturation", tier: 2, prompt: "Tape-like saturation ملایم را بشنو.", hint: "کمی soft-clip + هارمونیک زوج.", answer: "Warm", options: ["Clean", "Warm", "Heavy", "Distorted"], audio: { drive: 2.8 } },
  { skill: "saturation", tier: 2, prompt: "بین Heavy و Distorted کدام نزدیک‌تر است؟", hint: "اگر هنوز نت قابل تشخیص است ولی فشرده = Heavy.", answer: "Heavy", options: ["Clean", "Warm", "Heavy", "Distorted"], audio: { drive: 5.5 } },
  { skill: "saturation", tier: 3, prompt: "تفاوت ظریف Clean vs Warm خیلی ملایم.", hint: "فقط کمی گرد شدن قله‌ها.", answer: "Warm", options: ["Clean", "Warm", "Heavy", "Distorted"], audio: { drive: 1.7 } },
  { skill: "saturation", tier: 3, prompt: "saturation خیلی خشن و broken.", hint: "شکل موج کاملاً clipped و خشن.", answer: "Distorted", options: ["Clean", "Warm", "Heavy", "Distorted"], audio: { drive: 12 } },
];

const MASK_BANK: ProQuestion[] = [
  { skill: "masking", tier: 0, prompt: "انرژی اضافه کجاست؟", hint: "لرزش قفسه سینه = sub.", answer: "Sub (~60Hz)", options: ["Sub (~60Hz)", "Low-mid (~250Hz)", "Presence (~3kHz)", "Air (~10kHz)"], audio: { band: 60, gain: 11 } },
  { skill: "masking", tier: 0, prompt: "کدام باند بیشتر ماسک می‌کند؟", hint: "به جایی که جزئیات گم می‌شود گوش کن.", answer: "Low-mid (~250Hz)", options: ["Sub (~60Hz)", "Low-mid (~250Hz)", "Presence (~3kHz)", "Air (~10kHz)"], audio: { band: 250, gain: 10 } },
  { skill: "masking", tier: 1, prompt: "ماسک در کدام ناحیه قوی‌تر است؟", hint: "اگر وضوح کلمات/ترنزینت کم شد = presence.", answer: "Presence (~3kHz)", options: ["Sub (~60Hz)", "Low-mid (~250Hz)", "Presence (~3kHz)", "Air (~10kHz)"], audio: { band: 3000, gain: 9 } },
  { skill: "masking", tier: 1, prompt: "درخشش اضافه در کجا شنیده می‌شود؟", hint: "خش‌خش بالا = air.", answer: "Air (~10kHz)", options: ["Sub (~60Hz)", "Low-mid (~250Hz)", "Presence (~3kHz)", "Air (~10kHz)"], audio: { band: 10000, gain: 8 } },
  { skill: "masking", tier: 2, prompt: "ماسک mid (~800Hz) را پیدا کن.", hint: "جعبه/muddy شدن = mid.", answer: "Mid (~800Hz)", options: ["Sub (~60Hz)", "Low-mid (~250Hz)", "Mid (~800Hz)", "Presence (~3kHz)"], audio: { band: 800, gain: 9 } },
  { skill: "masking", tier: 2, prompt: "Presence vs Air — کدام غالب است؟", hint: "Presence = وضوح؛ Air = درخشش خیلی بالا.", answer: "Presence (~3kHz)", options: ["Low-mid (~250Hz)", "Presence (~3kHz)", "Air (~10kHz)", "Sub (~60Hz)"], audio: { band: 3200, gain: 8.5 } },
  { skill: "masking", tier: 3, prompt: "ماسک ظریف low-mid.", hint: "فقط کمی mud بدون غرق کامل.", answer: "Low-mid (~250Hz)", options: ["Sub (~60Hz)", "Low-mid (~250Hz)", "Presence (~3kHz)", "Air (~10kHz)"], audio: { band: 280, gain: 6.5 } },
  { skill: "masking", tier: 3, prompt: "Air خیلی ملایم را تشخیص بده.", hint: "فقط کمی درخشش اضافه در بالا.", answer: "Air (~10kHz)", options: ["Sub (~60Hz)", "Low-mid (~250Hz)", "Presence (~3kHz)", "Air (~10kHz)"], audio: { band: 12000, gain: 5.5 } },
];

const TRANS_BANK: ProQuestion[] = [
  // tier 0 — واضح
  { skill: "transient", tier: 0, prompt: "شکل attack را تشخیص بده.", hint: "قلهٔ اول چقدر تند است؟", answer: "Attack تند", options: ["Attack تند", "Attack نرم", "Sustain بلند", "Release سریع"], audio: { attack: 0.0015, sustain: 0.28, hits: 3, shape: "click" } },
  { skill: "transient", tier: 0, prompt: "ورود تدریجی = کدام؟", hint: "اگر صدا آرام بالا می‌آید = نرم.", answer: "Attack نرم", options: ["Attack تند", "Attack نرم", "Sustain بلند", "Release سریع"], audio: { attack: 0.14, sustain: 0.45, hits: 2, shape: "soft" } },
  // tier 1
  { skill: "transient", tier: 1, prompt: "بدنهٔ صدا بعد از attack چطور است؟", hint: "اگر نت طولانی می‌ماند = sustain بلند.", answer: "Sustain بلند", options: ["Attack تند", "Attack نرم", "Sustain بلند", "Release سریع"], audio: { attack: 0.008, sustain: 1.15, hits: 1, shape: "pad" } },
  { skill: "transient", tier: 1, prompt: "قطع شدن سریع صدا را بشنو.", hint: "دم خیلی کوتاه = release سریع.", answer: "Release سریع", options: ["Attack تند", "Attack نرم", "Sustain بلند", "Release سریع"], audio: { attack: 0.006, sustain: 0.12, hits: 3, shape: "click" } },
  { skill: "transient", tier: 1, prompt: "Punch قوی (attack تند + sustain کوتاه).", hint: "مثل snare کوتاه و محکم.", answer: "Attack تند", options: ["Attack تند", "Attack نرم", "Sustain بلند", "Release سریع"], audio: { attack: 0.002, sustain: 0.18, hits: 4, shape: "punch" } },
  // tier 2
  { skill: "transient", tier: 2, prompt: "Soft pad با attack خیلی نرم.", hint: "ورود آرام و بدنه‌دار.", answer: "Attack نرم", options: ["Attack تند", "Attack نرم", "Sustain بلند", "Release سریع"], audio: { attack: 0.22, sustain: 0.9, hits: 1, shape: "pad" } },
  { skill: "transient", tier: 2, prompt: "چند ضربهٔ سریع با attack تند.", hint: "به قله‌های اول هر ضربه گوش کن.", answer: "Attack تند", options: ["Attack تند", "Attack نرم", "Sustain بلند", "Release سریع"], audio: { attack: 0.0025, sustain: 0.14, hits: 5, shape: "click" } },
  { skill: "transient", tier: 2, prompt: "Sustain خیلی بلند (pad).", hint: "صدا مدت طولانی نگه داشته می‌شود.", answer: "Sustain بلند", options: ["Attack تند", "Attack نرم", "Sustain بلند", "Release سریع"], audio: { attack: 0.04, sustain: 1.6, hits: 1, shape: "pad" } },
  // tier 3 — ظریف
  { skill: "transient", tier: 3, prompt: "تفاوت ظریف attack متوسط vs نرم.", hint: "attack حدود ۶۰ms هنوز نسبتاً نرم است.", answer: "Attack نرم", options: ["Attack تند", "Attack نرم", "Sustain بلند", "Release سریع"], audio: { attack: 0.06, sustain: 0.5, hits: 2, shape: "soft" } },
  { skill: "transient", tier: 3, prompt: "Release خیلی سریع بعد از قله.", hint: "قله تند ولی دم تقریباً صفر.", answer: "Release سریع", options: ["Attack تند", "Attack نرم", "Sustain بلند", "Release سریع"], audio: { attack: 0.003, sustain: 0.08, hits: 4, shape: "click" } },
  { skill: "transient", tier: 3, prompt: "Punch با sustain کمی بلندتر.", hint: "قله تند + بدنهٔ کوتاه ولی نه خیلی کوتاه.", answer: "Attack تند", options: ["Attack تند", "Attack نرم", "Sustain بلند", "Release سریع"], audio: { attack: 0.002, sustain: 0.32, hits: 3, shape: "punch" } },
];

function pickQuestion(skill: SkillId, tier: number, seed: number): ProQuestion {
  const banks: Record<SkillId, ProQuestion[]> = {
    reverb: REVERB_BANK,
    saturation: SAT_BANK,
    masking: MASK_BANK,
    transient: TRANS_BANK,
  };
  const pool = banks[skill].filter((q) => q.tier <= tier);
  const usable = pool.length ? pool : banks[skill];
  const idx = Math.floor(seeded(seed) * usable.length);
  const base = usable[idx];
  const opts = shuffled(base.options, seed + 41);
  return { ...base, options: opts };
}

/* ─── Audio engine ─── */

let sharedCtx: AudioContext | null = null;
async function getCtx() {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  sharedCtx ||= new AC();
  if (sharedCtx.state === "suspended") await sharedCtx.resume();
  return sharedCtx;
}

async function playPro(q: ProQuestion) {
  const c = await getCtx();
  if (!c) return;
  const now = c.currentTime;

  if (q.skill === "reverb") {
    const type = String(q.audio.type || "room");
    const decay = Number(q.audio.decay) || 0.8;
    const mix = Number(q.audio.mix) || 0.3;
    const preDelay = Number(q.audio.preDelay) || 0;

    // Dry path: short note
    const osc = c.createOscillator();
    const dryGain = c.createGain();
    const wetGain = c.createGain();
    const master = c.createGain();

    osc.type = "sawtooth";
    osc.frequency.value = 196;

    // Independent envelopes so wet tail survives after dry stops
    dryGain.gain.setValueAtTime(0.0001, now);
    dryGain.gain.exponentialRampToValueAtTime(0.2 * (1 - mix), now + 0.025);
    dryGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    wetGain.gain.setValueAtTime(0.0001, now);
    wetGain.gain.exponentialRampToValueAtTime(0.22 * mix, now + 0.03);
    // Keep wet open long enough for full decay
    const wetHold = Math.max(0.6, decay + preDelay + 0.35);
    wetGain.gain.setValueAtTime(0.22 * mix, now + 0.35);
    wetGain.gain.exponentialRampToValueAtTime(0.0001, now + wetHold);

    master.gain.value = 1;

    osc.connect(dryGain);
    dryGain.connect(master);

    if (type !== "dry" && c.createConvolver) {
      const len = Math.floor(c.sampleRate * Math.min(4.5, Math.max(0.2, decay + 0.4)));
      const impulse = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = impulse.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          const t = i / c.sampleRate;
          const env = Math.exp(-t / Math.max(0.12, decay * 0.62));
          const noise = (Math.random() * 2 - 1) * env;
          const bright = type === "plate" ? 1.45 : type === "hall" ? 0.85 : 1.05;
          // slight stereo decorrelation
          d[i] = noise * bright * (ch === 0 ? 1 : 0.88 + seeded(i + ch) * 0.08);
        }
      }
      const conv = c.createConvolver();
      conv.buffer = impulse;

      const delay = c.createDelay(0.2);
      delay.delayTime.value = Math.min(0.15, Math.max(0, preDelay));

      osc.connect(wetGain);
      wetGain.connect(delay);
      delay.connect(conv);
      conv.connect(master);
    }

    master.connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.48);
    return;
  }

  if (q.skill === "saturation") {
    const drive = Number(q.audio.drive) || 1;
    const osc = c.createOscillator();
    const shaper = c.createWaveShaper();
    const gain = c.createGain();
    const curve = new Float32Array(512);
    for (let i = 0; i < 512; i++) {
      const x = i / 256 - 1;
      curve[i] = Math.tanh(x * drive);
    }
    shaper.curve = curve;
    osc.type = "sine";
    osc.frequency.value = 185;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
    osc.connect(shaper).connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + 1.2);
    return;
  }

  if (q.skill === "masking") {
    const band = Number(q.audio.band) || 250;
    const g = Number(q.audio.gain) || 8;
    const length = Math.floor(c.sampleRate * 1.55);
    const buffer = c.createBuffer(1, length, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const t = i / c.sampleRate;
      const fade = Math.min(1, i / (c.sampleRate * 0.04), (length - i) / (c.sampleRate * 0.08));
      // rich source so masking is obvious
      const src =
        (Math.random() * 2 - 1) * 0.18 +
        Math.sin(2 * Math.PI * 220 * t) * 0.1 +
        Math.sin(2 * Math.PI * 440 * t) * 0.07 +
        Math.sin(2 * Math.PI * 880 * t) * 0.04;
      data[i] = src * fade;
    }
    const srcNode = c.createBufferSource();
    const filter = c.createBiquadFilter();
    const out = c.createGain();
    srcNode.buffer = buffer;
    filter.type = "peaking";
    filter.frequency.value = band;
    filter.Q.value = band < 120 ? 0.65 : band > 5000 ? 1.8 : 1.25;
    filter.gain.value = g;
    out.gain.value = 0.38;
    srcNode.connect(filter).connect(out).connect(c.destination);
    srcNode.start(now);
    srcNode.stop(now + 1.55);
    return;
  }

  // Transient — multiple hits for clarity
  const attack = Number(q.audio.attack) || 0.01;
  const sustain = Number(q.audio.sustain) || 0.35;
  const hits = Math.max(1, Math.min(6, Number(q.audio.hits) || 1));
  const shape = String(q.audio.shape || "click");
  const gap = shape === "pad" ? 0 : 0.22;

  for (let h = 0; h < hits; h++) {
    const t0 = now + h * (attack + sustain + gap + 0.05);
    const osc = c.createOscillator();
    const noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.08), c.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    const noiseSrc = c.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    const noiseGain = c.createGain();
    const toneGain = c.createGain();
    const out = c.createGain();

    osc.type = shape === "pad" ? "triangle" : "square";
    osc.frequency.value = shape === "pad" ? 110 : 95;

    // Tone envelope
    toneGain.gain.setValueAtTime(0.0001, t0);
    toneGain.gain.exponentialRampToValueAtTime(0.2, t0 + Math.max(0.0015, attack));
    toneGain.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.04, attack) + sustain);

    // Click/noise for punch (short)
    if (shape === "click" || shape === "punch") {
      noiseGain.gain.setValueAtTime(0.0001, t0);
      noiseGain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.002);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.02, attack * 2));
      noiseSrc.connect(noiseGain).connect(out);
      noiseSrc.start(t0);
      noiseSrc.stop(t0 + 0.09);
    }

    out.gain.value = 0.9;
    osc.connect(toneGain).connect(out);
    out.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + attack + sustain + 0.06);
  }
}

export function ProArcadeLab({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { loading: checking, stageLimit, pro, subscriptionDays, proExpiresAt } = usePracticeAccess();
  const [skill, setSkill] = useState<SkillId | null>(null);
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [played, setPlayed] = useState(false);
  const [xp, setXp] = useState(0);

  const stageNumber = round + 1;
  const stageLocked = !checking && stageNumber > stageLimit;

  const choose = useCallback(
    async (opt: string) => {
      if (!question || picked) return;
      setPicked(opt);
      const ok = opt === question.answer;
      const delta = ok ? 20 : -8;
      try {
        const saved = JSON.parse(localStorage.getItem("artistyar_arcade_score") || "{}");
        const next = Math.max(0, Number(saved.score || 0) + delta);
        localStorage.setItem("artistyar_arcade_score", JSON.stringify({ ...saved, score: next }));
        setXp(next);
      } catch {
        /* */
      }
      if (user?.id) {
        try {
          await fetch("/api/practice/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              userId: user.id,
              username: user.username,
              fullName: user.fullName,
              telegramId: user.telegramId,
              gameId: `pro-${question.skill}`,
              score: delta,
              accuracy: ok ? 100 : 0,
              streak: ok ? 1 : 0,
              bestScore: ok ? 20 : 0,
              metadata: {
                source: "pro_arcade",
                skill: question.skill,
                answer: question.answer,
                tier,
                progressive: true,
                randomized: true,
                wrongPenalty: !ok,
              },
            }),
          });
        } catch {
          /* offline */
        }
      }
    },
    [question, picked, user, tier],
  );

  if (checking) {
    return (
      <section className="mt-10">
        <button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>
          بازگشت
        </button>
        <div className="card-ay mt-5 p-8 text-center text-sm text-ink-400">در حال بررسی دسترسی Pro…</div>
      </section>
    );
  }

  if (stageLocked) {
    return (
      <section className="mt-10">
        <button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>بازگشت</button>
        <div className="card-ay mt-5 p-8 text-center">
          <p className="eyebrow text-gold-300">PRACTICE STAGE LIMIT</p>
          <h1 className="mt-3 text-2xl font-semibold text-sand-50">سقف مراحل این تمرین رسید</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-8 text-ink-400">
            بدون اشتراک ۵ مرحله در دسترس است. با اشتراک، تعداد مراحل این تمرین برابر با مدت اشتراک است{proExpiresAt ? " و اشتراک تا " + new Date(proExpiresAt).toLocaleDateString("fa-IR") + " فعال است." : "."}
          </p>
          <p className="mt-4 text-sm text-gold-200">{pro ? `اشتراک فعال · ${subscriptionDays} مرحله` : "برای ادامه، اشتراک فعال کن."}</p>
        </div>
      </section>
    );
  }

  if (!skill || !question) {
    return (
      <section className="mt-10">
        <button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>
          <ArrowRight size={14} /> بازگشت
        </button>
        <div className="mt-5 overflow-hidden rounded-3xl border border-gold-400/20 bg-gradient-to-br from-gold-400/[.1] via-white/[.03] to-cyan-400/[.06] p-6 sm:p-10">
          <p className="eyebrow text-gold-300">PRO ARCADE · ADAPTIVE · RANDOMIZED</p>
          <h1 className="mt-3 text-2xl font-semibold text-sand-50">Professional Audio Skills</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-300">
            چهار مسیر شنیداری میکس. سوال‌ها بر اساس XP از آسان به expert پیش می‌روند، ترتیب گزینه‌ها تصادفی است، و پاسخ غلط = −۸ XP.
          </p>
          <p className="mt-2 text-xs text-gold-200/80">
            XP فعلی: {xp} · سطح فعلی: {TIER_LABELS[tierFromXp(xp, 0)]}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {SKILLS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  className="card-ay group p-5 text-right transition hover:-translate-y-0.5 hover:border-gold-400/35"
                  onClick={() => {
                    setSkill(s.id);
                    setRound(0);
                    setPicked(null);
                    setPlayed(false);
                  }}
                >
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[.04] ${s.color}`}>
                    <Icon size={22} />
                  </span>
                  <strong className="mt-4 block text-lg text-sand-50">{s.title}</strong>
                  <p className="mt-2 text-sm text-ink-400">{s.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  const meta = SKILLS.find((s) => s.id === skill)!;
  const Icon = meta.icon;
  const correct = picked === question.answer;

  return (
    <section className="mt-10">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>
          بازگشت به هاب
        </button>
        <button
          type="button"
          className="btn-ghost !px-4 !py-2 text-xs"
          onClick={() => {
            setSkill(null);
            setPicked(null);
            setPlayed(false);
          }}
        >
          چهار مهارت
        </button>
      </div>

      <div className="card-ay mt-5 p-6 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">
              PRO · {meta.title.toUpperCase()} · ROUND {round + 1} · {TIER_LABELS[tier]}
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-sand-50">{question.prompt}</h1>
            <p className="mt-2 text-sm text-ink-400">{question.hint}</p>
            <p className="mt-1 text-xs text-ink-500">XP {xp} · گزینه‌ها تصادفی · غلط = −۸ XP</p>
          </div>
          <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[.04] ${meta.color}`}>
            <Icon size={22} />
          </span>
        </div>

        <button
          type="button"
          className="btn-primary mt-6"
          onClick={() => {
            void playPro(question);
            setPlayed(true);
          }}
        >
          <Play size={15} fill="currentColor" /> {played ? "پخش دوباره" : "پخش نمونه"}
        </button>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {question.options.map((opt) => {
            const isPick = picked === opt;
            const isCorrect = picked !== null && opt === question.answer;
            return (
              <button
                key={opt}
                type="button"
                disabled={picked !== null}
                onClick={() => void choose(opt)}
                className={`rounded-xl border p-4 text-sm transition ${
                  isCorrect
                    ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-100"
                    : isPick
                      ? "border-red-400/40 bg-red-400/10 text-red-100"
                      : "border-white/10 text-ink-200 hover:border-gold-400/40"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {picked !== null && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <p className={`flex items-center gap-2 text-sm ${correct ? "text-emerald-200" : "text-red-200"}`}>
              <Check size={15} />
              {correct ? "درست! +۲۰ XP" : `نادرست! −۸ XP · پاسخ: ${question.answer}`}
            </p>
            <button
              type="button"
              className="btn-primary !px-4 !py-2 text-xs"
              onClick={() => {
                setRound((r) => r + 1);
                setPicked(null);
                setPlayed(false);
              }}
            >
              <Sparkles size={13} /> سوال تصادفی بعدی
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
