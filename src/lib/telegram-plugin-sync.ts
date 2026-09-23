
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
  return String(v ?? "").replace(/[\\u0000-\\u001f]/g, " ").replace(/\\s+/g, " ").trim().slice(0, max);
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
async function telegramBytes(fileId: string) {
  const file = await telegramGetFile(fileId);
  const res = await fetch(file.url, { cache: "no-store", signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error("telegram_file_download_failed_" + res.status);
  return { bytes: Buffer.from(await res.arrayBuffer()), contentType: res.headers.get("content-type") || "application/octet-stream" };
}
function parseJson(text: string): PluginData {
  const raw = text.trim().replace(/^\`\`\`json\\s*/i, "").replace(/^\`\`\`\\s*/i, "").replace(/\\s*\`\`\`$/i, "");
  const p = JSON.parse(raw);
  const arr = (v: unknown, max: number) => Array.isArray(v) ? v.map(x => clean(x, 180)).filter(Boolean).slice(0, max) : [];
  return {
    title: clean(p.title, 160) || "پلاگین بدون نام",
    developer: clean(p.developer, 120), version: clean(p.version, 80),
    category: clean(p.category, 80) || "Other", formats: arr(p.formats, 10), platforms: arr(p.platforms, 10),
    description: clean(p.description, 1800), features: arr(p.features, 8), tags: arr(p.tags, 15),
  };
}
const SYSTEM = "Identify a music-production plugin from the image, filename and caption. Return JSON only with title, developer, version, category, formats, platforms, description, features, tags. Never invent facts; unknown values must be empty. Use concise Persian for description/features and conventional English for product/developer/technical names. Category examples: Synthesizer, EQ, Compressor, Reverb, Delay, Saturation, Distortion, Limiter, Dynamics, Instrument, Sampler, Utility, Mastering, Bundle, Other.";

async function openAI(imageData: string, fileName: string, caption: string) {
  const k = (process.env.OPENAI_API_KEY || "").trim();
  if (!k) throw new Error("openai_not_configured");
  const model = (process.env.PLUGIN_AI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const res = await fetch(base + "/chat/completions", {
    method: "POST", headers: { authorization: "Bearer " + k, "content-type": "application/json" },
    body: JSON.stringify({ model, temperature: 0.1, max_tokens: 1200, messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: [
        { type: "text", text: "Filename: " + (fileName || "unknown") + "\nCaption: " + (caption || "none") },
        { type: "image_url", image_url: { url: imageData } },
      ] },
    ] }),
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(clean(data?.error?.message || ("openai_http_" + res.status), 240));
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("openai_empty_reply");
  return { data: parseJson(String(text)), provider: "openai", model };
}

async function google(bytes: Buffer, mime: string, fileName: string, caption: string) {
  const k = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
  if (!k) throw new Error("google_not_configured");
  const model = (process.env.PLUGIN_AI_GEMINI_MODEL || "gemini-2.5-flash").trim();
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
  if (!res.ok) throw new Error(clean(data?.error?.message || ("google_http_" + res.status), 240));
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
  if (!text) throw new Error("google_empty_reply");
  return { data: parseJson(text), provider: "google", model };
}

async function identify(imageFileId: string, fileName: string, caption: string) {
  const image = await telegramBytes(imageFileId);
  const dataUrl = "data:" + image.contentType + ";base64," + image.bytes.toString("base64");
  const attempts = [
    () => google(image.bytes, image.contentType, fileName, caption),
    () => openAI(dataUrl, fileName, caption),
  ];
  let last = "plugin_ai_failed";
  for (const run of attempts) {
    try { return await run(); } catch (e) { last = clean(e instanceof Error ? e.message : e, 240); }
  }
  throw new Error(last);
}
function esc(v: string) { return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function tag(v: string) { return v.replace(/[^\\p{L}\\p{N}_-]/gu, "").slice(0, 40) || "plugin"; }
function makeCaption(p: PluginData) {
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
  ];
  return lines.filter(Boolean).join("\n").slice(0, 1000);
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
  const ai = await identify(photoFileId, fileName, caption);
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
  const fileId = kind === "document" ? message.document!.file_id : message.photo![message.photo!.length - 1].file_id;
  const inserted = await db.from("telegram_plugin_ingest_queue").upsert({
    channel_id: chatId, message_id: message.message_id, kind, file_id: fileId,
    file_name: message.document?.file_name || null, mime_type: message.document?.mime_type || null,
    file_size: message.document?.file_size || null, caption: clean(message.caption, 1200),
  }, { onConflict: "channel_id,message_id", ignoreDuplicates: true }).select("*").maybeSingle();
  if (inserted.error) throw new Error("plugin_queue_insert_failed:" + inserted.error.message);
  if (!inserted.data) return { duplicate: true };
  const opposite = kind === "photo" ? "document" : "photo";
  const cutoff = new Date(Date.now() - 120000).toISOString();
  const matches = await db.from("telegram_plugin_ingest_queue").select("*").eq("channel_id", chatId).eq("kind", opposite).gte("received_at", cutoff).order("received_at", { ascending: false }).limit(5);
  if (matches.error) throw new Error("plugin_queue_match_failed:" + matches.error.message);
  const match = matches.data?.[0];
  if (!match) return { queued: true };
  const photoRow = kind === "photo" ? inserted.data : match;
  const docRow = kind === "document" ? inserted.data : match;
  const photo: TgMessage = { message_id: Number(photoRow.message_id), chat: message.chat, caption: photoRow.caption, photo: [{ file_id: photoRow.file_id, width: 1, height: 1 }] };
  const doc: TgMessage = { message_id: Number(docRow.message_id), chat: message.chat, caption: docRow.caption, document: { file_id: docRow.file_id, file_name: docRow.file_name || undefined, mime_type: docRow.mime_type || undefined, file_size: docRow.file_size || undefined } };
  const result = await processPluginPair(photo, doc);
  await db.from("telegram_plugin_ingest_queue").delete().in("id", [inserted.data.id, match.id]);
  return { processed: true, result };
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
