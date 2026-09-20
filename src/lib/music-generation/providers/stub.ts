/**
 * Stub provider — architecture & job lifecycle only.
 * Does NOT produce real musical audio. Real providers replace this in Phase 2.
 * Marked enabled=false for production selection unless MUSIC_GEN_ALLOW_STUB=1.
 */

import type {
  GenerationSpec,
  MusicGenerationProvider,
  ProviderCapability,
  ProviderGenerateRequest,
  ProviderGenerateResult,
} from "../types";
import { expectedDurationMs } from "../provider";

function allowStub(): boolean {
  return process.env.MUSIC_GEN_ALLOW_STUB === "1" || process.env.NODE_ENV === "development";
}

/** Minimal silent-ish WAV (very short) so decode/validation paths can run in tests. */
function makeSilentWav(durationMs: number, sampleRate = 22050): ArrayBuffer {
  const numSamples = Math.max(1, Math.floor((sampleRate * durationMs) / 1000));
  const dataSize = numSamples * 2; // 16-bit mono
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  // samples left at 0 (silence)
  return buffer;
}

export class StubMusicProvider implements MusicGenerationProvider {
  id = "stub";

  getCapabilities(): ProviderCapability {
    return {
      id: "stub",
      name: "Stub (architecture only)",
      supportedAssetTypes: [
        "riff",
        "melody",
        "bassline",
        "chord_progression",
        "guitar_part",
        "piano_part",
        "synth_part",
        "pad",
        "arpeggio",
        "drum_loop",
        "fill",
        "intro",
        "outro",
        "other",
      ],
      supportedInstruments: [
        "guitar",
        "electric_guitar",
        "bass",
        "piano",
        "keys",
        "synth",
        "drums",
        "other",
        "unspecified",
      ],
      maxDurationMs: 60_000,
      minDurationMs: 500,
      supportedFormats: ["wav", "mp3"],
      supportsReferenceAudio: false,
      supportsInstrumentalOnly: true,
      supportsBpm: true,
      supportsKey: true,
      supportsBars: true,
      costPerSecondEstimateUsd: 0,
      isFreeTierAvailable: true,
      requiresApiKey: false,
      latencyClass: "fast",
      qualityTier: ["draft"],
      limitations: ["Does not generate real music — architecture/testing only"],
      enabled: allowStub(),
    };
  }

  async healthCheck() {
    return { ok: true, message: "stub_ready" };
  }

  async estimateCost(_spec: GenerationSpec) {
    return { credits: 0, usdEstimate: 0 };
  }

  async plan(spec: GenerationSpec) {
    return {
      modelId: "stub-v0",
      adjustedSpec: spec,
      notes: ["stub_provider"],
    };
  }

  async generate(req: ProviderGenerateRequest): Promise<ProviderGenerateResult> {
    if (!allowStub()) {
      throw new Error("Stub provider disabled in production. Set MUSIC_GEN_ALLOW_STUB=1 for local tests only.");
    }
    const dur = expectedDurationMs(req.spec) || req.spec.durationMs || 4000;
    const clamped = Math.max(500, Math.min(30_000, dur));
    const audioBuffer = makeSilentWav(clamped);
    return {
      providerId: this.id,
      modelId: "stub-v0",
      providerJobId: `stub-${req.jobId}`,
      audioBuffer,
      mimeType: "audio/wav",
      durationMs: clamped,
      sampleRate: 22050,
      channels: 1,
      metadata: { stub: true, note: "not real audio" },
    };
  }
}
