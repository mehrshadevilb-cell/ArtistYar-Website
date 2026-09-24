/**
 * Client-side audio measurement for Music Analyzer.
 * Pure Web Audio — no external DSP libs.
 * Approximations are labeled; never presented as ITU-certified meters.
 */

export type BandEnergy = {
  sub: number;
  low: number;
  lowMid: number;
  mid: number;
  presence: number;
  high: number;
  air: number;
};

/** One log-spaced spectrum bin (for chart) */
export type SpectrumBin = {
  hz: number;
  /** relative energy 0–1 within this measurement */
  energy: number;
  /** dB relative to peak bin */
  db: number;
};

export type LoudnessPoint = {
  t: number;
  /** approx short-term loudness (dB relative scale, not certified LUFS) */
  shortTermDb: number;
  rmsDb: number;
  peakDb: number;
  lowEnergyPct: number;
};

export type AudioMetrics = {
  durationSec: number;
  sampleRate: number;
  channels: number;
  peakDbfs: number;
  /** Inter-sample peak approximation — not a full oversampled True Peak meter */
  truePeakDbfs: number | null;
  truePeakIsApprox: true;
  rmsDbfs: number;
  crestFactorDb: number;
  stereoCorrelation: number | null;
  stereoWidth: number | null;
  spectralCentroidHz: number | null;
  lowEnergyPct: number | null;
  midEnergyPct: number | null;
  highEnergyPct: number | null;
  clipPct: number | null;
  bandEnergy: BandEnergy | null;
  /** K-weighted RMS approximation — label as تقریبی in UI */
  approxLufs: number | null;
  lufsIsApprox: true;
  /** Loudness range proxy from short-term windows (dB) */
  loudnessRangeProxy: number | null;
  headroomDb: number | null;
  /** Log-spaced spectrum for visualization (~20 Hz–20 kHz) */
  spectrum: SpectrumBin[] | null;
  /** Time-varying loudness / energy (~0.4 s windows) */
  loudnessTimeline: LoudnessPoint[] | null;
};

export type EnergyTimelinePoint = {
  t: number;
  rmsDb: number;
  peakDb: number;
};

export type ArrangementFeatures = {
  energyTimeline: EnergyTimelinePoint[];
  bpmEstimate: number | null;
  bpmConfidence: number;
  /** Alternate BPM candidate (e.g. half/double) when close */
  bpmAlternate: number | null;
  sectionCandidates: Array<{
    startSec: number;
    endSec: number;
    label: string;
    energyDb: number;
    confidence: number;
  }>;
  avgRmsDb: number;
  energyVariance: number;
  lowMidHighBySection: Array<{
    startSec: number;
    endSec: number;
    low: number;
    mid: number;
    high: number;
  }>;
};

const toDb = (v: number) => 20 * Math.log10(Math.max(v, 1e-12));

function fftMag(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wlenRe = Math.cos(ang);
    const wlenIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wRe = 1;
      let wIm = 0;
      for (let j = 0; j < len / 2; j++) {
        const uRe = re[i + j];
        const uIm = im[i + j];
        const vRe = re[i + j + len / 2] * wRe - im[i + j + len / 2] * wIm;
        const vIm = re[i + j + len / 2] * wIm + im[i + j + len / 2] * wRe;
        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[i + j + len / 2] = uRe - vRe;
        im[i + j + len / 2] = uIm - vIm;
        const nwRe = wRe * wlenRe - wIm * wlenIm;
        wIm = wRe * wlenIm + wIm * wlenRe;
        wRe = nwRe;
      }
    }
  }
  const mag = new Float64Array(n / 2);
  for (let k = 0; k < n / 2; k++) mag[k] = re[k] * re[k] + im[k] * im[k];
  return mag;
}

/** Build log-spaced bins from linear FFT magnitude power */
function buildLogSpectrum(magSum: Float64Array, sr: number, nFft: number, binCount = 64): SpectrumBin[] {
  const bins: SpectrumBin[] = [];
  const fMin = 20;
  const fMax = Math.min(20000, sr / 2 - 1);
  let peak = 1e-18;
  for (let b = 0; b < binCount; b++) {
    const t0 = b / binCount;
    const t1 = (b + 1) / binCount;
    const hz0 = fMin * Math.pow(fMax / fMin, t0);
    const hz1 = fMin * Math.pow(fMax / fMin, t1);
    const k0 = Math.max(1, Math.floor((hz0 * nFft) / sr));
    const k1 = Math.min(magSum.length - 1, Math.ceil((hz1 * nFft) / sr));
    let e = 0;
    for (let k = k0; k <= k1; k++) e += magSum[k] || 0;
    const hz = Math.sqrt(hz0 * hz1);
    bins.push({ hz, energy: e, db: 0 });
    if (e > peak) peak = e;
  }
  for (const bin of bins) {
    bin.energy = bin.energy / peak;
    bin.db = toDb(Math.sqrt(Math.max(bin.energy, 1e-18)));
  }
  return bins;
}

export async function measureAudio(file: File): Promise<AudioMetrics> {
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) throw new Error("Web Audio API در این مرورگر فعال نیست.");
  const ctx = new AC();
  try {
    const ab = await file.arrayBuffer();
    if (!ab || ab.byteLength < 100) throw new Error("فایل صوتی خالی یا خراب است.");
    const buffer = await ctx.decodeAudioData(ab.slice(0));
    if (!buffer || buffer.length < 64) throw new Error("دیکود فایل ناموفق بود.");
    const sr = buffer.sampleRate;
    const nCh = buffer.numberOfChannels;
    const left = buffer.getChannelData(0);
    const right = nCh > 1 ? buffer.getChannelData(1) : left;
    const totalLen = buffer.length;

    const peakStride = Math.max(1, Math.floor(totalLen / 3_000_000));
    let peak = 0;
    let truePeak = 0;
    let clipCount = 0;
    let peakCount = 0;
    for (let i = 0; i < totalLen; i += peakStride) {
      const l = left[i] ?? 0;
      const r = right[i] ?? l;
      const al = Math.abs(l);
      const ar = Math.abs(r);
      if (al > peak) peak = al;
      if (ar > peak) peak = ar;
      if (i + peakStride < totalLen) {
        const l2 = left[i + peakStride] ?? 0;
        const r2 = right[i + peakStride] ?? l2;
        const ml = Math.abs((l + l2) * 0.5);
        const mr = Math.abs((r + r2) * 0.5);
        if (ml > truePeak) truePeak = ml;
        if (mr > truePeak) truePeak = mr;
        if (Math.abs(l2) > truePeak) truePeak = Math.abs(l2);
        if (Math.abs(r2) > truePeak) truePeak = Math.abs(r2);
      }
      if (al > truePeak) truePeak = al;
      if (ar > truePeak) truePeak = ar;
      if (al >= 0.99 || ar >= 0.99) clipCount++;
      peakCount++;
    }
    if (truePeak < peak) truePeak = peak;

    const rmsStride = Math.max(1, Math.floor(totalLen / 1_800_000));
    const hpR = Math.exp((-2 * Math.PI * 38) / sr);
    const shelfG = 1.585;
    let sumSq = 0;
    let sumSqK = 0;
    let sumL = 0;
    let sumR = 0;
    let sumLR = 0;
    let sumMid = 0;
    let sumSide = 0;
    let rmsCount = 0;
    let prevX = 0;
    let prevHp = 0;
    for (let i = 0; i < totalLen; i += rmsStride) {
      const l = left[i] ?? 0;
      const r = right[i] ?? l;
      const mid = (l + r) * 0.5;
      const side = (l - r) * 0.5;
      sumSq += mid * mid;
      sumMid += mid * mid;
      sumSide += side * side;
      if (nCh > 1) {
        sumL += l * l;
        sumR += r * r;
        sumLR += l * r;
      }
      const hp = mid - prevX + hpR * prevHp;
      prevX = mid;
      prevHp = hp;
      const kSample = hp + (hp - mid * 0.15) * (shelfG - 1) * 0.35;
      sumSqK += kSample * kSample;
      rmsCount++;
    }
    if (rmsCount < 10) throw new Error("نمونه‌برداری کافی از فایل انجام نشد.");

    const rms = Math.sqrt(sumSq / rmsCount);
    const rmsK = Math.sqrt(sumSqK / rmsCount);
    const corr = nCh > 1 ? sumLR / Math.sqrt(Math.max(1e-18, sumL * sumR)) : null;
    const stereoWidth = nCh > 1 ? sumSide / Math.max(1e-18, sumMid + sumSide) : null;
    const clipPct = peakCount ? (clipCount / peakCount) * 100 : 0;
    const peakDbfs = toDb(peak);
    const truePeakDbfs = toDb(truePeak);
    const rmsDbfs = toDb(rms);
    const crestFactorDb = Math.max(0, peakDbfs - rmsDbfs);
    let approxLufs = toDb(rmsK) - 0.691;
    if (!Number.isFinite(approxLufs)) approxLufs = rmsDbfs - 0.691;
    approxLufs = Math.max(-70, Math.min(0, approxLufs));

    const N = 2048;
    const bands = { sub: 0, low: 0, lowMid: 0, mid: 0, presence: 0, high: 0, air: 0 };
    let weighted = 0;
    let energy = 0;
    const magSum = new Float64Array(N / 2);
    let spectrum: SpectrumBin[] | null = null;
    if (totalLen >= N) {
      const frameCount = Math.min(24, Math.max(10, Math.floor(totalLen / (N * 4))));
      const re = new Float64Array(N);
      const im = new Float64Array(N);
      for (let f = 0; f < frameCount; f++) {
        if (f > 0 && f % 4 === 0) await new Promise((r) => setTimeout(r, 0));
        const start = Math.floor((totalLen - N) * (f / Math.max(1, frameCount - 1)));
        for (let n = 0; n < N; n++) {
          const x = ((left[start + n] ?? 0) + (right[start + n] ?? 0)) * 0.5;
          const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (N - 1));
          re[n] = x * w;
          im[n] = 0;
        }
        const mag = fftMag(re, im);
        for (let k = 1; k < N / 2; k++) {
          const hz = (k * sr) / N;
          if (hz < 20 || hz > 18000) continue;
          const m2 = mag[k];
          if (!(m2 > 0)) continue;
          magSum[k] += m2;
          weighted += hz * m2;
          energy += m2;
          if (hz < 60) bands.sub += m2;
          else if (hz < 250) bands.low += m2;
          else if (hz < 500) bands.lowMid += m2;
          else if (hz < 2000) bands.mid += m2;
          else if (hz < 5000) bands.presence += m2;
          else if (hz < 10000) bands.high += m2;
          else bands.air += m2;
        }
      }
      spectrum = buildLogSpectrum(magSum, sr, N, 72);
    }
    const bandTotal =
      bands.sub + bands.low + bands.lowMid + bands.mid + bands.presence + bands.high + bands.air || 1;
    const pct = (v: number) => (v / bandTotal) * 100;

    const winSec = 0.4;
    const winSamples = Math.max(512, Math.floor(sr * winSec));
    const hop = winSamples;
    const loudnessTimeline: LoudnessPoint[] = [];
    const shortTerms: number[] = [];
    for (let start = 0; start + winSamples < totalLen; start += hop) {
      let sum = 0;
      let peakW = 0;
      let lowE = 0;
      let allE = 0;
      const step = Math.max(1, Math.floor(winSamples / 600));
      let n = 0;
      for (let i = start; i < start + winSamples; i += step) {
        const m = Math.abs(((left[i] ?? 0) + (right[i] ?? 0)) * 0.5);
        sum += m * m;
        if (m > peakW) peakW = m;
        n++;
      }
      for (let i = start; i + 4 < start + winSamples; i += step * 4) {
        const a = ((left[i] ?? 0) + (right[i] ?? 0)) * 0.5;
        const b = ((left[i + 4] ?? 0) + (right[i + 4] ?? 0)) * 0.5;
        const lf = Math.abs((a + b) * 0.5);
        const hf = Math.abs(a - b);
        lowE += lf * lf;
        allE += lf * lf + hf * hf;
      }
      const rmsW = Math.sqrt(sum / Math.max(1, n));
      const st = toDb(rmsW) - 0.691;
      shortTerms.push(st);
      loudnessTimeline.push({
        t: start / sr,
        shortTermDb: st,
        rmsDb: toDb(rmsW),
        peakDb: toDb(peakW),
        lowEnergyPct: allE > 0 ? (lowE / allE) * 100 : 0,
      });
      if (loudnessTimeline.length % 25 === 0) await new Promise((r) => setTimeout(r, 0));
    }

    let loudnessRangeProxy: number | null = null;
    if (shortTerms.length >= 8) {
      const sorted = [...shortTerms].sort((a, b) => a - b);
      const p10 = sorted[Math.floor(sorted.length * 0.1)]!;
      const p95 = sorted[Math.floor(sorted.length * 0.95)]!;
      loudnessRangeProxy = Math.max(0, Math.min(40, p95 - p10));
    }

    return {
      durationSec: buffer.duration,
      sampleRate: sr,
      channels: nCh,
      peakDbfs,
      truePeakDbfs,
      truePeakIsApprox: true,
      rmsDbfs,
      crestFactorDb,
      stereoCorrelation: corr == null ? null : Math.max(-1, Math.min(1, corr)),
      stereoWidth: stereoWidth == null ? null : Math.max(0, Math.min(1, stereoWidth)),
      spectralCentroidHz: energy > 0 ? weighted / energy : null,
      lowEnergyPct: pct(bands.sub + bands.low),
      midEnergyPct: pct(bands.lowMid + bands.mid + bands.presence),
      highEnergyPct: pct(bands.high + bands.air),
      clipPct,
      bandEnergy: {
        sub: pct(bands.sub),
        low: pct(bands.low),
        lowMid: pct(bands.lowMid),
        mid: pct(bands.mid),
        presence: pct(bands.presence),
        high: pct(bands.high),
        air: pct(bands.air),
      },
      approxLufs,
      lufsIsApprox: true,
      loudnessRangeProxy,
      headroomDb: Number.isFinite(peakDbfs) ? Math.max(0, -peakDbfs) : null,
      spectrum,
      loudnessTimeline: loudnessTimeline.length ? loudnessTimeline : null,
    };
  } finally {
    try {
      await ctx.close();
    } catch {
      /* ignore */
    }
  }
}

export async function extractArrangementFeatures(file: File): Promise<ArrangementFeatures> {
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) throw new Error("Web Audio API در این مرورگر فعال نیست.");
  const ctx = new AC();
  try {
    const ab = await file.arrayBuffer();
    const buffer = await ctx.decodeAudioData(ab.slice(0));
    const sr = buffer.sampleRate;
    const left = buffer.getChannelData(0);
    const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
    const totalLen = buffer.length;
    const duration = buffer.duration;

    const winSec = 0.25;
    const winSamples = Math.max(256, Math.floor(sr * winSec));
    const hop = winSamples;
    const timeline: EnergyTimelinePoint[] = [];
    const envelope: number[] = [];

    for (let start = 0; start + winSamples < totalLen; start += hop) {
      let sum = 0;
      let peak = 0;
      const step = Math.max(1, Math.floor(winSamples / 800));
      let n = 0;
      for (let i = start; i < start + winSamples; i += step) {
        const m = Math.abs(((left[i] ?? 0) + (right[i] ?? 0)) * 0.5);
        sum += m * m;
        if (m > peak) peak = m;
        n++;
      }
      const rms = Math.sqrt(sum / Math.max(1, n));
      timeline.push({ t: start / sr, rmsDb: toDb(rms), peakDb: toDb(peak) });
      envelope.push(rms);
      if (timeline.length % 40 === 0) await new Promise((r) => setTimeout(r, 0));
    }

    const avgRms =
      timeline.length > 0
        ? timeline.reduce((a, p) => a + Math.pow(10, p.rmsDb / 20), 0) / timeline.length
        : 0;
    const avgRmsDb = toDb(avgRms || 1e-12);
    const variance =
      timeline.length > 1
        ? timeline.reduce((a, p) => a + (p.rmsDb - avgRmsDb) ** 2, 0) / timeline.length
        : 0;

    const sectionCandidates: ArrangementFeatures["sectionCandidates"] = [];
    if (timeline.length >= 4) {
      const threshold = 3.5;
      let segStart = 0;
      let segSum = timeline[0]!.rmsDb;
      let segCount = 1;
      for (let i = 1; i < timeline.length; i++) {
        const jump = Math.abs(timeline[i]!.rmsDb - timeline[i - 1]!.rmsDb);
        if (jump > threshold && i - segStart >= 4) {
          const energyDb = segSum / segCount;
          const startSec = timeline[segStart]!.t;
          const endSec = timeline[i - 1]!.t;
          const conf = Math.min(0.85, 0.35 + Math.min(jump, 8) / 12);
          sectionCandidates.push({
            startSec,
            endSec,
            label: labelFromEnergy(energyDb, avgRmsDb, startSec, duration),
            energyDb,
            confidence: conf,
          });
          segStart = i;
          segSum = timeline[i]!.rmsDb;
          segCount = 1;
        } else {
          segSum += timeline[i]!.rmsDb;
          segCount++;
        }
      }
      if (segCount >= 2) {
        const energyDb = segSum / segCount;
        sectionCandidates.push({
          startSec: timeline[segStart]!.t,
          endSec: timeline[timeline.length - 1]!.t,
          label: labelFromEnergy(energyDb, avgRmsDb, timeline[segStart]!.t, duration),
          energyDb,
          confidence: 0.4,
        });
      }
    }

    let bpmEstimate: number | null = null;
    let bpmConfidence = 0;
    let bpmAlternate: number | null = null;
    if (envelope.length > 32) {
      const hopSec = winSec;
      const minLag = Math.max(1, Math.floor(60 / (180 * hopSec)));
      const maxLag = Math.min(envelope.length >> 1, Math.floor(60 / (60 * hopSec)));
      let bestLag = 0;
      let bestCorr = -1;
      let secondLag = 0;
      let secondCorr = -1;
      const mean = envelope.reduce((a, b) => a + b, 0) / envelope.length;
      for (let lag = minLag; lag <= maxLag; lag++) {
        let num = 0;
        let d1 = 0;
        let d2 = 0;
        for (let i = 0; i + lag < envelope.length; i++) {
          const a = envelope[i]! - mean;
          const b = envelope[i + lag]! - mean;
          num += a * b;
          d1 += a * a;
          d2 += b * b;
        }
        const c = num / Math.sqrt(Math.max(1e-18, d1 * d2));
        if (c > bestCorr) {
          secondCorr = bestCorr;
          secondLag = bestLag;
          bestCorr = c;
          bestLag = lag;
        } else if (c > secondCorr) {
          secondCorr = c;
          secondLag = lag;
        }
      }
      if (bestLag > 0 && bestCorr > 0.15) {
        const periodSec = bestLag * hopSec;
        bpmEstimate = Math.round(60 / periodSec);
        bpmConfidence = Math.max(0, Math.min(1, (bestCorr - 0.15) / 0.55));
        if (secondLag > 0 && secondCorr > 0.2) {
          bpmAlternate = Math.round(60 / (secondLag * hopSec));
          if (bpmAlternate === bpmEstimate) bpmAlternate = null;
        }
      }
    }

    return {
      energyTimeline: timeline,
      bpmEstimate,
      bpmConfidence,
      bpmAlternate,
      sectionCandidates,
      avgRmsDb,
      energyVariance: variance,
      lowMidHighBySection: [],
    };
  } finally {
    try {
      await ctx.close();
    } catch {
      /* ignore */
    }
  }
}

function labelFromEnergy(energyDb: number, avg: number, startSec: number, duration: number): string {
  const rel = energyDb - avg;
  const pos = duration > 0 ? startSec / duration : 0;
  if (pos < 0.08 && rel < -2) return "Intro (احتمالی)";
  if (pos > 0.88) return "Outro (احتمالی)";
  if (rel > 3) return "Chorus / اوج (احتمالی)";
  if (rel < -3) return "Breakdown / خلوت (احتمالی)";
  if (rel > 0.5) return "Verse+ / بخش پرتر (احتمالی)";
  return "Verse / بخش میانی (احتمالی)";
}

export function formatDb(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v.toFixed(digits)} dB`;
}
