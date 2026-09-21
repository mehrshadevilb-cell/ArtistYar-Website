/**
 * Configurable music provider driven by admin token pool (base URL + API key).
 * Works with ElevenLabs-compatible proxies and OpenAI-compat music endpoints.
 */

import type {
  GenerationSpec,
  MusicGenerationProvider,
  ProviderCapability,
  ProviderGenerateRequest,
  ProviderGenerateResult,
} from "../types";
import { expectedDurationMs } from "../provider";
import {
  selectProviderToken,
  recordTokenUsage,
  type ProviderTokenRow,
} from "../token-pool";

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

async function callToken(
  token: ProviderTokenRow,
  req: ProviderGenerateRequest,
): Promise<ProviderGenerateResult> {
  const lengthMs = Math.max(
    5000,
    Math.min(180_000, expectedDurationMs(req.spec) || req.spec.durationMs || 15_000),
  );
  const prompt = buildPrompt(req.spec);
  const modelId = token.model_id || "music_v2_5";
  const base = token.base_url.replace(/\/$/, "");
  const path = (token.path || "/music/generate").startsWith("/")
    ? token.path || "/music/generate"
    : `/${token.path}`;

  const started = Date.now();
  let success = false;
  let errMsg: string | undefined;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "audio/mpeg, application/json",
    };

    // ElevenLabs style
    if (token.provider_kind === "elevenlabs") {
      headers["xi-api-key"] = token.api_key;
    } else {
      // OpenAI-compat / custom proxies often use Bearer
      headers.Authorization = `Bearer ${token.api_key}`;
      headers["xi-api-key"] = token.api_key; // some proxies still expect this
    }

    const body =
      token.provider_kind === "openai_compat"
        ? {
            model: modelId,
            prompt,
            music_length_ms: lengthMs,
            duration_ms: lengthMs,
            force_instrumental: true,
          }
        : {
            prompt,
            model_id: modelId,
            music_length_ms: lengthMs,
            force_instrumental: true,
          };

    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
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

    if (contentType.includes("audio") || contentType.includes("octet-stream")) {
      const audioBuffer = await res.arrayBuffer();
      success = true;
      return {
        providerId: `token:${token.id}`,
        modelId,
        audioBuffer,
        mimeType: contentType.includes("wav") ? "audio/wav" : "audio/mpeg",
        durationMs: lengthMs,
        metadata: { tokenId: token.id, label: token.label },
      };
    }

    const json = (await res.json()) as {
      audio_url?: string;
      url?: string;
      audio_base64?: string;
      job_id?: string;
      data?: Array<{ url?: string; b64_json?: string }>;
    };

    if (json.audio_base64) {
      const raw = Buffer.from(json.audio_base64, "base64");
      success = true;
      return {
        providerId: `token:${token.id}`,
        modelId,
        providerJobId: json.job_id,
        audioBuffer: raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength),
        mimeType: "audio/mpeg",
        durationMs: lengthMs,
        metadata: { tokenId: token.id },
      };
    }

    const url = json.audio_url || json.url || json.data?.[0]?.url;
    if (json.data?.[0]?.b64_json) {
      const raw = Buffer.from(json.data[0].b64_json, "base64");
      success = true;
      return {
        providerId: `token:${token.id}`,
        modelId,
        audioBuffer: raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength),
        mimeType: "audio/mpeg",
        durationMs: lengthMs,
        metadata: { tokenId: token.id },
      };
    }

    if (!url) throw new Error("Provider returned no audio");

    const audioRes = await fetch(url, { signal: AbortSignal.timeout(60_000), cache: "no-store" });
    if (!audioRes.ok) throw new Error(`Failed to download provider audio: ${audioRes.status}`);
    const audioBuffer = await audioRes.arrayBuffer();
    success = true;
    return {
      providerId: `token:${token.id}`,
      modelId,
      providerJobId: json.job_id,
      audioBuffer,
      mimeType: audioRes.headers.get("content-type") || "audio/mpeg",
      durationMs: lengthMs,
      metadata: { tokenId: token.id, audioUrl: url },
    };
  } catch (e) {
    errMsg = e instanceof Error ? e.message : String(e);
    throw e;
  } finally {
    const latencyMs = Date.now() - started;
    try {
      await recordTokenUsage({
        tokenId: token.id,
        jobId: req.jobId,
        success,
        creditsUsed: 1,
        latencyMs,
        errorMessage: errMsg,
      });
    } catch {
      /* non-fatal */
    }
  }
}

export class ConfigurableMusicProvider implements MusicGenerationProvider {
  id = "admin-token-pool";

  getCapabilities(): ProviderCapability {
    return {
      id: this.id,
      name: "Admin Token Pool",
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
      supportedFormats: ["mp3", "wav"],
      supportsReferenceAudio: false,
      supportsInstrumentalOnly: true,
      supportsBpm: true,
      supportsKey: true,
      supportsBars: true,
      costPerSecondEstimateUsd: 0.002,
      isFreeTierAvailable: false,
      requiresApiKey: true,
      latencyClass: "medium",
      qualityTier: ["high", "studio"],
      limitations: ["Uses admin-configured tokens (base URL + API key)"],
      // Always register; generate() fails clearly if no token
      enabled: true,
    };
  }

  async healthCheck() {
    try {
      const token = await selectProviderToken();
      if (!token) return { ok: false, message: "no_admin_tokens" };
      return { ok: true, message: `token:${token.label}` };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "error" };
    }
  }

  async estimateCost(spec: GenerationSpec) {
    const ms = expectedDurationMs(spec) || 15_000;
    const minutes = ms / 60_000;
    return { credits: Math.max(1, Math.ceil(minutes * 2)), usdEstimate: minutes * 0.1 };
  }

  async plan(spec: GenerationSpec) {
    const token = await selectProviderToken();
    const adjusted = { ...spec };
    const dur = expectedDurationMs(spec);
    if (dur) adjusted.durationMs = Math.max(5000, Math.min(180_000, dur));
    else if (!adjusted.durationMs) adjusted.durationMs = 15_000;
    return {
      modelId: token?.model_id || "music_default",
      adjustedSpec: adjusted,
      notes: token ? [`token:${token.id}`, token.label] : ["no_token"],
    };
  }

  async generate(req: ProviderGenerateRequest): Promise<ProviderGenerateResult> {
    const token = await selectProviderToken();
    if (!token) {
      throw new Error("ProviderUnavailable: هیچ توکن ادمین تنظیم نشده است");
    }
    return callToken(token, req);
  }
}
