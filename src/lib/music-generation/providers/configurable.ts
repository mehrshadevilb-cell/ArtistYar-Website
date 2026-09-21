/**
 * Configurable music provider driven by admin token pool (base URL + API key).
 * Official ElevenLabs: POST {base}/v1/music  (or base already ends with /v1 + path /music)
 * Docs: https://elevenlabs.io/docs/api-reference/music/compose
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

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  // Avoid double /v1 if base already ends with /v1 and path starts with /v1
  if (b.endsWith("/v1") && p.startsWith("/v1/")) {
    return `${b}${p.slice(3)}`;
  }
  return `${b}${p}`;
}

async function parseAudioResponse(
  res: Response,
  modelId: string,
  token: ProviderTokenRow,
  lengthMs: number,
): Promise<ProviderGenerateResult> {
  const contentType = res.headers.get("content-type") || "";

  // Official ElevenLabs returns raw audio stream
  if (
    contentType.includes("audio") ||
    contentType.includes("octet-stream") ||
    contentType.includes("application/octet-stream")
  ) {
    const audioBuffer = await res.arrayBuffer();
    if (audioBuffer.byteLength < 200) throw new Error("Provider returned empty audio");
    return {
      providerId: `token:${token.id}`,
      modelId,
      audioBuffer,
      mimeType: contentType.includes("wav") || contentType.includes("pcm") ? "audio/wav" : "audio/mpeg",
      durationMs: lengthMs,
      metadata: { tokenId: token.id, label: token.label },
    };
  }

  // Some gateways still return JSON
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    // Maybe raw audio without correct content-type
    if (text.length > 500 || res.headers.get("content-length")) {
      const buf = await (async () => {
        // re-fetch not possible; treat as failed JSON
        return null;
      })();
      void buf;
    }
    throw new Error(`Provider non-JSON response: ${text.slice(0, 180)}`);
  }

  const audioBase64 =
    (typeof json.audio_base64 === "string" && json.audio_base64) ||
    (typeof json.audio === "string" && json.audio) ||
    (typeof (json as { data?: { b64_json?: string }[] }).data?.[0]?.b64_json === "string"
      ? (json as { data: { b64_json: string }[] }).data[0].b64_json
      : null);

  if (audioBase64) {
    const raw = Buffer.from(audioBase64, "base64");
    return {
      providerId: `token:${token.id}`,
      modelId,
      providerJobId: typeof json.job_id === "string" ? json.job_id : undefined,
      audioBuffer: raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength),
      mimeType: "audio/mpeg",
      durationMs: lengthMs,
      metadata: { tokenId: token.id },
    };
  }

  const url =
    (typeof json.audio_url === "string" && json.audio_url) ||
    (typeof json.url === "string" && json.url) ||
    (typeof (json as { data?: { url?: string }[] }).data?.[0]?.url === "string"
      ? (json as { data: { url: string }[] }).data[0].url
      : null) ||
    (typeof json.output_url === "string" && json.output_url) ||
    null;

  if (!url) {
    throw new Error(`Provider returned no audio fields: ${text.slice(0, 200)}`);
  }

  const audioRes = await fetch(url, { signal: AbortSignal.timeout(60_000), cache: "no-store" });
  if (!audioRes.ok) throw new Error(`Failed to download provider audio: ${audioRes.status}`);
  const audioBuffer = await audioRes.arrayBuffer();
  if (audioBuffer.byteLength < 200) throw new Error("Downloaded audio empty");
  return {
    providerId: `token:${token.id}`,
    modelId,
    providerJobId: typeof json.job_id === "string" ? json.job_id : undefined,
    audioBuffer,
    mimeType: audioRes.headers.get("content-type") || "audio/mpeg",
    durationMs: lengthMs,
    metadata: { tokenId: token.id, audioUrl: url },
  };
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
  const configuredPath = (token.path || "").trim();

  // Official ElevenLabs compose: POST /v1/music
  // Also try proxy-style paths
  const pathCandidates = Array.from(
    new Set(
      [
        configuredPath,
        "/v1/music",
        "/music",
        "/v1/music/stream",
        "/music/stream",
        "/v1/music/generate",
        "/music/generate",
        "/generate",
      ].filter(Boolean),
    ),
  );

  // Official body first (no force_instrumental — not in public compose schema)
  const bodyVariants: Record<string, unknown>[] = [
    {
      prompt,
      model_id: modelId,
      music_length_ms: lengthMs,
    },
    {
      prompt,
      model_id: modelId,
      music_length_ms: lengthMs,
      force_instrumental: true,
    },
    {
      model: modelId,
      prompt,
      music_length_ms: lengthMs,
      duration_ms: lengthMs,
    },
  ];

  const started = Date.now();
  let success = false;
  let errMsg: string | undefined;
  const tried: string[] = [];
  let lastError = "unknown";

  try {
    for (const path of pathCandidates) {
      for (const body of bodyVariants) {
        const headersList: Record<string, string>[] = [];

        if (token.provider_kind === "elevenlabs") {
          headersList.push({
            "Content-Type": "application/json",
            Accept: "audio/mpeg, audio/*, application/json",
            "xi-api-key": token.api_key,
          });
        } else {
          headersList.push(
            {
              "Content-Type": "application/json",
              Accept: "audio/mpeg, audio/*, application/json",
              "xi-api-key": token.api_key,
            },
            {
              "Content-Type": "application/json",
              Accept: "audio/mpeg, audio/*, application/json",
              Authorization: `Bearer ${token.api_key}`,
            },
            {
              "Content-Type": "application/json",
              Accept: "audio/mpeg, audio/*, application/json",
              Authorization: `Bearer ${token.api_key}`,
              "xi-api-key": token.api_key,
            },
          );
        }

        for (const headers of headersList) {
          const url = joinUrl(token.base_url, path);
          try {
            const res = await fetch(url, {
              method: "POST",
              headers,
              body: JSON.stringify(body),
              signal: req.signal ?? AbortSignal.timeout(120_000),
              cache: "no-store",
            });

            tried.push(`${res.status}:${path}`);

            if (res.status === 404 || res.status === 405) {
              lastError = `http_${res.status} path=${path}`;
              continue;
            }
            if (res.status === 401 || res.status === 403) {
              lastError = `auth_${res.status} path=${path}`;
              continue;
            }
            if (res.status === 429) {
              throw new Error("ProviderQuotaExceeded");
            }
            if (!res.ok) {
              const text = await res.text().catch(() => "");
              lastError = `http_${res.status} path=${path}: ${text.slice(0, 160)}`;
              if (res.status === 400 || res.status === 422) continue;
              throw new Error(`Provider error ${res.status} path=${path}: ${text.slice(0, 200)}`);
            }

            const result = await parseAudioResponse(res, modelId, token, lengthMs);
            success = true;
            return result;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            lastError = msg;
            if (msg.includes("ProviderQuotaExceeded") || msg.includes("ProviderUnavailable")) {
              throw e;
            }
          }
        }
      }
    }

    throw new Error(`Provider call failed: ${lastError} | tried=${tried.slice(-12).join(",")}`);
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
      costPerSecondEstimateUsd: 0.001,
      isFreeTierAvailable: false,
      requiresApiKey: true,
      latencyClass: "medium",
      qualityTier: ["high", "studio"],
      limitations: ["Uses admin-configured tokens (base URL + API key)"],
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
      modelId: token?.model_id || "music_v2_5",
      adjustedSpec: adjusted,
      notes: token ? [`token:${token.id}`, token.label] : ["no_token"],
    };
  }

  async generate(req: ProviderGenerateRequest): Promise<ProviderGenerateResult> {
    const token = await selectProviderToken();
    if (!token) {
      throw new Error("ProviderUnavailable: هیچ توکن ادمین تنظیم نشده است. از /admin/music-generator توکن اضافه کنید.");
    }
    return callToken(token, req);
  }
}
