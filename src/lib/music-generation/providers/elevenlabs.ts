/**
 * ElevenLabs Eleven Music adapter.
 * Enabled only when ELEVENLABS_API_KEY is present.
 * Docs: https://elevenlabs.io/docs/eleven-creative/products/music
 *
 * Note: Exact endpoint paths may evolve; adjust BASE if Eleven updates API.
 */

import type {
  GenerationSpec,
  MusicGenerationProvider,
  ProviderCapability,
  ProviderGenerateRequest,
  ProviderGenerateResult,
} from "../types";
import { expectedDurationMs } from "../provider";

const BASE = (process.env.ELEVENLABS_MUSIC_BASE_URL || "https://api.elevenlabs.io/v1").replace(/\/$/, "");

function apiKey(): string {
  return (process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY || "").trim();
}

function buildPrompt(spec: GenerationSpec): string {
  const parts: string[] = [spec.prompt];
  if (spec.instrument && spec.instrument !== "unspecified") parts.push(`instrument: ${spec.instrument}`);
  if (spec.assetType && spec.assetType !== "other") parts.push(`focus on a ${spec.assetType.replace(/_/g, " ")}`);
  if (spec.bpm) parts.push(`${spec.bpm} BPM`);
  if (spec.key) parts.push(`key ${spec.key}`);
  if (spec.bars) parts.push(`${spec.bars} bars`);
  if (spec.meter) parts.push(`meter ${spec.meter}`);
  if (spec.role) parts.push(`section role: ${spec.role}`);
  if (spec.genre) parts.push(`genre: ${spec.genre}`);
  if (spec.regionalStyle) parts.push(spec.regionalStyle);
  if (spec.performanceStyle) parts.push(`performance: ${spec.performanceStyle}`);
  if (spec.humanization === "high") parts.push("natural human feel, subtle timing variation");
  if (spec.negativeConstraints?.length) parts.push(`avoid: ${spec.negativeConstraints.join(", ")}`);
  parts.push("instrumental only, no vocals");
  return parts.filter(Boolean).join(". ");
}

export class ElevenMusicProvider implements MusicGenerationProvider {
  id = "elevenlabs-music";

  getCapabilities(): ProviderCapability {
    const hasKey = Boolean(apiKey());
    return {
      id: this.id,
      name: "ElevenLabs Music",
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
        "texture",
        "backing_fragment",
        "other",
      ],
      supportedInstruments: [
        "guitar",
        "electric_guitar",
        "acoustic_guitar",
        "bass",
        "piano",
        "keys",
        "synth",
        "pad",
        "drums",
        "strings",
        "other",
        "unspecified",
      ],
      maxDurationMs: 180_000,
      minDurationMs: 3000,
      supportedFormats: ["mp3"],
      supportsReferenceAudio: true,
      supportsInstrumentalOnly: true,
      supportsBpm: true,
      supportsKey: true,
      supportsBars: true,
      costPerSecondEstimateUsd: 0.0025,
      isFreeTierAvailable: false,
      requiresApiKey: true,
      latencyClass: "medium",
      qualityTier: ["high", "studio"],
      limitations: [
        "Best as short-to-medium instrumental clips; bar-exact length is approximate",
        "Requires paid ElevenLabs plan for Music API",
      ],
      enabled: hasKey,
    };
  }

  async healthCheck() {
    const key = apiKey();
    if (!key) return { ok: false, message: "ELEVENLABS_API_KEY missing" };
    try {
      const res = await fetch(`${BASE}/user`, {
        headers: { "xi-api-key": key },
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
      });
      return { ok: res.ok, message: res.ok ? "ok" : `http_${res.status}` };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "error" };
    }
  }

  async estimateCost(spec: GenerationSpec) {
    const ms = expectedDurationMs(spec) || 15_000;
    const minutes = ms / 60_000;
    return { credits: Math.max(1, Math.ceil(minutes * 2)), usdEstimate: minutes * 0.15 };
  }

  async plan(spec: GenerationSpec) {
    const adjusted = { ...spec };
    const dur = expectedDurationMs(spec);
    if (dur) adjusted.durationMs = Math.max(5000, Math.min(180_000, dur));
    else if (!adjusted.durationMs) adjusted.durationMs = 15_000;
    return {
      modelId: process.env.ELEVENLABS_MUSIC_MODEL || "music_v2_5",
      adjustedSpec: adjusted,
      notes: ["elevenlabs_music"],
    };
  }

  async generate(req: ProviderGenerateRequest): Promise<ProviderGenerateResult> {
    const key = apiKey();
    if (!key) throw new Error("ProviderUnavailable: ELEVENLABS_API_KEY missing");

    const lengthMs = Math.max(
      5000,
      Math.min(180_000, expectedDurationMs(req.spec) || req.spec.durationMs || 15_000),
    );
    const prompt = buildPrompt(req.spec);
    const modelId = process.env.ELEVENLABS_MUSIC_MODEL || "music_v2_5";

    // Composition-style request; path may be /music/generate or /music-generation depending on account tier.
    const endpoint =
      process.env.ELEVENLABS_MUSIC_PATH || "/music/generate";

    const res = await fetch(`${BASE}${endpoint}`, {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg, application/json",
      },
      body: JSON.stringify({
        prompt,
        model_id: modelId,
        music_length_ms: lengthMs,
        force_instrumental: true,
      }),
      signal: req.signal ?? AbortSignal.timeout(120_000),
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") || "";

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 401 || res.status === 403) throw new Error("ProviderUnavailable: auth");
      if (res.status === 429) throw new Error("ProviderQuotaExceeded");
      throw new Error(`Provider error ${res.status}: ${text.slice(0, 200)}`);
    }

    // Binary audio
    if (contentType.includes("audio") || contentType.includes("octet-stream")) {
      const audioBuffer = await res.arrayBuffer();
      return {
        providerId: this.id,
        modelId,
        audioBuffer,
        mimeType: contentType.includes("wav") ? "audio/wav" : "audio/mpeg",
        durationMs: lengthMs,
        metadata: { source: "elevenlabs-direct-audio" },
      };
    }

    // JSON with URL or base64
    const json = (await res.json()) as {
      audio_url?: string;
      url?: string;
      audio_base64?: string;
      job_id?: string;
    };

    if (json.audio_base64) {
      const raw = Buffer.from(json.audio_base64, "base64");
      return {
        providerId: this.id,
        modelId,
        providerJobId: json.job_id,
        audioBuffer: raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength),
        mimeType: "audio/mpeg",
        durationMs: lengthMs,
      };
    }

    const url = json.audio_url || json.url;
    if (!url) throw new Error("Provider returned no audio");

    const audioRes = await fetch(url, { signal: AbortSignal.timeout(60_000), cache: "no-store" });
    if (!audioRes.ok) throw new Error(`Failed to download provider audio: ${audioRes.status}`);
    const audioBuffer = await audioRes.arrayBuffer();
    return {
      providerId: this.id,
      modelId,
      providerJobId: json.job_id,
      audioBuffer,
      mimeType: audioRes.headers.get("content-type") || "audio/mpeg",
      durationMs: lengthMs,
      metadata: { audioUrl: url },
    };
  }
}
