/**
 * Post-generation audio validation.
 * Prefer provider-native short-form when available; validate what we can server-side.
 * BPM/key deep analysis reuses client audio-metrics patterns where needed.
 */

import type { GenerationSpec, ValidationResult } from "./types";
import { expectedDurationMs } from "./provider";

const SILENCE_THRESHOLD = 1e-4;

function isWav(header: Uint8Array): boolean {
  return (
    header.length >= 12 &&
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x41 &&
    header[10] === 0x56 &&
    header[11] === 0x45
  );
}

function isMp3(header: Uint8Array): boolean {
  // ID3 or frame sync
  if (header.length < 3) return false;
  if (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) return true;
  return header[0] === 0xff && (header[1] & 0xe0) === 0xe0;
}

function parseWavDurationMs(buf: ArrayBuffer): { durationMs: number; sampleRate: number; channels: number } | null {
  if (buf.byteLength < 44) return null;
  const view = new DataView(buf);
  const sampleRate = view.getUint32(24, true);
  const channels = view.getUint16(22, true);
  const bitsPerSample = view.getUint16(34, true);
  // Find data chunk size (simplified — assumes standard layout)
  let dataSize = view.getUint32(40, true);
  // Some writers put extra chunks; scan for "data"
  const u8 = new Uint8Array(buf);
  for (let i = 12; i < Math.min(u8.length - 8, 200); i++) {
    if (u8[i] === 0x64 && u8[i + 1] === 0x61 && u8[i + 2] === 0x74 && u8[i + 3] === 0x61) {
      dataSize = new DataView(buf).getUint32(i + 4, true);
      break;
    }
  }
  if (!sampleRate || !channels || !bitsPerSample) return null;
  const bytesPerSample = bitsPerSample / 8;
  const numSamples = dataSize / (channels * bytesPerSample);
  const durationMs = Math.round((numSamples / sampleRate) * 1000);
  return { durationMs, sampleRate, channels };
}

function roughPeakAndSilence(buf: ArrayBuffer): { peak: number; mostlySilent: boolean } {
  const u8 = new Uint8Array(buf);
  // Skip likely headers; sample a few thousand bytes of payload
  const start = Math.min(44, Math.floor(u8.length * 0.02));
  const end = Math.min(u8.length, start + 50_000);
  let peak = 0;
  let nonZero = 0;
  let count = 0;
  for (let i = start; i < end; i += 2) {
    // interpret as signed 16-ish
    const v = Math.abs((u8[i] | (u8[i + 1] << 8)) - 32768) / 32768;
    if (v > peak) peak = v;
    if (v > SILENCE_THRESHOLD) nonZero++;
    count++;
  }
  const mostlySilent = count > 0 && nonZero / count < 0.02 && peak < 0.05;
  return { peak, mostlySilent };
}

export function validateGeneratedAudio(
  audio: ArrayBuffer,
  mimeType: string,
  spec: GenerationSpec,
  opts?: { durationMsFromProvider?: number },
): ValidationResult {
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (!audio || audio.byteLength < 100) {
    reasons.push("file_too_small_or_empty");
    return { passed: false, reasons, warnings, fileSize: audio?.byteLength || 0 };
  }

  const header = new Uint8Array(audio.slice(0, 16));
  let detectedMime = mimeType;
  if (isWav(header)) detectedMime = "audio/wav";
  else if (isMp3(header)) detectedMime = mimeType.includes("mpeg") || mimeType.includes("mp3") ? mimeType : "audio/mpeg";
  else if (!mimeType.startsWith("audio/")) warnings.push("unexpected_mime");

  let durationMs = opts?.durationMsFromProvider;
  let sampleRate: number | undefined;
  let channels: number | undefined;

  if (isWav(header)) {
    const parsed = parseWavDurationMs(audio);
    if (parsed) {
      durationMs = parsed.durationMs;
      sampleRate = parsed.sampleRate;
      channels = parsed.channels;
    }
  }

  const expected = expectedDurationMs(spec);
  let durationDeltaPct: number | undefined;
  if (durationMs != null && expected != null && expected > 0) {
    durationDeltaPct = Math.abs(durationMs - expected) / expected;
    // Allow generous tolerance: providers often return different representations
    if (durationDeltaPct > 0.45 && expected >= 2000) {
      warnings.push(`duration_mismatch:got=${durationMs}ms expected≈${expected}ms`);
      // Not hard-fail by default — many models ignore exact bar counts
    }
  }

  const { peak, mostlySilent } = roughPeakAndSilence(audio);
  if (mostlySilent) {
    reasons.push("mostly_silent");
  }
  if (peak >= 0.99) {
    warnings.push("possible_clipping");
  }

  const passed = reasons.length === 0;

  return {
    passed,
    durationMs,
    expectedDurationMs: expected,
    durationDeltaPct,
    sampleRate,
    channels,
    peakDbfs: peak > 0 ? 20 * Math.log10(peak) : undefined,
    clipping: peak >= 0.99,
    silence: mostlySilent,
    mimeType: detectedMime,
    fileSize: audio.byteLength,
    reasons,
    warnings,
  };
}
