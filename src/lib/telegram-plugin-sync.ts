import { createHash } from "crypto";
import https from "https";

import { createClient } from "@supabase/supabase-js";

type TgMessage = {
  message_id: number;
  chat?: { id: number; username?: string; title?: string; type?: string };
  caption?: string;
  photo?: Array<{ file_id: string; width: number; height: number }>;
  document?: { file_id: string; file_name?: string; mime_type?: string; file_size?: number };
};

type PluginData = {
  title: string; developer: string; version: string; category: string;
  formats: string[]; platforms: string[]; description: string; features: string[]; tags: string[];
  translatedCaption?: string;
};

const TG = "https://api.telegram.org";
const url = (process.env.SUPABASE_URL || "").trim();
const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const db = url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

function botToken() {
  return (process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || process.env.BOT_TOKEN || "").trim();
}
function configuredChannel() {
  return (process.env.TELEGRAM_PLUGIN_CHANNEL_ID || "@ProAudios").trim();
}
function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(/\/$/, "");
}
function clean(v: unknown, max = 500) {
  return String(v ?? "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
async function tg(method: string, body: Record<string, unknown>) {
  const t = botToken();
  if (!t) throw new Error("telegram_bot_token_missing");
  let last = "telegram_" + method + "_failed";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(TG + "/bot" + t + "/" + method, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) return data.result;
      const description = clean(data?.description || last, 240);
      last = description;
      if (![429, 500, 502, 503, 504].includes(res.status) || attempt >= 2) {
        throw new Error(description);
      }
      const retryAfter = Number(data?.parameters?.retry_after || 0);
      const waitMs = retryAfter > 0 ? Math.min(15000, retryAfter * 1000) : 700 * (attempt + 1);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    } catch (error) {
      if (attempt >= 2) throw error;
      last = clean(error instanceof Error ? error.message : String(error), 240);
      if (!/fetch failed|timeout|timed out|aborted|network/i.test(last)) throw error;
      await new Promise(resolve => setTimeout(resolve, 700 * (attempt + 1)));
    }
  }
  throw new Error(last);
}
export async function telegramGetFile(fileId: string) {
  const file = await tg("getFile", { file_id: fileId });
  if (!file?.file_path) throw new Error("telegram_file_path_missing");
  return { filePath: String(file.file_path), url: TG + "/file/" + botToken() + "/" + file.file_path };
}
function imageMimeFromPath(filePath: string, header: string | null) {
  const normalized = (header || "").split(";")[0].trim().toLowerCase();
  if (normalized.startsWith("image/")) return normalized;
  const ext = filePath.toLowerCase().split("?")[0].split(".").pop() || "";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "bmp") return "image/bmp";
  return "image/jpeg";
}

function httpsDownload(urlValue: string) {
  return new Promise<{ bytes: Buffer; status: number; contentType: string | null }>((resolve, reject) => {
    const req = https.get(urlValue, {
      headers: {
        accept: "image/*,*/*;q=0.8",
        "accept-encoding": "identity",
        "user-agent": "ArtistYar-Telegram-Plugin-Sync/1.0",
      },
      timeout: 30000,
    }, response => {
      const chunks: Buffer[] = [];
      response.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      response.on("end", () => resolve({
        bytes: Buffer.concat(chunks),
        status: response.statusCode || 0,
        contentType: response.headers["content-type"] || null,
      }));
      response.on("error", reject);
    });
    req.on("timeout", () => req.destroy(new Error("telegram_file_download_timeout")));
    req.on("error", reject);
  });
}

export async function telegramBytes(fileId: string) {
  let last = "telegram_file_download_failed";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const file = await telegramGetFile(fileId);

      const native = await httpsDownload(file.url);
      if (native.status >= 200 && native.status < 300) {
        return {
          bytes: native.bytes,
          contentType: imageMimeFromPath(file.filePath, native.contentType),
        };
      }

      // IMPORTANT: never send recovery media back to the source channel.
      // A channel_id is not a safe recovery destination: doing so republishes
      // the source image and can create an ingestion loop/spam. If Telegram's
      // CDN returns 404, retry the original file only; do not post anything.

      let nativeDetail = "";
      if (native.status === 404) {
        const body = native.bytes.toString("utf8").slice(0, 240);
        nativeDetail = body ? ":" + body.replace(/\s+/g, " ").trim() : "";
      }
      last = "telegram_file_download_failed_" + native.status + nativeDetail;

      const res = await fetch(file.url, {
        cache: "no-store",
        redirect: "follow",
        headers: {
          accept: "image/*,*/*;q=0.8",
          "accept-encoding": "identity",
          "user-agent": "ArtistYar-Telegram-Plugin-Sync/1.0",
        },
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) {
        const bytes = Buffer.from(await res.arrayBuffer());
        return {
          bytes,
          contentType: imageMimeFromPath(file.filePath, res.headers.get("content-type")),
        };
      }
      const body = res.status === 404 ? (await res.text().catch(() => "")).slice(0, 240) : "";
      last = "telegram_file_download_failed_" + res.status + (body ? ":" + body.replace(/\s+/g, " ").trim() : "");
    } catch (error) {
      last = clean(error instanceof Error ? error.message : String(error), 300);
    }
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 900 * (attempt + 1)));
  }
  throw new Error(last);
}

function parseJson(text: string): PluginData {
  const raw = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  const p = JSON.parse(raw);
  const arr = (v: unknown, max: number) => Array.isArray(v) ? v.map(x => clean(x, 180)).filter(Boolean).slice(0, max) : [];
  return {
    title: clean(p.title, 160) || "پلاگین بدون نام",
    developer: clean(p.developer, 120), version: clean(p.version, 80),
    category: clean(p.category, 80) || "Other", formats: arr(p.formats, 10), platforms: arr(p.platforms, 10),
    description: clean(p.description, 1800), features: arr(p.features, 8), tags: arr(p.tags, 15),
    translatedCaption: clean(p.translated_caption, 3500),
  };
}
const SYSTEM_BASE = "You are ArtistYar's automatic Telegram plugin content engine. Identify a music-production plugin from the available image, filename and caption. FACT PRIORITY: explicit caption facts first, then filename, then visible image text. Never contradict explicit facts. Preserve exact product/developer names, versions, formats, platforms, technical terms and factual meaning. Never invent unknown values. Remove promotional noise and all external links; the final caption must keep only ArtistYar and @ProAudios references added by the application. Return JSON only with title, developer, version, category, formats, platforms, description, features, tags, translated_caption. Use concise natural Persian for description/features and conventional English for product/developer/technical names. Category examples: Synthesizer, EQ, Compressor, Reverb, Delay, Saturation, Distortion, Limiter, Dynamics, Instrument, Sampler, Utility, Mastering, Bundle, Other.";

function buildAiSystem(caption: string) {
  if (String(caption || "").trim()) {
    return SYSTEM_BASE + " The Telegram post HAS a caption. Translate the existing caption faithfully into natural Persian. Do not replace it with an invented product description. Clean only spam/promotional noise and external links. If it is already Persian, preserve its meaning and wording as much as possible while cleaning links/noise. translated_caption must represent the useful original caption.";
  }
  return SYSTEM_BASE + " The Telegram post has NO caption. Create a useful Persian caption from the photo/vision evidence and filename. If the image clearly shows product/developer/version/format/platform information, use it. Describe the plugin only from visible or filename evidence. translated_caption should be a newly authored Persian caption for the identified product, not a translation of an empty caption.";
}

type AiResult = { data: PluginData; provider: string; model: string };

function looksPersian(text: string) {
  const value = String(text || "");
  const fa = (value.match(/[\u0600-\u06ff]/g) || []).length;
  const latin = (value.match(/[A-Za-z]/g) || []).length;
  return fa >= 8 && fa >= Math.max(1, latin * 0.35);
}

function sanitizeCaption(raw: string) {
  let value = String(raw || "").replace(/\r/g, "").trim();
  value = value.replace(/\[[^\]]*\]\(tg:\/\/emoji\?[^)]*\)/gi, "");
  value = value.replace(/tg:\/\/emoji[^\s)]+/gi, "");
  value = value.replace(/\[[^\]]+\]\((?:https?:\/\/|tg:\/\/|t\.me\/)[^)]*\)/gi, "");
  value = value.replace(/https?:\/\/[^\s)]+/gi, "");
  value = value.replace(/(?:https?:\/\/)?(?:www\.)?t\.me\/[A-Za-z0-9_+\/-]+/gi, "");
  value = value.replace(/(?:https?:\/\/)?(?:www\.)?telegram\.me\/[A-Za-z0-9_+\/-]+/gi, "");
  value = value.replace(/@[A-Za-z0-9_]{4,}/g, "");
  value = value.split("\n").filter(line => {
    const t = line.trim();
    return !/(BEATTALK|ДРАМ КИТЫ|Видеокурсы по музыке|beat talk|драм киты)/i.test(t);
  }).join("\n");
  value = value.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (!value) return "";
  return (value + "\n\n🎛️ ArtistYar — https://artistyaar.ir\n📢 Channel: @ProAudios").slice(0, 1000);
}

function captionFacts(caption: string) {
  const source = String(caption || "");
  const version = source.match(/(?:version|v(?:ersion)?)[\s:_-]*(\d+(?:\.\d+){1,4})/i)?.[1]
    || source.match(/\bv(\d+(?:\.\d+){1,4})\b/i)?.[1]
    || "";
  const formats = Array.from(new Set(
    (source.match(/\b(?:AU|AAX|VST3?|STANDALONE|CLAP|LV2)\b/gi) || []).map(v => v.toUpperCase())
  ));
  const platforms = [
    /(?:mac|macos|os x|\bapple\b|🍏)/i.test(source) ? "macOS" : "",
    /(?:windows|win\.?|\bpc\b)/i.test(source) ? "Windows" : "",
    /(?:linux)/i.test(source) ? "Linux" : "",
  ].filter(Boolean);
  return { version, formats, platforms };
}

function enforceCaptionFacts(data: PluginData, rawCaption: string): PluginData {
  const facts = captionFacts(rawCaption);
  return {
    ...data,
    version: facts.version || data.version,
    formats: facts.formats.length ? facts.formats : data.formats,
    platforms: facts.platforms.length ? facts.platforms : data.platforms,
    translatedCaption: sanitizeCaption(data.translatedCaption || ""),
  };
}

function envList(name: string) {
  return (process.env[name] || "").split(",").map(v => v.trim()).filter(Boolean);
}

type AiHealth = { ok: number; fail: number; latencyMs: number; lastUsed: number; cooldownUntil: number };
const AI_HEALTH = new Map<string, AiHealth>();
const AI_DISCOVERY_CACHE = new Map<string, { expiresAt: number; models: string[]; baseUrl: string }>();
const AI_DISCOVERY_TTL_MS = 5 * 60 * 1000;

function providerNameFromEnvKey(keyName: string) {
  return keyName.replace(/_API_KEY$/i, "").replace(/^PLUGIN_AI_/i, "").toLowerCase();
}

function discoverEnvCompatibleProviders() {
  const known = new Set([
    "openai", "openrouter", "anthropic", "google", "gemini",
    "groq", "xai", "mistral", "together", "fireworks",
    "agentrouter", "xkiro", "bytez", "deepseek",
  ]);
  const out: Array<{ id: string; keyName: string; baseName: string; modelName: string; baseUrl: string }> = [];
  for (const keyName of Object.keys(process.env)) {
    if (!/_API_KEY$/i.test(keyName) || !String(process.env[keyName] || "").trim()) continue;
    const id = providerNameFromEnvKey(keyName);
    if (!id || known.has(id)) continue;
    const upper = id.toUpperCase();
    const baseName = upper + "_BASE_URL";
    const modelName = upper + "_MODEL";
    const baseUrl = validBaseUrl(
      process.env[baseName] || "",
      ""
    );
    if (!baseUrl) continue;
    out.push({ id, keyName, baseName, modelName, baseUrl });
  }
  return out;
}

async function discoverCachedModels(provider: string, apiKey: string, baseUrl: string) {
  const cacheKey = provider + "|" + baseUrl;
  const cached = AI_DISCOVERY_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.models;
  const models = await discoverOpenAICompatibleModels(apiKey, baseUrl);
  AI_DISCOVERY_CACHE.set(cacheKey, { expiresAt: Date.now() + AI_DISCOVERY_TTL_MS, models, baseUrl });
  return models;
}

function modelSpeedScore(model: string) {
  const value = String(model || "").toLowerCase();
  let score = 0;
  if (/(flash|lite|mini|haiku|small|fast|instant)/i.test(value)) score += 40;
  if (/(pro|max|opus|sonnet|large|70b|72b|405b)/i.test(value)) score -= 10;
  return score;
}

export async function getAiRoutingDiagnostics() {
  const providers: any[] = [];
  const addProvider = async (id: string, keyName: string, baseName: string, modelName: string, fallbackBase = "") => {
    const apiKey = (process.env[keyName] || "").trim();
    if (!apiKey) return;
    const base = validBaseUrl(process.env[baseName] || "", fallbackBase);
    if (!base) {
      providers.push({ provider: id, configured: true, base_url_configured: false, models: [] });
      return;
    }
    let discovered: string[] = [];
    let discoveryError = "";
    try {
      discovered = await discoverCachedModels(id, apiKey, base);
    } catch (error) {
      discoveryError = clean(error instanceof Error ? error.message : String(error), 180);
    }
    const configured = modelPool("PLUGIN_AI_" + id.toUpperCase(), modelName, []);
    const models = Array.from(new Set([...configured, ...discovered]));
    providers.push({
      provider: id,
      configured: true,
      base_url_configured: true,
      discovered_model_count: discovered.length,
      models: rankModels(id, models).slice(0, 100).map(model => {
        const h = healthFor(id, model);
        const attempts = h.ok + h.fail;
        return {
          model,
          state: h.cooldownUntil > Date.now() ? "cooldown" : attempts ? (h.ok > h.fail ? "healthy" : "degraded") : "unprobed",
          success_count: h.ok,
          failure_count: h.fail,
          success_ratio: attempts ? Number((h.ok / attempts).toFixed(3)) : null,
          latency_ms: Math.round(h.latencyMs),
          cooldown_until: h.cooldownUntil || null,
          last_used: h.lastUsed || null,
          speed_score: modelSpeedScore(model),
        };
      }),
      discovery_error: discoveryError || null,
    });
  };

  const googleKey = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
  if (googleKey) {
    let discovered: string[] = [];
    let errorMessage = "";
    try {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + encodeURIComponent(googleKey), { cache: "no-store", signal: AbortSignal.timeout(10000) });
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.models)) {
        discovered = data.models
          .filter((m: any) => Array.isArray(m?.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
          .map((m: any) => String(m?.name || "").replace(/^models\//, "").trim())
          .filter(Boolean);
      } else {
        errorMessage = clean(data?.error?.message || ("google_http_" + res.status), 180);
      }
    } catch (error) {
      errorMessage = clean(error instanceof Error ? error.message : String(error), 180);
    }
    const configured = modelPool("PLUGIN_AI_GEMINI", "PLUGIN_AI_GEMINI_MODEL", []);
    const models = Array.from(new Set([...configured, ...discovered]));
    providers.push({
      provider: "google",
      configured: true,
      base_url_configured: true,
      discovered_model_count: discovered.length,
      models: rankModels("google", models).slice(0, 100).map(model => {
        const h = healthFor("google", model);
        const attempts = h.ok + h.fail;
        return {
          model,
          state: h.cooldownUntil > Date.now() ? "cooldown" : attempts ? (h.ok > h.fail ? "healthy" : "degraded") : "unprobed",
          success_count: h.ok,
          failure_count: h.fail,
          success_ratio: attempts ? Number((h.ok / attempts).toFixed(3)) : null,
          latency_ms: Math.round(h.latencyMs),
          cooldown_until: h.cooldownUntil || null,
          last_used: h.lastUsed || null,
          speed_score: modelSpeedScore(model),
        };
      }),
      discovery_error: errorMessage || null,
    });
  }

  await addProvider("openai", "OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_MODEL", "https://api.openai.com/v1");
  await addProvider("openrouter", "OPENROUTER_API_KEY", "OPENROUTER_BASE_URL", "OPENROUTER_MODEL", "https://openrouter.ai/api/v1");

  const anthropicKey = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (anthropicKey) {
    let discovered: string[] = [];
    let discoveryError = "";
    try {
      discovered = await discoverAnthropicModels(anthropicKey);
    } catch (error) {
      discoveryError = clean(error instanceof Error ? error.message : String(error), 180);
    }
    const configured = modelPool("PLUGIN_AI_ANTHROPIC", "ANTHROPIC_MODEL", []);
    const models = Array.from(new Set([...configured, ...discovered]));
    providers.push({
      provider: "anthropic",
      configured: true,
      base_url_configured: true,
      discovered_model_count: discovered.length,
      models: rankModels("anthropic", models).slice(0, 100).map(model => {
        const h = healthFor("anthropic", model);
        const attempts = h.ok + h.fail;
        return {
          model,
          state: h.cooldownUntil > Date.now() ? "cooldown" : attempts ? (h.ok > h.fail ? "healthy" : "degraded") : "unprobed",
          success_count: h.ok,
          failure_count: h.fail,
          success_ratio: attempts ? Number((h.ok / attempts).toFixed(3)) : null,
          latency_ms: Math.round(h.latencyMs),
          cooldown_until: h.cooldownUntil || null,
          last_used: h.lastUsed || null,
          speed_score: modelSpeedScore(model),
        };
      }),
      discovery_error: discoveryError || null,
    });
  }
  const compatible = [
    ["groq","GROQ_API_KEY","GROQ_BASE_URL","GROQ_MODEL","https://api.groq.com/openai/v1"],
    ["xai","XAI_API_KEY","XAI_BASE_URL","XAI_MODEL","https://api.x.ai/v1"],
    ["mistral","MISTRAL_API_KEY","MISTRAL_BASE_URL","MISTRAL_MODEL","https://api.mistral.ai/v1"],
    ["together","TOGETHER_API_KEY","TOGETHER_BASE_URL","TOGETHER_MODEL","https://api.together.xyz/v1"],
    ["fireworks","FIREWORKS_API_KEY","FIREWORKS_BASE_URL","FIREWORKS_MODEL","https://api.fireworks.ai/inference/v1"],
    ["agentrouter","AGENTROUTER_API_KEY","AGENTROUTER_BASE_URL","AGENTROUTER_MODEL","https://co.agentrouter.org/v1"],
    ["xkiro","XKIRO_API_KEY","XKIRO_BASE_URL","XKIRO_MODEL","https://api.xkiro.com/v1"],
    ["bytez","BYTEZ_API_KEY","BYTEZ_BASE_URL","BYTEZ_MODEL","https://api.bytez.com/models/v2/openai/v1"],
    ["deepseek","DEEPSEEK_API_KEY","DEEPSEEK_BASE_URL","DEEPSEEK_MODEL","https://api.deepseek.com/v1"],
  ] as const;
  for (const [id, keyName, baseName, modelName, fallback] of compatible) {
    await addProvider(id, keyName, baseName, modelName, fallback);
  }
  for (const p of discoverEnvCompatibleProviders()) {
    await addProvider(p.id, p.keyName, p.baseName, p.modelName, p.baseUrl);
  }
  return {
    generated_at: new Date().toISOString(),
    routing: "measured_success_rate_then_latency_then_model_speed",
    providers,
  };
}


function healthKey(provider: string, model: string) {
  return provider + ":" + model;
}

function healthFor(provider: string, model: string): AiHealth {
  return AI_HEALTH.get(healthKey(provider, model)) || {
    ok: 0, fail: 0, latencyMs: 12000, lastUsed: 0, cooldownUntil: 0,
  };
}

function rankModels(provider: string, models: string[]) {
  const now = Date.now();
  return Array.from(new Set(models)).sort((a, b) => {
    const ha = healthFor(provider, a);
    const hb = healthFor(provider, b);
    const availableA = ha.cooldownUntil <= now ? 1 : 0;
    const availableB = hb.cooldownUntil <= now ? 1 : 0;
    if (availableA !== availableB) return availableB - availableA;
    const score = (h: AiHealth) => {
      const attempts = h.ok + h.fail;
      const success = attempts ? h.ok / attempts : 0.5;
      const speed = 1 / Math.max(500, h.latencyMs);
      const freshness = h.lastUsed ? Math.min(1, (now - h.lastUsed) / 60000) : 1;
      return success * 100 + speed * 100000 + freshness;
    };
    return score(hb) - score(ha);
  });
}

function recordAiSuccess(provider: string, model: string, latencyMs: number) {
  const key = healthKey(provider, model);
  const h = healthFor(provider, model);
  AI_HEALTH.set(key, {
    ok: h.ok + 1,
    fail: h.fail,
    latencyMs: Math.round(h.latencyMs * 0.35 + latencyMs * 0.65),
    lastUsed: Date.now(),
    cooldownUntil: 0,
  });
}

function recordAiFailure(provider: string, model: string, latencyMs: number, status?: number) {
  const key = healthKey(provider, model);
  const h = healthFor(provider, model);
  const severe = status === 401 || status === 403 || status === 404 || status === 429 || (status || 0) >= 500;
  const cooldown = severe ? (status === 429 ? 120000 : 60000) : 15000;
  AI_HEALTH.set(key, {
    ok: h.ok,
    fail: h.fail + 1,
    latencyMs: Math.round(h.latencyMs * 0.35 + latencyMs * 0.65),
    lastUsed: Date.now(),
    cooldownUntil: Date.now() + cooldown,
  });
}

function validBaseUrl(value: string, fallback: string) {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  const candidate = raw.replace(/\/$/, "");
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return candidate;
  } catch {}
  // A malformed optional provider URL must never abort the entire AI chain.
  // Skip that provider and let the next healthy configured provider run.
  return "";
}

function modelPrompt(caption: string, fileName: string, imageAvailable: boolean) {
  return buildAiSystem(caption) + "\n\nFilename: " + (fileName || "unknown") + "\nCaption: " + (caption || "none") +
    (imageAvailable
      ? ""
      : "\nIMPORTANT: Telegram image download is unavailable. Use filename/caption only; do not invent visual facts.");
}

async function openAICompatible(
  provider: string,
  apiKey: string,
  baseUrl: string,
  models: string[],
  imageData: string | null,
  fileName: string,
  caption: string,
) {
  let last = provider + "_no_working_model";
  for (const model of rankModels(provider, models)) {
    const startedAt = Date.now();
    const health = healthFor(provider, model);
    if (health.cooldownUntil > startedAt) continue;
    try {
      const res = await fetch(validBaseUrl(baseUrl, "https://api.openai.com/v1") + "/chat/completions", {
        method: "POST",
        headers: {
          authorization: "Bearer " + apiKey,
          "content-type": "application/json",
          ...(provider === "openrouter" ? {
            "HTTP-Referer": siteUrl(),
            "X-Title": "ArtistYar Plugin Library",
          } : {}),
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          max_tokens: 1200,
          messages: [
            { role: "system", content: buildAiSystem(caption) },
            { role: "user", content: imageData
              ? [
                  { type: "text", text: modelPrompt(caption, fileName, true) },
                  { type: "image_url", image_url: { url: imageData } },
                ]
              : modelPrompt(caption, fileName, false) },
          ],
        }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        recordAiFailure(provider, model, Date.now() - startedAt, res.status);
        last = clean(data?.error?.message || (provider + "_http_" + res.status), 240);
        // Authentication/authorization failures invalidate the provider
        // configuration; trying every model with the same bad key only wastes
        // time. Move immediately to the next configured provider.
        if (res.status === 401 || res.status === 403) throw new Error(last);
        continue;
      }
      const text = data?.choices?.[0]?.message?.content;
      if (!text) {
        last = provider + "_empty_reply";
        continue;
      }
      const parsed = parseJson(String(text));
      recordAiSuccess(provider, model, Date.now() - startedAt);
      return { data: parsed, provider, model } satisfies AiResult;
    } catch (error) {
      recordAiFailure(provider, model, Date.now() - startedAt);
      last = clean(error instanceof Error ? error.message : error, 240);
    }
  }
  throw new Error(last);
}

async function google(bytes: Buffer | null, mime: string, fileName: string, caption: string, models: string[]) {
  const k = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
  if (!k) throw new Error("google_not_configured");

  // Google model IDs change over time. Keep configured models first, but if one
  // is retired, query the account's live model catalog and automatically fall
  // back to models that currently advertise generateContent support.
  let liveModels: string[] = [];
  try {
    const catalog = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?key=" + encodeURIComponent(k),
      { cache: "no-store", signal: AbortSignal.timeout(10000) }
    );
    const catalogData = await catalog.json().catch(() => null);
    if (catalog.ok && Array.isArray(catalogData?.models)) {
      liveModels = catalogData.models
        .filter((m: any) => Array.isArray(m?.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
        .map((m: any) => String(m?.name || "").replace(/^models\//, "").trim())
        .filter(Boolean);
    }
  } catch (error) {
    console.warn("telegram_plugin_google_model_catalog_unavailable", clean(error instanceof Error ? error.message : String(error), 200));
  }

  const preferred = [
    ...models,
    "gemini-3.6-flash",
    "gemini-3.1-pro-preview",
    "gemini-3.1-flash-preview",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
  ];
  const flashLive = liveModels.filter(model => /flash/i.test(model));
  const proLive = liveModels.filter(model => /pro/i.test(model));
  const allModels = Array.from(new Set([...preferred, ...flashLive, ...proLive, ...liveModels]));
  let last = "google_no_working_model";
  for (const model of rankModels("google", allModels)) {
    const startedAt = Date.now();
    const health = healthFor("google", model);
    if (health.cooldownUntil > startedAt) continue;
    try {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + encodeURIComponent(k), {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: buildAiSystem(caption) }] },
          contents: [{ role: "user", parts: [
            { text: modelPrompt(caption, fileName, Boolean(bytes)) },
            ...(bytes ? [{ inline_data: { mime_type: mime || "image/jpeg", data: bytes.toString("base64") } }] : []),
          ] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1200, responseMimeType: "application/json" },
        }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        recordAiFailure("google", model, Date.now() - startedAt, res.status);
        last = clean(data?.error?.message || ("google_http_" + res.status), 240);
        if (res.status === 401 || res.status === 403) throw new Error(last);
        continue;
      }
      const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
      if (!text) {
        last = "google_empty_reply";
        continue;
      }
      const parsed = parseJson(text);
      recordAiSuccess("google", model, Date.now() - startedAt);
      return { data: parsed, provider: "google", model } satisfies AiResult;
    } catch (error) {
      recordAiFailure("google", model, Date.now() - startedAt);
      last = clean(error instanceof Error ? error.message : error, 240);
    }
  }
  throw new Error(last);
}

async function anthropic(imageData: string | null, fileName: string, caption: string, models: string[]) {
  const k = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (!k) throw new Error("anthropic_not_configured");
  let last = "anthropic_no_working_model";
  const comma = imageData ? imageData.indexOf(",") : -1;
  const meta = imageData && comma >= 0 ? imageData.slice(5, comma) : "";
  const mediaType = (meta.split(";")[0] || "image/jpeg");
  const base64 = imageData && comma >= 0 ? imageData.slice(comma + 1) : "";
  for (const model of rankModels("anthropic", models)) {
    const startedAt = Date.now();
    const health = healthFor("anthropic", model);
    if (health.cooldownUntil > startedAt) continue;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": k,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1200,
          system: buildAiSystem(caption),
          messages: [{ role: "user", content: [
            { type: "text", text: modelPrompt(caption, fileName, Boolean(imageData)) },
            ...(imageData ? [{ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } }] : []),
          ] }],
        }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        recordAiFailure("anthropic", model, Date.now() - startedAt, res.status);
        last = clean(data?.error?.message || ("anthropic_http_" + res.status), 240);
        if (res.status === 401 || res.status === 403) throw new Error(last);
        continue;
      }
      const text = data?.content?.filter((x: any) => x?.type === "text").map((x: any) => x.text).join("") || "";
      if (!text) {
        last = "anthropic_empty_reply";
        continue;
      }
      const parsed = parseJson(text);
      recordAiSuccess("anthropic", model, Date.now() - startedAt);
      return { data: parsed, provider: "anthropic", model } satisfies AiResult;
    } catch (error) {
      recordAiFailure("anthropic", model, Date.now() - startedAt);
      last = clean(error instanceof Error ? error.message : error, 240);
    }
  }
  throw new Error(last);
}

function modelPool(prefix: string, singleName: string, defaults: readonly string[]) {
  const configured = envList(prefix + "_MODELS");
  const single = (process.env[singleName] || "").trim();
  return Array.from(new Set([...configured, ...(single ? [single] : []), ...defaults].filter(Boolean)));
}

function modelSpeedScore(model: string) {
  const value = String(model || "").toLowerCase();
  let score = 0;
  if (/(flash|lite|mini|haiku|small|fast|instant)/i.test(value)) score += 40;
  if (/(pro|max|opus|sonnet|large|70b|72b|405b)/i.test(value)) score -= 10;
  return score;
}

async function discoverOpenAICompatibleModels(apiKey: string, baseUrl: string) {
  const base = validBaseUrl(baseUrl, "");
  if (!base) return [];
  try {
    const res = await fetch(base + "/models", {
      headers: { authorization: "Bearer " + apiKey, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data?.data)) return [];
    return data.data
      .map((item: any) => String(item?.id || "").trim())
      .filter(Boolean);
  } catch (error) {
    console.warn("telegram_plugin_model_discovery_failed", clean(error instanceof Error ? error.message : String(error), 200));
    return [];
  }
}

async function discoverAnthropicModels(apiKey: string) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data?.data)) return [];
    return data.data.map((item: any) => String(item?.id || "").trim()).filter(Boolean);
  } catch (error) {
    console.warn("telegram_plugin_anthropic_model_discovery_failed", clean(error instanceof Error ? error.message : String(error), 200));
    return [];
  }
}

async function identify(imageFileId: string, fileName: string, caption: string) {
  // Only the Telegram photo is downloaded for vision. Documents are metadata only.
  let image: { bytes: Buffer; contentType: string } | null = null;
  try {
    const downloaded = await telegramBytes(imageFileId);
    if (!downloaded.contentType.startsWith("image/")) throw new Error("telegram_photo_not_image");
    image = downloaded;
  } catch (error) {
    console.warn("telegram_plugin_vision_unavailable", clean(error instanceof Error ? error.message : String(error), 300));
  }

  const dataUrl = image
    ? "data:" + image.contentType + ";base64," + image.bytes.toString("base64")
    : null;

  type Candidate = { provider: string; model: string; run: () => Promise<AiResult> };
  const candidates: Candidate[] = [];

  const googleKey = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
  if (googleKey) {
    let live: string[] = [];
    try {
      const catalog = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models?key=" + encodeURIComponent(googleKey),
        { cache: "no-store", signal: AbortSignal.timeout(10000) }
      );
      const catalogData = await catalog.json().catch(() => null);
      if (catalog.ok && Array.isArray(catalogData?.models)) {
        live = catalogData.models
          .filter((m: any) => Array.isArray(m?.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
          .map((m: any) => String(m?.name || "").replace(/^models\//, "").trim())
          .filter(Boolean);
      }
    } catch (error) {
      console.warn("telegram_plugin_google_model_catalog_unavailable", clean(error instanceof Error ? error.message : String(error), 200));
    }
    const models = Array.from(new Set([
      ...modelPool("PLUGIN_AI_GEMINI", "PLUGIN_AI_GEMINI_MODEL", []),
      ...live,
    ]));
    for (const model of models) {
      candidates.push({
        provider: "google",
        model,
        run: () => google(image?.bytes || null, image?.contentType || "image/jpeg", fileName, caption, [model]),
      });
    }
  }

  const openaiKey = (process.env.OPENAI_API_KEY || "").trim();
  if (openaiKey) {
    const base = validBaseUrl(process.env.OPENAI_BASE_URL || "", "https://api.openai.com/v1");
    if (base) {
      const discovered = await discoverOpenAICompatibleModels(openaiKey, base);
      const models = Array.from(new Set([
        ...modelPool("PLUGIN_AI_OPENAI", "OPENAI_MODEL", [process.env.PLUGIN_AI_VISION_MODEL || "", "gpt-4o-mini"]),
        ...discovered,
      ]));
      for (const model of models) {
        candidates.push({
          provider: "openai",
          model,
          run: () => openAICompatible("openai", openaiKey, base, [model], dataUrl, fileName, caption),
        });
      }
    }
  }

  const openrouterKey = (process.env.OPENROUTER_API_KEY || "").trim();
  if (openrouterKey) {
    const base = validBaseUrl(process.env.OPENROUTER_BASE_URL || "", "https://openrouter.ai/api/v1");
    if (base) {
      const discovered = await discoverOpenAICompatibleModels(openrouterKey, base);
      const models = Array.from(new Set([
        ...modelPool("PLUGIN_AI_OPENROUTER", "OPENROUTER_MODEL", []),
        ...discovered,
      ]));
      for (const model of models) {
        candidates.push({
          provider: "openrouter",
          model,
          run: () => openAICompatible("openrouter", openrouterKey, base, [model], dataUrl, fileName, caption),
        });
      }
    }
  }

  const anthropicKey = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (anthropicKey) {
    const discovered = await discoverAnthropicModels(anthropicKey);
    const models = Array.from(new Set([
      ...modelPool("PLUGIN_AI_ANTHROPIC", "ANTHROPIC_MODEL", []),
      ...discovered,
    ]));
    for (const model of models) {
      candidates.push({
        provider: "anthropic",
        model,
        run: () => anthropic(dataUrl, fileName, caption, [model]),
      });
    }
  }

  const compatibleProviders = [
    ["groq", "GROQ_API_KEY", "GROQ_BASE_URL", "GROQ_MODEL", "https://api.groq.com/openai/v1", ["meta-llama/llama-4-scout-17b-16e-instruct"]],
    ["xai", "XAI_API_KEY", "XAI_BASE_URL", "XAI_MODEL", "https://api.x.ai/v1", ["grok-4-1-fast-reasoning"]],
    ["mistral", "MISTRAL_API_KEY", "MISTRAL_BASE_URL", "MISTRAL_MODEL", "https://api.mistral.ai/v1", ["pixtral-large-latest"]],
    ["together", "TOGETHER_API_KEY", "TOGETHER_BASE_URL", "TOGETHER_MODEL", "https://api.together.xyz/v1", ["Qwen/Qwen2.5-VL-72B-Instruct"]],
    ["fireworks", "FIREWORKS_API_KEY", "FIREWORKS_BASE_URL", "FIREWORKS_MODEL", "https://api.fireworks.ai/inference/v1", ["accounts/fireworks/models/qwen2p5-vl-32b-instruct"]],
    ["agentrouter", "AGENTROUTER_API_KEY", "AGENTROUTER_BASE_URL", "AGENTROUTER_MODEL", "https://co.agentrouter.org/v1", ["gpt-5.5"]],
    ["xkiro", "XKIRO_API_KEY", "XKIRO_BASE_URL", "XKIRO_MODEL", "https://api.xkiro.com/v1", []],
    ["bytez", "BYTEZ_API_KEY", "BYTEZ_BASE_URL", "BYTEZ_MODEL", "https://api.bytez.com/models/v2/openai/v1", []],
    ["deepseek", "DEEPSEEK_API_KEY", "DEEPSEEK_BASE_URL", "DEEPSEEK_MODEL", "https://api.deepseek.com/v1", []],
  ] as const;

  for (const [provider, keyName, baseName, modelName, defaultBase, defaults] of compatibleProviders) {
    const apiKey = (process.env[keyName] || "").trim();
    if (!apiKey) continue;
    const base = validBaseUrl(process.env[baseName] || "", defaultBase);
    if (!base) {
      console.warn("telegram_plugin_invalid_provider_base_url", provider, baseName);
      continue;
    }

    // Never require manual model configuration. Ask the provider for its live
    // model catalog, then merge configured/default models as a fallback.
    const discovered = await discoverOpenAICompatibleModels(apiKey, base);
    const models = Array.from(new Set([
      ...modelPool("PLUGIN_AI_" + provider.toUpperCase(), modelName, defaults),
      ...discovered,
    ]));

    for (const model of models) {
      candidates.push({
        provider,
        model,
        run: () => openAICompatible(provider, apiKey, base, [model], dataUrl, fileName, caption),
      });
    }
  }


  // Also discover any OpenAI-compatible provider configured in ENV, even if it
  // was not known when this integration was written.
  for (const p of discoverEnvCompatibleProviders()) {
    const apiKey = (process.env[p.keyName] || "").trim();
    const models = await discoverCachedModels(p.id, apiKey, p.baseUrl);
    const configured = modelPool("PLUGIN_AI_" + p.id.toUpperCase(), p.modelName, []);
    for (const model of Array.from(new Set([...configured, ...models]))) {
      candidates.push({
        provider: p.id,
        model,
        run: () => openAICompatible(p.id, apiKey, p.baseUrl, [model], dataUrl, fileName, caption),
      });
    }
  }

  if (!candidates.length) throw new Error("no_plugin_vision_ai_configured");

  // Global automatic routing:
  // 1) temporarily cooled/failed models are deprioritized;
  // 2) historically successful/fast models are preferred;
  // 3) lightweight/fast model families break ties;
  // 4) every configured provider participates, not just Google.
  const ordered = candidates
    .filter(candidate => {
      const h = healthFor(candidate.provider, candidate.model);
      return h.cooldownUntil <= Date.now();
    })
    .sort((a, b) => {
      const score = (candidate: Candidate) => {
        const h = healthFor(candidate.provider, candidate.model);
        const attempts = h.ok + h.fail;
        const success = attempts ? h.ok / attempts : 0.5;
        const latency = 1 / Math.max(500, h.latencyMs);
        return success * 1000 + latency * 1000000 + modelSpeedScore(candidate.model);
      };
      return score(b) - score(a);
    });

  const failures: string[] = [];
  for (const candidate of ordered) {
    try {
      return await candidate.run();
    } catch (error) {
      const message = clean(error instanceof Error ? error.message : String(error), 300);
      failures.push(candidate.provider + ":" + candidate.model + ":" + message);
    }
  }

  // If every model is currently cooling down, allow the least-bad candidate
  // to probe again instead of deadlocking the queue.
  if (!ordered.length) {
    const retry = candidates.slice().sort((a, b) => {
      const ha = healthFor(a.provider, a.model);
      const hb = healthFor(b.provider, b.model);
      return ha.cooldownUntil - hb.cooldownUntil;
    })[0];
    if (retry) {
      try {
        return await retry.run();
      } catch (error) {
        failures.push(retry.provider + ":" + retry.model + ":" + clean(error instanceof Error ? error.message : String(error), 300));
      }
    }
  }

  throw new Error("plugin_ai_all_models_failed:" + failures.slice(0, 20).join(" | "));
}
function esc(v: string) { return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function tag(v: string) { return String(v || "").trim().replace(/[^\p{L}\p{N}_-]+/gu, "_").replace(/^_+|_+$/g, "").slice(0, 48); }
function makeCaption(p: PluginData) {
  const translated = p.translatedCaption || "";
  if (translated) {
    const cleanedTranslated = sanitizeCaption(translated).replace(/\n\n🎛️ ArtistYar — https:\/\/artistyaar\.ir\n📢 Channel: @ProAudios$/i, "").trim();
    return (esc(cleanedTranslated) + "\n\n🎛️ <b>ArtistYar</b> — https://artistyaar.ir\n📢 Channel: @ProAudios").slice(0, 1000);
  }

  const lines = [
    "🎛️ <b>" + esc(p.title) + "</b>",
    p.developer ? "🏷 <b>Developer:</b> " + esc(p.developer) : "",
    p.version ? "🔢 <b>Version:</b> " + esc(p.version) : "",
    p.category ? "🎚 <b>Category:</b> " + esc(p.category) : "",
    p.formats.length ? "🔌 <b>Format:</b> " + esc(p.formats.join(" / ")) : "",
    p.platforms.length ? "💻 <b>Platform:</b> " + esc(p.platforms.join(" / ")) : "",
    p.description ? "\n" + esc(p.description) : "",
    p.features.length ? "\n✨ <b>ویژگی‌ها</b>\n" + p.features.slice(0, 6).map(x => "• " + esc(x)).join("\n") : "",
    p.tags.length ? "\n" + p.tags.map(x => "#" + tag(x)).join(" ") : "",
    "\n\n🎛️ <b>ArtistYar</b> — https://artistyaar.ir",
    "📢 Channel: @ProAudios",
  ];
  return lines.filter(Boolean).join("\n").slice(0, 1000);
}
async function editCaption(chatId: string | number, messageId: number, caption: string) {
  try {
    return await tg("editMessageCaption", {
      chat_id: chatId,
      message_id: messageId,
      caption: caption.slice(0, 1024),
      parse_mode: "HTML",
    });
  } catch (error) {
    const message = clean(error instanceof Error ? error.message : String(error), 300);
    if (/message is not modified/i.test(message)) return true;
    throw error;
  }
}
export async function processPluginPair(photo: TgMessage, doc: TgMessage) {
  if (!db) throw new Error("supabase_not_configured");
  const chatId = String(photo.chat?.id || doc.chat?.id || "");
  const photoFileId = photo.photo?.at(-1)?.file_id;
  const docFileId = doc.document?.file_id;
  if (!chatId || !photoFileId || !docFileId) throw new Error("plugin_pair_missing_media");
  const fileName = clean(doc.document?.file_name, 240);
  const caption = clean(photo.caption || doc.caption, 1200);
  const ai = await identify(photoFileId, fileName, caption);
  const p = enforceCaptionFacts(ai.data, caption);
  const postUrl = photo.chat?.username ? "https://t.me/" + photo.chat.username + "/" + photo.message_id : null;
  const result = await db.from("telegram_plugin_posts").upsert({
    channel_id: chatId, photo_message_id: photo.message_id, document_message_id: doc.message_id,
    telegram_photo_file_id: photoFileId, telegram_file_id: docFileId, file_name: fileName || null,
    mime_type: doc.document?.mime_type || null, file_size: doc.document?.file_size || null,
    title: p.title, developer: p.developer || null, version: p.version || null, category: p.category,
    formats: p.formats, platforms: p.platforms, description: p.description, features: p.features, tags: p.tags,
    raw_caption: caption, telegram_post_url: postUrl, ai_provider: ai.provider, ai_model: ai.model,
    status: "published", error_message: null, updated_at: new Date().toISOString(),
  }, { onConflict: "channel_id,document_message_id" }).select("id").single();
  if (result.error) throw new Error("plugin_db_insert_failed:" + result.error.message);
  const finalCaption = makeCaption(p);
  // The photo is the original public post we enrich. Never edit/repost the
  // companion document: it must remain the original downloadable file message.
  try {
    await editCaption(photo.chat?.id || chatId, photo.message_id, finalCaption);
  } catch (error) {
    const message = clean(error instanceof Error ? error.message : String(error), 300);
    if (/message to edit not found|message not found/i.test(message)) {
      // The source message may have been deleted/expired before the worker ran.
      // This is terminal for Telegram editing, not a retryable AI/queue failure.
      await db.from("telegram_plugin_posts").update({
        status: "published",
        error_message: "source_message_not_found",
        updated_at: new Date().toISOString(),
      }).eq("id", result.data?.id);
      return { id: result.data?.id, title: p.title, edit_skipped: true };
    }
    throw error;
  }
  return { id: result.data?.id, title: p.title };
}
export async function enqueuePluginMessage(message: TgMessage) {
  if (!db) throw new Error("supabase_not_configured");
  const chatId = String(message.chat?.id || "");
  if (!chatId) throw new Error("telegram_channel_id_missing");
  const configured = configuredChannel();
  const username = message.chat?.username ? "@" + message.chat.username : "";
  if (configured.startsWith("@") && username && configured.toLowerCase() !== username.toLowerCase()) return { ignored: true };
  const kind = message.document ? "document" : message.photo ? "photo" : null;
  if (!kind) return { ignored: true };

  // Ignore temporary recovery posts created by the 404 CDN fallback.
  if ((message.caption || "").includes("ARTISTYAR_INTERNAL_RECOVERY")) return { ignored: true };

  const fileId = kind === "document"
    ? message.document!.file_id
    : message.photo![message.photo!.length - 1].file_id;

  // Exact Telegram file dedupe: a repeated webhook/post for the same media must not
  // create another queue item or trigger another AI run.
  const duplicate = await db.from("telegram_plugin_ingest_queue")
    .select("id,message_id")
    .eq("channel_id", chatId)
    .eq("kind", kind)
    .eq("file_id", fileId)
    .limit(1)
    .maybeSingle();
  if (duplicate.error) throw new Error("plugin_queue_dedupe_check_failed:" + duplicate.error.message);
  if (duplicate.data && Number(duplicate.data.message_id) !== Number(message.message_id)) {
    return { ignored: true, duplicate: true, original_message_id: Number(duplicate.data.message_id) };
  }

  const inserted = await db.from("telegram_plugin_ingest_queue").upsert({
    channel_id: chatId,
    message_id: message.message_id,
    kind,
    file_id: fileId,
    file_name: message.document?.file_name || null,
    mime_type: message.document?.mime_type || null,
    file_size: message.document?.file_size || null,
    caption: clean(message.caption, 1200),
  }, { onConflict: "channel_id,message_id", ignoreDuplicates: true }).select("*").maybeSingle();

  if (inserted.error) throw new Error("plugin_queue_insert_failed:" + inserted.error.message);

  // Telegram may retry a webhook after a 5xx. Reuse the existing queue row
  // instead of treating the retry as a terminal duplicate.
  const current = inserted.data || (await db.from("telegram_plugin_ingest_queue")
    .select("*")
    .eq("channel_id", chatId)
    .eq("message_id", message.message_id)
    .maybeSingle()).data;

  if (!current) throw new Error("plugin_queue_row_missing_after_upsert");
  return { queued: true, kind: current.kind, message_id: Number(current.message_id) };
}

function rowToPhoto(row: any): TgMessage {
  return {
    message_id: Number(row.message_id),
    chat: { id: Number(row.channel_id) },
    caption: row.caption || "",
    photo: [{ file_id: row.file_id, width: 1, height: 1 }],
  };
}

function rowToDocument(row: any): TgMessage {
  return {
    message_id: Number(row.message_id),
    chat: { id: Number(row.channel_id) },
    caption: row.caption || "",
    document: {
      file_id: row.file_id,
      file_name: row.file_name || undefined,
      mime_type: row.mime_type || undefined,
      file_size: row.file_size || undefined,
    },
  };
}

export async function processPendingPluginPairs(limit = 5) {
  if (!db) throw new Error("supabase_not_configured");
  const safeLimit = Math.max(1, Math.min(limit, 10));
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const photos = await db.from("telegram_plugin_ingest_queue")
    .select("*")
    .eq("kind", "photo")
    .gte("received_at", cutoff)
    .order("received_at", { ascending: true })
    .limit(50);
  if (photos.error) throw new Error("plugin_photo_queue_read_failed:" + photos.error.message);

  const documents = await db.from("telegram_plugin_ingest_queue")
    .select("*")
    .eq("kind", "document")
    .gte("received_at", cutoff)
    .order("received_at", { ascending: true })
    .limit(50);
  if (documents.error) throw new Error("plugin_document_queue_read_failed:" + documents.error.message);

  const docsByChannel = new Map<string, any[]>();
  for (const row of documents.data || []) {
    const key = String(row.channel_id);
    const list = docsByChannel.get(key) || [];
    list.push(row);
    docsByChannel.set(key, list);
  }

  let processed = 0;
  const errors: Array<{ photo_message_id: number; document_message_id: number; error: string }> = [];

  for (const photo of photos.data || []) {
    if (processed >= safeLimit) break;
    const channelDocs = docsByChannel.get(String(photo.channel_id)) || [];
    const photoTime = new Date(photo.received_at).getTime();

    // Match the nearest document posted within 5 minutes of the image. The queue\n    // can be retried later, so do not discard older-but-valid pairs.
    let best: any = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const doc of channelDocs) {
      const distance = Math.abs(new Date(doc.received_at).getTime() - photoTime);
      if (distance <= 300000 && distance < bestDistance) {
        best = doc;
        bestDistance = distance;
      }
    }
    if (!best) continue;

    try {
      const claim = await db.rpc("claim_telegram_plugin_pair", {
        p_photo_id: photo.id,
        p_document_id: best.id,
      });

      if (claim.error) {
        // Atomic pair claiming is mandatory in production. Never fall back to
        // an unclaimed read/process path because webhook + cron workers can race.
        throw new Error("plugin_pair_claim_failed:" + claim.error.message);
      } else if (!claim.data) {
        continue;
      }

      await processPluginPair(rowToPhoto(photo), rowToDocument(best));
      const deleted = await db.from("telegram_plugin_ingest_queue")
        .delete()
        .in("id", [photo.id, best.id]);
      if (deleted.error) throw new Error("plugin_queue_cleanup_failed:" + deleted.error.message);
      processed++;
    } catch (error) {
      // Release the pair immediately on failure. The atomic claim remains the
      // race-safety mechanism, while failed AI/Telegram calls become retryable
      // without waiting for the 10-minute stale-lock window.
      try {
        await db.from("telegram_plugin_ingest_queue")
          .update({ processing_at: null })
          .in("id", [photo.id, best.id]);
      } catch {
        // Best-effort unlock; the stale-lock guard remains as a fallback.
      }
      errors.push({
        photo_message_id: Number(photo.message_id),
        document_message_id: Number(best.message_id),
        error: clean(error instanceof Error ? error.message : error, 500),
      });
    }
  }

  return { processed, errors, pending_checked: (photos.data || []).length };
}

export async function setPluginWebhook(urlValue: string, secretToken?: string) {
  // Only new channel posts are relevant. In particular, do not subscribe to
  // edited_channel_post: editing the source caption below would otherwise feed
  // our own edit back into the ingestion queue.
  return tg("setWebhook", {
    url: urlValue,
    allowed_updates: ["channel_post"],
    drop_pending_updates: false,
    ...(secretToken ? { secret_token: secretToken } : {}),
  });
}
export async function getPluginWebhookInfo() { return tg("getWebhookInfo", {}); }
export async function getPluginChannelAdminStatus() {
  const me = await tg("getMe", {});
  const chatId = configuredChannel();
  const member = await tg("getChatMember", {
    chat_id: chatId,
    user_id: Number(me?.id),
  });
  const isAdmin = member?.status === "administrator" || member?.status === "creator";
  const canEdit = Boolean(member?.can_edit_messages);
  return {
    bot_id: me?.id,
    bot_username: me?.username,
    status: member?.status,
    is_administrator: isAdmin,
    can_edit_messages: canEdit,
    can_post_messages: member?.can_post_messages ?? false,
    can_delete_messages: member?.can_delete_messages ?? false,
    required_permissions_ok: isAdmin && canEdit,
    required_permissions: ["administrator", "can_edit_messages"],
  };
}
export async function pluginImageResponse(fileId: string) {
  const file = await telegramGetFile(fileId);
  const res = await fetch(file.url, { cache: "no-store", signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error("telegram_image_failed_" + res.status);
  return res;
}
export async function pluginDownloadResponse(fileId: string) {
  const file = await telegramGetFile(fileId);
  const res = await fetch(file.url, { cache: "no-store", signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error("telegram_download_failed_" + res.status);
  return { response: res, filePath: file.filePath };
}
export function pluginTokenConfigured() { return Boolean(botToken()); }
export { siteUrl };
