/**
 * Generic music provider — any admin-configured base URL + API key.
 * Works with:
 *  - Official ElevenLabs: base https://api.elevenlabs.io + path /v1/music
 *  - OpenAI-compatible gateways (AvalAI, etc.): base https://api.xxx/v1 + path /music (if exposed)
 *  - Custom proxies: set exact Path in admin panel
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
  let p = path.startsWith("/") ? path : `/${path}`;
  // base already .../v1 and path starts with /v1/...
  if (/\/v1$/i.test(b) && p.startsWith("/v1/")) {
    p = p.slice(3);
  }
  return `${b}${p}`;
}

function pathCandidates(token: ProviderTokenRow): string[] {
  const configured = (token.path || "").trim();
  const base = token.base_url.replace(/\/$/, "");
  const baseHasV1 = /\/v1$/i.test(base);

  // If admin set an exact path, try it first — then a small set of relatives
  const extras: string[] = [];
  if (token.provider_kind === "elevenlabs") {
    extras.push("/v1/music", "/music", "/v1/music/stream", "/music/stream");
  } else {
    // openai_compat / custom / gateways like AvalAI
    if (baseHasV1) {
      extras.push("/music", "/music/generate", "/music/compose", "/audio/music", "/generate/music");
    } else {
      extras.push("/v1/music", "/music", "/v1/music/generate", "/v1/music/compose");
    }
  }

  return Array.from(new Set([configured, ...extras].filter(Boolean)));
}

function authHeaderVariants(token: ProviderTokenRow): Record<string, string>[] {
  const common = {
    "Content-Type": "application/json",
    Accept: "audio/mpeg, audio/*, application/octet-stream, application/json",
  };

  if (token.provider_kind === "elevenlabs") {
    return [{ ...common, "xi-api-key": token.api_key }];
  }

  // openai_compat / custom: Bearer first (AvalAI, OpenAI-style)
  return [
    { ...common, Authorization: `Bearer ${token.api_key}` },
    { ...common, "xi-api-key": token.api_key },
    { ...common, Authorization: `Bearer ${token.api_key}`, "xi-api-key": token.api_key },
  ];
}

function bodyVariants(prompt: string, modelId: string, lengthMs: number): Record<string, unknown>[] {
  return [
    // Official ElevenLabs compose
    { prompt, model_id: modelId, music_length_ms: lengthMs },
    // Some proxies
    { prompt, model: modelId, music_length_ms: lengthMs, force_instrumental: true },
    { model: modelId, prompt, duration_ms: lengthMs, music_length_ms: lengthMs },
    { model: modelId, input: prompt, prompt, music_length_ms: lengthMs },
  ];
}

async function parseAudioResponse(
  res: Response,
  modelId: string,
  token: ProviderTokenRow,
  lengthMs: number,
): Promise<ProviderGenerateResult> {
  const contentType = res.headers.get("content-type") || "";

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
      metadata: { tokenId: token.id, label: token.label, url: res.url },
    };
  }

  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`Provider non-JSON response (${contentType}): ${text.slice(0, 160)}`);
  }

  const audioBase64 =
    (typeof json.audio_base64 === "string" && json.audio_base64) ||
    (typeof json.audio === "string" && json.audio) ||
    (typeof (json as { data?: { b64_json?: string }[] }).data?.[0]?.b64_json === "string"
      ? (json as { data: { b64_json: string }[] }).data[0].b64_json
      : null) ||
    (typeof (json as { choices?: { message?: { audio?: { data?: string } } }[] }).choices?.[0]?.message
      ?.audio?.data === "string"
      ? (json as { choices: { message: { audio: { data: string } } }[] }).choices[0].message.audio.data
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
  const paths = pathCandidates(token);
  const bodies = bodyVariants(prompt, modelId, lengthMs);
  const headerSets = authHeaderVariants(token);

  const started = Date.now();
  let success = false;
  let errMsg: string | undefined;
  const tried: string[] = [];
  let lastError = "unknown";

  try {
    for (const path of paths) {
      for (const body of bodies) {
        for (const headers of headerSets) {
          const url = joinUrl(token.base_url, path);
          try {
            const res = await fetch(url, {
              method: "POST",
              headers,
              body: JSON.stringify(body),
              signal: req.signal ?? AbortSignal.timeout(120_000),
              cache: "no-store",
            });

            tried.push(`${res.status} ${url}`);

            if (res.status === 404 || res.status === 405) {
              lastError = `http_${res.status} ${url}`;
              continue;
            }
            if (res.status === 401 || res.status === 403) {
              lastError = `auth_${res.status} ${url}`;
              continue;
            }
            if (res.status === 429) throw new Error("ProviderQuotaExceeded");
            if (!res.ok) {
              const text = await res.text().catch(() => "");
              lastError = `http_${res.status} ${url}: ${text.slice(0, 140)}`;
              if (res.status === 400 || res.status === 422) continue;
              // keep trying other combos for 5xx
              if (res.status >= 500) continue;
              throw new Error(`Provider error ${res.status} ${url}: ${text.slice(0, 180)}`);
            }

            const result = await parseAudioResponse(res, modelId, token, lengthMs);
            success = true;
            return result;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            lastError = msg;
            if (msg.includes("ProviderQuotaExceeded")) throw e;
          }
        }
      }
    }

    throw new Error(
      `Provider call failed: ${lastError} | tried=${tried.slice(-10).join(" ; ")}`,
    );
  } catch (e) {
    errMsg = e instanceof Error ? e.message : String(e);
    throw e;
  } finally {
    try {
      await recordTokenUsage({
        tokenId: token.id,
        jobId: req.jobId,
        success,
        creditsUsed: 1,
        latencyMs: Date.now() - started,
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
      name: "Admin Token Pool (any provider)",
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
      limitations: ["Uses admin Base URL + API key + Path for any gateway"],
      enabled: true,
    };
  }

  async healthCheck() {
    try {
      const token = await selectProviderToken();
      if (!token) return { ok: false, message: "no_admin_tokens" };
      return { ok: true, message: `token:${token.label} base=${token.base_url}` };
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
      notes: token ? [`token:${token.id}`, token.label, token.base_url] : ["no_token"],
    };
  }

  async generate(req: ProviderGenerateRequest): Promise<ProviderGenerateResult> {
    const token = await selectProviderToken();
    if (!token) {
      throw new Error(
        "ProviderUnavailable: هیچ توکن ادمین تنظیم نشده. از /admin/music-generator Base URL و API Key اضافه کنید.",
      );
    }
    return callToken(token, req);
  }
}
