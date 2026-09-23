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
  const res = await fetch(TG + "/bot" + t + "/" + method, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    cache: "no-store", signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) throw new Error(clean(data?.description || ("telegram_" + method + "_failed"), 240));
  return data.result;
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

async function telegramBytes(fileId: string, recoveryChatId?: string) {
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

      // Telegram can occasionally return a valid file_path while the public
      // download endpoint answers 404. Re-materialize the same Telegram-hosted
      // photo with sendPhoto, download the returned file_id, then remove the
      // temporary channel post. This keeps the original image out of Supabase
      // Storage and does not expose the bot token to an AI provider.
      if (native.status === 404 && recoveryChatId) {
        try {
          const recovered = await tg("sendPhoto", {
            chat_id: recoveryChatId,
            photo: fileId,
            caption: "ARTISTYAR_INTERNAL_RECOVERY",
            disable_notification: true,
          });
          const recoveredFileId = recovered?.photo?.at(-1)?.file_id;
          const recoveredMessageId = Number(recovered?.message_id || 0);
          if (recoveredFileId) {
            const recoveredFile = await telegramGetFile(recoveredFileId);
            const recoveredDownload = await httpsDownload(recoveredFile.url);
            if (recoveredDownload.status >= 200 && recoveredDownload.status < 300) {
              if (recoveredMessageId) {
                try {
                  await tg("deleteMessage", { chat_id: recoveryChatId, message_id: recoveredMessageId });
                } catch {}
              }
              return {
                bytes: recoveredDownload.bytes,
                contentType: imageMimeFromPath(recoveredFile.filePath, recoveredDownload.contentType),
              };
            }
          }
          if (recoveredMessageId) {
            try {
              await tg("deleteMessage", { chat_id: recoveryChatId, message_id: recoveredMessageId });
            } catch {}
          }
        } catch {}
      }

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
const SYSTEM = "Identify a music-production plugin from the image, filename and caption. FACT PRIORITY: use explicit facts in the Telegram caption first, then filename, then visible image text; never contradict an explicit caption fact. The Telegram caption is the primary source. translated_caption must be a faithful Persian translation/cleanup of the useful original caption, not an invented replacement. If the caption is already Persian, preserve it and only clean promotional noise. Preserve exact product/developer names, version, formats, platform, technical terms and factual meaning. Remove promotional content and unrelated links. Keep only links to artistyaar.ir and the source channel t.me/ProAudios. Never invent unknown values. Return JSON only with title, developer, version, category, formats, platforms, description, features, tags, translated_caption. Use concise Persian for description/features and conventional English for product/developer/technical names. Category examples: Synthesizer, EQ, Compressor, Reverb, Delay, Saturation, Distortion, Limiter, Dynamics, Instrument, Sampler, Utility, Mastering, Bundle, Other."

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

  value = value.replace(/https?:\/\/[^\s)]+/gi, match => {
    const lower = match.toLowerCase();
    return (lower.includes("artistyaar.ir") || lower.includes("t.me/proaudios")) ? match : "";
  });

  value = value.replace(/\[([^\]]+)\]\((?!https?:\/\/(?:www\.)?artistyaar\.ir|https?:\/\/t\.me\/proaudios)[^)]*\)/gi, "");
  value = value.split("\n").filter(line => {
    const t = line.trim();
    return !/(BEATTALK|ДРАМ КИТЫ|Видеокурсы по музыке|beat talk|драм киты)/i.test(t);
  }).join("\n");

  return value.replace(/\n{3,}/g, "\n\n").trim().slice(0, 3500);
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

async function openAICompatible(
  provider: string,
  apiKey: string,
  baseUrl: string,
  models: string[],
  imageData: string,
  fileName: string,
  caption: string,
) {
  let last = provider + "_no_working_model";
  for (const model of models) {
    try {
      const res = await fetch(baseUrl.replace(/\/$/, "") + "/chat/completions", {
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
            { role: "system", content: SYSTEM },
            { role: "user", content: [
              { type: "text", text: "Filename: " + (fileName || "unknown") + "\nCaption: " + (caption || "none") },
              { type: "image_url", image_url: { url: imageData } },
            ] },
          ],
        }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        last = clean(data?.error?.message || (provider + "_http_" + res.status), 240);
        continue;
      }
      const text = data?.choices?.[0]?.message?.content;
      if (!text) {
        last = provider + "_empty_reply";
        continue;
      }
      return { data: parseJson(String(text)), provider, model } satisfies AiResult;
    } catch (error) {
      last = clean(error instanceof Error ? error.message : error, 240);
    }
  }
  throw new Error(last);
}

async function google(bytes: Buffer, mime: string, fileName: string, caption: string, models: string[]) {
  const k = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
  if (!k) throw new Error("google_not_configured");
  let last = "google_no_working_model";
  for (const model of models) {
    try {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + encodeURIComponent(k), {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: "user", parts: [
            { text: "Filename: " + (fileName || "unknown") + "\nCaption: " + (caption || "none") },
            { inline_data: { mime_type: mime || "image/jpeg", data: bytes.toString("base64") } },
          ] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1200, responseMimeType: "application/json" },
        }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        last = clean(data?.error?.message || ("google_http_" + res.status), 240);
        continue;
      }
      const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
      if (!text) {
        last = "google_empty_reply";
        continue;
      }
      return { data: parseJson(text), provider: "google", model } satisfies AiResult;
    } catch (error) {
      last = clean(error instanceof Error ? error.message : error, 240);
    }
  }
  throw new Error(last);
}

async function anthropic(imageData: string, fileName: string, caption: string, models: string[]) {
  const k = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (!k) throw new Error("anthropic_not_configured");
  let last = "anthropic_no_working_model";
  const comma = imageData.indexOf(",");
  const meta = imageData.slice(5, comma);
  const mediaType = (meta.split(";")[0] || "image/jpeg");
  const base64 = imageData.slice(comma + 1);
  for (const model of models) {
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
          system: SYSTEM,
          messages: [{ role: "user", content: [
            { type: "text", text: "Filename: " + (fileName || "unknown") + "\nCaption: " + (caption || "none") },
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          ] }],
        }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        last = clean(data?.error?.message || ("anthropic_http_" + res.status), 240);
        continue;
      }
      const text = data?.content?.filter((x: any) => x?.type === "text").map((x: any) => x.text).join("") || "";
      if (!text) {
        last = "anthropic_empty_reply";
        continue;
      }
      return { data: parseJson(text), provider: "anthropic", model } satisfies AiResult;
    } catch (error) {
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

async function identify(imageFileId: string, fileName: string, caption: string, recoveryChatId?: string) {
  const image = await telegramBytes(imageFileId, recoveryChatId);
  if (!image.contentType.startsWith("image/")) throw new Error("telegram_photo_not_image");
  const dataUrl = "data:" + image.contentType + ";base64," + image.bytes.toString("base64");

  const googleKey = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
  const candidates: Array<() => Promise<AiResult>> = [];

  if (googleKey) {
    candidates.push(() => google(
      image.bytes,
      image.contentType,
      fileName,
      caption,
      modelPool("PLUGIN_AI_GEMINI", "PLUGIN_AI_GEMINI_MODEL", ["gemini-2.5-flash", "gemini-2.5-pro"])
    ));
  }

  const openaiKey = (process.env.OPENAI_API_KEY || "").trim();
  if (openaiKey) {
    candidates.push(() => openAICompatible(
      "openai",
      openaiKey,
      process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      modelPool("PLUGIN_AI_OPENAI", "OPENAI_MODEL", [process.env.PLUGIN_AI_VISION_MODEL || "", "gpt-4o-mini"]),
      dataUrl,
      fileName,
      caption
    ));
  }

  const openrouterKey = (process.env.OPENROUTER_API_KEY || "").trim();
  if (openrouterKey) {
    candidates.push(() => openAICompatible(
      "openrouter",
      openrouterKey,
      process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
      modelPool("PLUGIN_AI_OPENROUTER", "OPENROUTER_MODEL", ["google/gemini-2.5-flash"]),
      dataUrl,
      fileName,
      caption
    ));
  }

  const anthropicKey = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (anthropicKey) {
    candidates.push(() => anthropic(
      dataUrl,
      fileName,
      caption,
      modelPool("PLUGIN_AI_ANTHROPIC", "ANTHROPIC_MODEL", ["claude-sonnet-4-20250514"])
    ));
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
    const base = process.env[baseName] || defaultBase;
    const models = modelPool("PLUGIN_AI_" + provider.toUpperCase(), modelName, defaults);
    if (!models.length) continue;
    candidates.push(() => openAICompatible(provider, apiKey, base, models, dataUrl, fileName, caption));
  }

  if (!candidates.length) throw new Error("no_plugin_vision_ai_configured");

  // Rotate the first provider by Telegram message ID so one provider/model is
  // not permanently preferred. Every configured provider/model remains a
  // fallback if earlier candidates fail.
  const offset = Math.abs(Number(imageFileId.slice(-6).replace(/\D/g, "") || "0")) % candidates.length;
  const rotated = candidates.slice(offset).concat(candidates.slice(0, offset));

  let last = "plugin_ai_failed";
  for (const run of rotated) {
    try { return await run(); }
    catch (error) { last = clean(error instanceof Error ? error.message : error, 300); }
  }
  throw new Error(last);
}
function esc(v: string) { return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function makeCaption(p: PluginData) {
  const translated = sanitizeCaption(p.translatedCaption || "");
  if (translated) {
    const footer = "\n\n🎛️ <b>ArtistYar</b> — https://artistyaar.ir";
    return (translated + footer).slice(0, 3900);
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
  ];
  return lines.filter(Boolean).join("\n").slice(0, 3900);
}
async function editCaption(chatId: string | number, messageId: number, caption: string) {
  try { await tg("editMessageCaption", { chat_id: chatId, message_id: messageId, caption, parse_mode: "HTML" }); } catch {}
}
export async function processPluginPair(photo: TgMessage, doc: TgMessage) {
  if (!db) throw new Error("supabase_not_configured");
  const chatId = String(photo.chat?.id || doc.chat?.id || "");
  const photoFileId = photo.photo?.at(-1)?.file_id;
  const docFileId = doc.document?.file_id;
  if (!chatId || !photoFileId || !docFileId) throw new Error("plugin_pair_missing_media");
  const fileName = clean(doc.document?.file_name, 240);
  const caption = clean(photo.caption || doc.caption, 1200);
  const ai = await identify(photoFileId, fileName, caption, chatId);
  const p = ai.data;
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
  await editCaption(photo.chat?.id || chatId, photo.message_id, finalCaption);
  await editCaption(doc.chat?.id || chatId, doc.message_id, finalCaption);
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
      const result = await processPluginPair(rowToPhoto(photo), rowToDocument(best));
      const deleted = await db.from("telegram_plugin_ingest_queue")
        .delete()
        .in("id", [photo.id, best.id]);
      if (deleted.error) throw new Error("plugin_queue_cleanup_failed:" + deleted.error.message);
      processed++;
    } catch (error) {
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
  return tg("setWebhook", { url: urlValue, allowed_updates: ["channel_post", "edited_channel_post"], drop_pending_updates: false, ...(secretToken ? { secret_token: secretToken } : {}) });
}
export async function getPluginWebhookInfo() { return tg("getWebhookInfo", {}); }
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
