/**
 * Shared client-side audio measurement for Music Analyzer.
 * Used by both Mix & Mastering and Arrangement analyzers.
 * Pure Web Audio — no external DSP libs.
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

export type AudioMetrics = {
  durationSec: number;
  sampleRate: number;
  channels: number;
  peakDbfs: number;
  truePeakDbfs: number | null;
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
  approxLufs: number | null;
  loudnessRangeProxy: number | null;
  /** Headroom to 0 dBFS */
  headroomDb: number | null;
};

/** Energy / RMS samples over time for structure & arrangement */
export type EnergyTimelinePoint = {
  t: number; // seconds
  rmsDb: number;
  peakDb: number;
};

export type ArrangementFeatures = {
  energyTimeline: EnergyTimelinePoint[];
  bpmEstimate: number | null;
  bpmConfidence: number; // 0–1
  sectionCandidates: Array<{ startSec: number; endSec: number; label: string; energyDb: number }>;
  avgRmsDb: number;
  energyVariance: number;
  lowMidHighBySection: Array<{ startSec: number; endSec: number; low: number; mid: number; high: number }>;
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
    const wlenRe = Math.cos(ang),
      wlenIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wRe = 1,
        wIm = 0;
      for (let j = 0; j < len / 2; j++) {
        const uRe = re[i + j],
          uIm = im[i + j];
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

/** Core technical metrics for Mix & Mastering (and shared) */
export async function measureAudio(file: File): Promise<AudioMetrics> {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
    let peak = 0,
      truePeak = 0,
      clipCount = 0,
      peakCount = 0;
    for (let i = 0; i < totalLen; i += peakStride) {
      const l = left[i] ?? 0,
        r = right[i] ?? l;
      const al = Math.abs(l),
        ar = Math.abs(r);
      if (al > peak) peak = al;
      if (ar > peak) peak = ar;
      if (i + peakStride < totalLen) {
        const l2 = left[i + peakStride] ?? 0,
          r2 = right[i + peakStride] ?? l2;
        const ml = Math.abs((l + l2) * 0.5),
          mr = Math.abs((r + r2) * 0.5);
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
    let sumSq = 0,
      sumSqK = 0,
      sumL = 0,
      sumR = 0,
      sumLR = 0,
      sumMid = 0,
      sumSide = 0;
    let rmsCount = 0;
    let prevX = 0,
      prevHp = 0;
    for (let i = 0; i < totalLen; i += rmsStride) {
      const l = left[i] ?? 0,
        r = right[i] ?? l;
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
    let weighted = 0,
      energy = 0;
    if (totalLen >= N) {
      const frameCount = Math.min(20, Math.max(8, Math.floor(totalLen / (N * 4))));
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
    }
    const bandTotal = bands.sub + bands.low + bands.lowMid + bands.mid + bands.presence + bands.high + bands.air || 1;
    const pct = (v: number) => (v / bandTotal) * 100;

    return {
      durationSec: buffer.duration,
      sampleRate: sr,
      channels: nCh,
      peakDbfs,
      truePeakDbfs,
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
      loudnessRangeProxy: null,
      headroomDb: Number.isFinite(peakDbfs) ? Math.max(0, -peakDbfs) : null,
    };
  } finally {
    try {
      await ctx.close();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Arrangement-focused features: energy timeline, coarse section candidates, BPM estimate.
 * BPM is a low-confidence envelope autocorrelation — always surface confidence to the user.
 */
export async function extractArrangementFeatures(file: File): Promise<ArrangementFeatures> {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

    // ~0.25s windows for energy timeline
    const winSec = 0.25;
    const winSamples = Math.max(256, Math.floor(sr * winSec));
    const hop = winSamples;
    const timeline: EnergyTimelinePoint[] = [];
    const envelope: number[] = [];

    for (let start = 0; start + winSamples < totalLen; start += hop) {
      let sum = 0,
        peak = 0;
      const step = Math.max(1, Math.floor(winSamples / 800));
      let n = 0;
      for (let i = start; i < start + winSamples; i += step) {
        const m = Math.abs(((left[i] ?? 0) + (right[i] ?? 0)) * 0.5);
        sum += m * m;
        if (m > peak) peak = m;
        n++;
      }
      const rms = Math.sqrt(sum / Math.max(1, n));
      const t = start / sr;
      timeline.push({ t, rmsDb: toDb(rms), peakDb: toDb(peak) });
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

    // Coarse section candidates by energy change
    const sectionCandidates: ArrangementFeatures["sectionCandidates"] = [];
    if (timeline.length >= 4) {
      const threshold = 3.5; // dB jump
      let segStart = 0;
      let segSum = timeline[0].rmsDb;
      let segCount = 1;
      for (let i = 1; i < timeline.length; i++) {
        const jump = Math.abs(timeline[i].rmsDb - timeline[i - 1].rmsDb);
        if (jump > threshold && i - segStart >= 4) {
          const energyDb = segSum / segCount;
          const startSec = timeline[segStart].t;
          const endSec = timeline[i - 1].t;
          sectionCandidates.push({
            startSec,
            endSec,
            label: labelFromEnergy(energyDb, avgRmsDb, startSec, duration),
            energyDb,
          });
          segStart = i;
          segSum = timeline[i].rmsDb;
          segCount = 1;
        } else {
          segSum += timeline[i].rmsDb;
          segCount++;
        }
      }
      if (segCount >= 2) {
        const energyDb = segSum / segCount;
        sectionCandidates.push({
          startSec: timeline[segStart].t,
          endSec: timeline[timeline.length - 1].t,
          label: labelFromEnergy(energyDb, avgRmsDb, timeline[segStart].t, duration),
          energyDb,
        });
      }
    }

    // BPM: autocorrelation on downsampled envelope (60–180 BPM)
    let bpmEstimate: number | null = null;
    let bpmConfidence = 0;
    if (envelope.length > 32) {
      const hopSec = winSec;
      const minLag = Math.max(1, Math.floor(60 / (180 * hopSec))); // 180 BPM
      const maxLag = Math.min(envelope.length >> 1, Math.floor(60 / (60 * hopSec))); // 60 BPM
      let bestLag = 0,
        bestCorr = -1;
      const mean = envelope.reduce((a, b) => a + b, 0) / envelope.length;
      for (let lag = minLag; lag <= maxLag; lag++) {
        let num = 0,
          d1 = 0,
          d2 = 0;
        for (let i = 0; i + lag < envelope.length; i++) {
          const a = envelope[i] - mean;
          const b = envelope[i + lag] - mean;
          num += a * b;
          d1 += a * a;
          d2 += b * b;
        }
        const c = num / Math.sqrt(Math.max(1e-18, d1 * d2));
        if (c > bestCorr) {
          bestCorr = c;
          bestLag = lag;
        }
      }
      if (bestLag > 0 && bestCorr > 0.15) {
        const periodSec = bestLag * hopSec;
        bpmEstimate = Math.round(60 / periodSec);
        bpmConfidence = Math.max(0, Math.min(1, (bestCorr - 0.15) / 0.55));
      }
    }

    // Band density per coarse section (lightweight)
    const lowMidHighBySection: ArrangementFeatures["lowMidHighBySection"] = [];
    // skip heavy FFT per section for mobile — derive from global band later in UI

    return {
      energyTimeline: timeline,
      bpmEstimate,
      bpmConfidence,
      sectionCandidates,
      avgRmsDb,
      energyVariance: variance,
      lowMidHighBySection,
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
  if (rel > 0.5) return "Verse+ (متوسط تا پر)";
  return "Verse / بخش میانی (احتمالی)";
}

export function formatDb(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v.toFixed(digits)} dB`;
}
