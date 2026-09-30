import {
  analyzeTelegramPluginPost,
  applyVerificationToPost,
  buildVerifiedCaption,
  createReviewRequiredPost,
} from "@/lib/telegram-plugin-intelligence";
import type { VerificationResult } from "@/lib/telegram-plugin-intelligence";

/**
 * Telegram -> ArtistYar plugin sync.
 *
 * This module is the canonical runtime for webhook ingestion, queue processing,
 * Telegram media access, metadata generation and publication. Archives are never
 * extracted: filenames/captions are the only archive evidence used.
 */
import { createClient } from "@supabase/supabase-js";
import { resolvePluginBotToken } from "@/lib/telegram-plugin-bot";
import { reapplyPluginCaption, reapplyLatestPluginCaptions } from "@/lib/telegram-plugin-caption";

const TG = "https://api.telegram.org";
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const SUPABASE_KEY = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const db = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

type TgPhoto = { file_id: string; width?: number; height?: number };
export type TgMessage = {
  message_id: number;
  media_group_id?: string;
  chat?: { id: number; username?: string; title?: string; type?: string };
  caption?: string;
  photo?: TgPhoto[];
  document?: { file_id: string; file_name?: string; mime_type?: string; file_size?: number; thumbnail?: TgPhoto };
};

type PluginData = {
  title: string;
  developer: string;
  version: string;
  category: string;
  formats: string[];
  platforms: string[];
  description: string;
  features: string[];
  tags: string[];
  translatedCaption?: string;
};

function botToken() {
  return resolvePluginBotToken();
}

function configuredChannel() {
  return (
    process.env.TELEGRAM_PLUGIN_CHANNEL_ID ||
    process.env.TELEGRAM_PLUGIN_CHANNEL_USERNAME ||
    "@ProAudios"
  ).trim();
}

export function channelHandle() {
  const configured = configuredChannel();
  if (configured.startsWith("@") && configured.length > 1) return configured;
  const explicit = (process.env.TELEGRAM_PLUGIN_CHANNEL_USERNAME || "").trim();
  if (explicit) return explicit.startsWith("@") ? explicit : "@" + explicit;
  return "@ProAudios";
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://artistyaar.ir").replace(/\/$/, "");
}
export { siteUrl };

function clean(v: unknown, max = 500) {
  return String(v ?? "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function channelKey(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/^@/, "");
}

function configuredChannelKey() {
  return channelKey(configuredChannel());
}

function messageBelongsToConfiguredChannel(message: TgMessage) {
  const configured = configuredChannelKey();
  const username = channelKey(message.chat?.username);
  const chatId = String(message.chat?.id ?? "").trim();
  if (!configured) return true;
  if (configured === username) return true;
  if (/^-?\d+$/.test(configured) && configured === chatId) return true;
  return false;
}

async function tg(method: string, body: Record<string, unknown>, timeoutMs = 15000) {
  const token = botToken();
  if (!token) throw new Error("telegram_bot_token_missing");
  let last = "telegram_" + method + "_failed";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(TG + "/bot" + token + "/" + method, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.ok) return data.result;
      last = clean(data?.description || last, 300);
      if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 2) {
        throw new Error(last);
      }
      const retryAfter = Number(data?.parameters?.retry_after || 0);
      await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? Math.min(15000, retryAfter * 1000) : 700 * (attempt + 1)));
    } catch (error) {
      last = clean(error instanceof Error ? error.message : String(error), 300);
      if (attempt === 2 || !/fetch failed|timeout|timed out|aborted|network/i.test(last)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    }
  }
  throw new Error(last);
}

export function pluginTokenConfigured() {
  return Boolean(botToken());
}

export async function setPluginWebhook(urlValue: string, secretToken?: string) {
  const result = await tg("setWebhook", {
    url: urlValue,
    allowed_updates: ["channel_post", "edited_channel_post"],
    ...(secretToken ? { secret_token: secretToken } : {}),
  });
  return result;
}

export async function getPluginWebhookInfo() {
  return tg("getWebhookInfo", {});
}

export async function getPluginChannelAdminStatus() {
  const me = await tg("getMe", {});
  const chatId = configuredChannel();
  try {
    const member = await tg("getChatMember", { chat_id: chatId, user_id: me.id });
    const status = String(member?.status || "");
    const isAdmin = status === "administrator" || status === "creator";
    const canEdit = Boolean(member?.can_edit_messages);
    return {
      bot_id: me.id,
      bot_username: me.username,
      status,
      is_administrator: isAdmin,
      can_edit_messages: canEdit,
      required_permissions_ok: isAdmin && canEdit,
    };
  } catch (error) {
    return {
      bot_id: me.id,
      bot_username: me.username,
      is_administrator: false,
      can_edit_messages: false,
      required_permissions_ok: false,
      error: clean(error instanceof Error ? error.message : String(error), 240),
    };
  }
}

export async function telegramGetFile(fileId: string) {
  const id = String(fileId || "").trim();
  if (!id) throw new Error("file_id_required");
  const file = await tg("getFile", { file_id: id }, 15000);
  if (!file?.file_path) throw new Error("telegram_file_path_missing");
  return { filePath: String(file.file_path), url: TG + "/file/" + botToken() + "/" + String(file.file_path) };
}

function mimeFromPath(path: string, header: string | null) {
  const headerMime = String(header || "").split(";")[0].trim().toLowerCase();
  if (headerMime.startsWith("image/")) return headerMime;
  const ext = path.toLowerCase().split("?")[0].split(".").pop() || "";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "bmp") return "image/bmp";
  return "image/jpeg";
}

async function downloadBytes(urlValue: string) {
  const response = await fetch(urlValue, {
    cache: "no-store",
    redirect: "follow",
    headers: { accept: "image/*,*/*;q=0.8", "accept-encoding": "identity", "user-agent": "ArtistYar-Telegram-Plugin-Sync/1.0" },
    signal: AbortSignal.timeout(30000),
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!response.ok) throw new Error("telegram_file_download_failed_" + response.status);
  if (!bytes.length) throw new Error("telegram_file_download_empty");
  return { bytes, contentType: mimeFromPath(urlValue, response.headers.get("content-type")) };
}

export async function telegramBytes(fileId: string) {
  let last = "telegram_file_download_failed";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const file = await telegramGetFile(fileId);
      const response = await downloadBytes(file.url);
      if (!/^image\//i.test(response.contentType)) throw new Error("telegram_media_not_image");
      return response;
    } catch (error) {
      last = clean(error instanceof Error ? error.message : String(error), 300);
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 900 * (attempt + 1)));
    }
  }
  throw new Error(last);
}

export function pluginImageResponse(fileId: string) {
  return telegramBytes(fileId).then((downloaded) => ({
    body: downloaded.bytes,
    headers: {
      get(name: string) {
        return String(name).toLowerCase() === "content-type" ? downloaded.contentType : null;
      },
    },
  }));
}

function largestPhoto(photo: TgPhoto[] | undefined) {
  if (!Array.isArray(photo) || !photo.length) return null;
  return [...photo].sort((a, b) => (Number(b.width || 0) * Number(b.height || 0)) - (Number(a.width || 0) * Number(a.height || 0)))[0] || null;
}

export async function enqueuePluginMessage(message: TgMessage, options: { refreshExisting?: boolean } = {}) {
  if (!db) throw new Error("supabase_not_configured");
  if (!message?.message_id || !message?.chat?.id) throw new Error("telegram_message_invalid");
  if (!messageBelongsToConfiguredChannel(message)) {
    return { queued: false, ignored: true, reason: "channel_mismatch" };
  }

  const isPhoto = Boolean(largestPhoto(message.photo));
  const isDocument = Boolean(message.document?.file_id);
  if (!isPhoto && !isDocument) return { queued: false, ignored: true, reason: "unsupported_message" };

  const photo = largestPhoto(message.photo);
  const document = message.document;
  const kind = isPhoto ? "photo" : "document";
  const fileId = isPhoto ? String(photo!.file_id) : String(document!.file_id);
  const fileName = document?.file_name || null;
  const mimeType = document?.mime_type || null;
  const fileSize = document?.file_size || null;
  const channelId = String(message.chat.id);
  const username = String(message.chat.username || "").replace(/^@/, "") || null;

  const row: Record<string, unknown> = {
    channel_id: channelId,
    channel_username: username,
    message_id: Number(message.message_id),
    kind,
    file_id: fileId,
    file_name: fileName,
    mime_type: mimeType,
    file_size: fileSize,
    caption: String(message.caption || ""),
    received_at: new Date().toISOString(),
    processing_at: null,
    media_group_id: message.media_group_id || null,
    thumbnail_file_id: document?.thumbnail?.file_id || null,
    next_attempt_at: null,
    last_error: null,
  };

  const inserted = await db
    .from("telegram_plugin_ingest_queue")
    .upsert(row, {
      onConflict: "channel_id,message_id",
      ignoreDuplicates: !options.refreshExisting,
    })
    .select("id,channel_id,message_id,kind,media_group_id")
    .maybeSingle();

  if (inserted.error) {
    // Telegram can redeliver the same media under a new update/message id.
    // The queue intentionally has a unique (channel, kind, file_id) guard,
    // so treat that collision as an idempotent duplicate instead of failing
    // the webhook and causing repeated queue errors.
    const code = String((inserted.error as any)?.code || "");
    if (code === "23505" && !options.refreshExisting) {
      const existing = await db
        .from("telegram_plugin_ingest_queue")
        .select("id,channel_id,message_id,kind,media_group_id")
        .eq("channel_id", channelId)
        .eq("kind", kind)
        .eq("file_id", fileId)
        .maybeSingle();
      if (!existing.error && existing.data) {
        return {
          queued: true,
          duplicate: true,
          id: existing.data.id,
          kind,
          message_id: existing.data.message_id,
        };
      }
    }
    throw new Error("plugin_queue_insert_failed:" + inserted.error.message);
  }
  return {
    queued: true,
    duplicate: !inserted.data && !options.refreshExisting,
    refreshed: Boolean(options.refreshExisting),
    id: inserted.data?.id || null,
    kind,
    message_id: message.message_id,
  };
}

function titleFromFileName(fileName: string) {
  let value = String(fileName || "").trim();
  if (!value) return "";
  value = value.replace(/\.(rar|zip|7z|tar|gz|tgz|bz2|xz|dmg|pkg|msi|exe|appimage|vst3?|component|aaxplugin|clap|dll|so|dylib)$/i, "");
  value = value.replace(/[-_.]?(?:Regged|Incl(?:uded)?|Patched|Keygen|Crack|Repack|Unlocked)[-_.].*$/i, "");
  value = value.replace(/[-_.]?(?:R2R|MORiA|Team|Repost|WIN|MAC|LINUX)\b.*$/i, "");
  value = value.replace(/[._+]+/g, " ").replace(/\s+/g, " ").trim();
  value = value.replace(/\b(?:incl|included|patched|keygen|r2r|team|repost|regged|win|mac|linux)\b/gi, " ").replace(/\s+/g, " ").trim();
  value = value.replace(/\s+v?\d+(?:[.\s_]\d+){1,3}\s*$/i, "").trim();
  return value.slice(0, 160);
}

function titleFromCaption(caption: string) {
  const first = String(caption || "").split(/\r?\n/).map((x) => x.trim()).find(Boolean) || "";
  if (!first) return "";
  let value = first.split(/(?:Format|Формат|Bit|Разрядность|System|Системные|VST|AU\b|STANDALONE)/i)[0].trim();
  value = value.replace(/\s+v?\d+(?:[.\s]\d+){1,3}\s*$/i, "").replace(/[|_—–-]{2,}/g, " ").replace(/\s+/g, " ").trim();
  if (value.length < 3 || value.length > 120 || /^v?\d+[.\d]*$/i.test(value)) return "";
  return value.slice(0, 160);
}

function deterministicMetadata(fileName: string, caption: string): PluginData {
  const title = titleFromFileName(fileName) || titleFromCaption(caption) || "پلاگین جدید";
  const formats = [];
  const lower = String(fileName || "").toLowerCase();
  if (/vst3?/.test(lower)) formats.push("VST");
  if (/component|\bau\b/.test(lower)) formats.push("AU");
  if (/aaxplugin/.test(lower)) formats.push("AAX");
  return {
    title,
    developer: "",
    version: "",
    category: "Audio Plugin",
    formats: Array.from(new Set(formats)),
    platforms: /mac|osx/i.test(lower) ? ["macOS"] : /win/i.test(lower) ? ["Windows"] : [],
    description: String(caption || "").trim().slice(0, 600),
    features: [],
    tags: [],
    translatedCaption: "",
  };
}

function parsePluginJson(raw: string, fallback: PluginData) {
  const text = String(raw || "").trim().replace(/^\`{3}(?:json)?/i, "").replace(/\`{3}$/i, "").trim();
  try {
    const parsed = JSON.parse(text);
    return {
      title: clean(parsed.title || fallback.title, 160) || fallback.title,
      developer: clean(parsed.developer || "", 120),
      version: clean(parsed.version || "", 80),
      category: clean(parsed.category || fallback.category, 80) || fallback.category,
      formats: Array.isArray(parsed.formats) ? parsed.formats.map((x: unknown) => clean(x, 40)).filter(Boolean).slice(0, 8) : fallback.formats,
      platforms: Array.isArray(parsed.platforms) ? parsed.platforms.map((x: unknown) => clean(x, 40)).filter(Boolean).slice(0, 8) : fallback.platforms,
      description: clean(parsed.description || fallback.description, 700),
      features: Array.isArray(parsed.features) ? parsed.features.map((x: unknown) => clean(x, 120)).filter(Boolean).slice(0, 8) : fallback.features,
      tags: Array.isArray(parsed.tags) ? parsed.tags.map((x: unknown) => clean(x, 40)).filter(Boolean).slice(0, 12) : fallback.tags,
      translatedCaption: clean(parsed.translatedCaption || "", 850),
    } as PluginData;
  } catch {
    return fallback;
  }
}

async function aiMetadata(fileName: string, caption: string): Promise<{ data: PluginData; provider: string; model: string }> {
  const fallback = deterministicMetadata(fileName, caption);
  try {
    const { buildRankedCandidates, chatExactProviderModel } = await import("@/lib/ai-providers");
    const candidates = await buildRankedCandidates(12);
    const prompt = [
      "Return ONLY valid JSON.",
      "Analyze this audio plugin release metadata from filename and Telegram caption.",
      "Never claim facts not supported by the input.",
      "Schema: title, developer, version, category, formats[], platforms[], description, features[], tags[], translatedCaption.",
      "translatedCaption must be concise Persian and may be empty.",
      "FILENAME: " + String(fileName || ""),
      "TELEGRAM CAPTION: " + String(caption || ""),
    ].join("\n");
    for (const candidate of candidates) {
      try {
        const result = await chatExactProviderModel(
          [{ role: "system", content: "You are ArtistYar plugin metadata extraction. Output strict JSON only." }, { role: "user", content: prompt }],
          candidate.providerId,
          candidate.modelId,
          "artistyar-plugin-sync",
          AbortSignal.timeout(12000),
        );
        const parsed = parsePluginJson(result.reply, fallback);
        if (parsed.title) return { data: parsed, provider: candidate.providerId, model: candidate.modelId };
      } catch {
        // Provider/model failures fall through to the next configured candidate.
      }
    }
  } catch {
    // AI is enrichment only; deterministic metadata remains publishable.
  }
  return { data: fallback, provider: "fallback", model: "deterministic" };
}

function captionFor(p: PluginData) {
  const handle = channelHandle();
  const footer = "\n\n🎛️ <b>ArtistYar</b> — https://artistyaar.ir\n📢 Channel: " + handle;
  const lines = [
    "🎛️ <b>" + String(p.title || "پلاگین جدید").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</b>",
    "✨ <i>معرفی هوشمند پلاگین توسط ArtistYar</i>",
    p.developer ? "🏷 <b>Developer:</b> " + clean(p.developer, 120) : "",
    p.version ? "🔢 <b>Version:</b> " + clean(p.version, 80) : "",
    p.category ? "🎚 <b>Category:</b> " + clean(p.category, 80) : "",
    p.formats?.length ? "🔌 <b>Format:</b> " + clean(p.formats.join(" / "), 180) : "",
    p.platforms?.length ? "💻 <b>Platform:</b> " + clean(p.platforms.join(" / "), 120) : "",
    p.description ? "\n" + clean(p.description, 600) : "",
  ].filter(Boolean);
  return lines.join("\n").slice(0, Math.max(1, 1024 - footer.length)).trimEnd() + footer;
}

async function editCaption(chatId: string | number, messageId: number, caption: string) {
  const handle = channelHandle().replace(/^@/, "");
  const reply_markup = {
    inline_keyboard: [[
      { text: "🌐 وب‌سایت ArtistYar", url: "https://artistyaar.ir" },
      { text: "📢 کانال پلاگین‌ها", url: "https://t.me/" + handle },
    ]],
  };
  try {
    return await tg("editMessageCaption", { chat_id: chatId, message_id: messageId, caption: caption.slice(0, 1024), parse_mode: "HTML", reply_markup });
  } catch (error) {
    const message = clean(error instanceof Error ? error.message : String(error), 300);
    if (/message is not modified/i.test(message)) return true;
    if (/can't parse entities|parse entities|unsupported start tag|unexpected end tag/i.test(message)) {
      return tg("editMessageCaption", { chat_id: chatId, message_id: messageId, caption: caption.replace(/<[^>]+>/g, "").slice(0, 1024), reply_markup });
    }
    if (/message to edit not found|message not found/i.test(message)) throw new Error("source_message_not_found");
    if (/not enough rights|need administrator|can't be edited|chat not found/i.test(message)) throw new Error("caption_edit_forbidden:" + message);
    throw error;
  }
}

async function findPairRows(limit: number) {
  if (!db) return [];
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const result = await db
    .from("telegram_plugin_ingest_queue")
    .select("id,channel_id,channel_username,message_id,kind,file_id,file_name,mime_type,file_size,caption,received_at,processing_at,media_group_id,thumbnail_file_id,attempt_count,last_error,next_attempt_at")
    .gte("received_at", cutoff)
    .order("received_at", { ascending: false })
    .limit(Math.min(100, Math.max(20, limit * 8)));
  if (result.error) throw new Error("plugin_queue_read_failed:" + result.error.message);
  const rows = result.data || [];
  const docs = rows.filter((r) => r.kind === "document");
  const photos = rows.filter((r) => r.kind === "photo");
  const used = new Set<string>();
  const pairs: Array<{ photo: any; document: any }> = [];

  for (const doc of docs) {
    if (used.has(String(doc.id))) continue;
    if (doc.next_attempt_at && new Date(doc.next_attempt_at).getTime() > Date.now()) continue;
    if (doc.processing_at && Date.now() - new Date(doc.processing_at).getTime() <= 10 * 60 * 1000) continue;
    const candidates = photos
      .filter((photo) => !used.has(String(photo.id)))
      .filter((photo) => photo.channel_id === doc.channel_id)
      .filter((photo) => !photo.next_attempt_at || new Date(photo.next_attempt_at).getTime() <= Date.now())
      .filter((photo) => !photo.processing_at || Date.now() - new Date(photo.processing_at).getTime() > 10 * 60 * 1000)
      .filter((photo) => !doc.media_group_id || !photo.media_group_id || photo.media_group_id === doc.media_group_id)
      .sort((a, b) => Math.abs(new Date(a.received_at).getTime() - new Date(doc.received_at).getTime()) - Math.abs(new Date(b.received_at).getTime() - new Date(doc.received_at).getTime()));
    const photo = candidates.find((p) => Math.abs(new Date(p.received_at).getTime() - new Date(doc.received_at).getTime()) <= 5 * 60 * 1000);
    if (photo) {
      used.add(String(doc.id));
      used.add(String(photo.id));
      pairs.push({ photo, document: doc });
      if (pairs.length >= limit) break;
    }
  }
  return pairs;
}

async function claimPair(photoId: string, documentId: string) {
  if (!db) return false;
  const rpc = await db.rpc("claim_telegram_plugin_pair", { p_photo_id: photoId, p_document_id: documentId });
  if (!rpc.error) return Boolean(rpc.data);
  const now = new Date().toISOString();
  const [a, b] = await Promise.all([
    db.from("telegram_plugin_ingest_queue").update({ processing_at: now }).eq("id", photoId).is("processing_at", null),
    db.from("telegram_plugin_ingest_queue").update({ processing_at: now }).eq("id", documentId).is("processing_at", null),
  ]);
  return !a.error && !b.error;
}

async function recordQueueError(ids: string[], message: string, attemptCount: number) {
  if (!db) return;
  const attempts = Math.max(1, Number(attemptCount || 1));
  const delayMinutes = Math.min(60, Math.pow(2, Math.min(attempts, 6)));
  await db.from("telegram_plugin_ingest_queue").update({
    processing_at: null,
    last_error: message.slice(0, 500),
    next_attempt_at: new Date(Date.now() + delayMinutes * 60 * 1000).toISOString(),
  }).in("id", ids);
}

async function markQueueDone(ids: string[]) {
  if (!db) return;
  await db.from("telegram_plugin_ingest_queue").delete().in("id", ids);
}

async function processPluginPairLegacy(photo: any, document: any, intelligence?: VerificationResult) {
  if (!db) throw new Error("supabase_not_configured");
  const photoFileId = String(photo.file_id || "");
  const documentFileId = String(document.file_id || "");
  if (!photoFileId || !documentFileId) throw new Error("telegram_media_missing");

  // Do not hard-fail publication on an old Telegram file_id. Vision and cover
  // sync treat media resolution as optional enrichment; metadata/caption remain
  // publishable from filename + caption evidence.
  const metadata = intelligence
    ? {
        data: {
          title: intelligence.title,
          developer: intelligence.developer,
          version: intelligence.version,
          category: intelligence.category,
          formats: intelligence.formats,
          platforms: intelligence.platforms,
          description: intelligence.description || intelligence.translatedCaption,
          features: intelligence.features,
          tags: [],
          translatedCaption: intelligence.translatedCaption,
        } as PluginData,
        provider: "intelligence",
        model: "evidence-reconciliation",
      }
    : await aiMetadata(String(document.file_name || ""), String(document.caption || photo.caption || ""));
  const p = metadata.data;
  const title = p.title || titleFromFileName(String(document.file_name || "")) || titleFromCaption(String(document.caption || photo.caption || "")) || "پلاگین جدید";
  const intelligenceCaption = String(intelligence ? buildVerifiedCaption(intelligence) : "").trim();
  const caption = intelligenceCaption || captionFor({ ...p, title });
  if (!caption.trim()) throw new Error("plugin_caption_generation_empty");

  const channelId = String(document.channel_id || photo.channel_id);
  const channelUser = String(photo.channel_username || document.channel_username || "").replace(/^@/, "") || channelHandle().replace(/^@/, "");
  const postMessageId = Number(photo.message_id || document.message_id);
  const postUrl = channelUser ? "https://t.me/" + channelUser + "/" + postMessageId : null;

  const payload = {
    channel_id: channelId,
    photo_message_id: Number(photo.message_id),
    document_message_id: Number(document.message_id),
    telegram_photo_file_id: photoFileId,
    telegram_file_id: documentFileId,
    telegram_file_ids: (Array.isArray(document.relatedDocuments) ? document.relatedDocuments : [document]).map((item: any) => String(item.file_id || "")).filter(Boolean),
    file_names: (Array.isArray(document.relatedDocuments) ? document.relatedDocuments : [document]).map((item: any) => String(item.file_name || "")).filter(Boolean),
    attachment_count: Array.isArray(document.relatedDocuments) ? document.relatedDocuments.length : 1,
    file_name: document.file_name || null,
    mime_type: document.mime_type || null,
    file_size: document.file_size || null,
    title,
    developer: p.developer || null,
    version: p.version || null,
    category: p.category || "other",
    formats: p.formats || [],
    platforms: p.platforms || [],
    description: p.description || "",
    features: p.features || [],
    tags: p.tags || [],
    raw_caption: String(document.caption || photo.caption || ""),
    telegram_post_url: postUrl,
    ai_provider: metadata.provider,
    ai_model: metadata.model,
    status: "published",
    error_message: null,
    final_caption: caption,
    draft_caption: caption,
    processing_state: "PUBLISHED",
    updated_at: new Date().toISOString(),
  };

  let upserted = await db
    .from("telegram_plugin_posts")
    .upsert(payload, { onConflict: "channel_id,document_message_id" })
    .select("id")
    .single();

  // A Telegram file can be redelivered/re-associated with an existing catalog
  // row. The file identity constraint must not strand the queue forever.
  if (upserted.error && String((upserted.error as any)?.code || "") === "23505") {
    const existing = await db
      .from("telegram_plugin_posts")
      .select("id")
      .eq("channel_id", channelId)
      .eq("telegram_file_id", documentFileId)
      .limit(1)
      .maybeSingle();
    if (!existing.error && existing.data?.id) {
      const updated = await db
        .from("telegram_plugin_posts")
        .update(payload)
        .eq("id", existing.data.id)
        .select("id")
        .single();
      if (!updated.error) upserted = updated;
    }
  }

  if (upserted.error) throw new Error("plugin_db_upsert_failed:" + upserted.error.message);
  const postId = String(upserted.data.id);

  // Cover synchronization is independent from caption publication. A stale
  // Telegram file_id must never prevent the Persian caption from reaching the channel.
  let coverError = "";
  try {
    const { syncPublishedPluginCover } = await import("@/lib/telegram-plugin-covers");
    await syncPublishedPluginCover({ postId, photoFileId });
  } catch (error) {
    coverError = clean(error instanceof Error ? error.message : String(error), 300);
    console.warn("telegram_plugin_cover_sync_deferred", { postId, reason: coverError });
  }

  try {
    await editCaption(channelId, Number(photo.message_id), caption);
    await db.from("telegram_plugin_posts").update({
      final_caption: caption,
      draft_caption: caption,
      processing_state: "PUBLISHED",
      error_message: coverError ? "cover_sync_deferred:" + coverError : null,
      updated_at: new Date().toISOString(),
    }).eq("id", postId);
    console.info("telegram_plugin_caption_published", { postId, messageId: Number(photo.message_id), captionLength: caption.length });
  } catch (error) {
    const message = clean(error instanceof Error ? error.message : String(error), 500);
    if (message === "source_message_not_found") {
      await db.from("telegram_plugin_posts").update({
        status: "published",
        final_caption: caption,
        draft_caption: caption,
        processing_state: "PUBLISHED",
        error_message: "source_message_not_found",
        updated_at: new Date().toISOString(),
      }).eq("id", postId);
      console.error("telegram_plugin_caption_publish_failed", { postId, reason: "source_message_not_found" });
      await markQueueDone([String(photo.id), String(document.id)]);
      return { id: postId, title, postUrl, cover_public_url: true, ai_provider: metadata.provider, ai_model: metadata.model, edit_skipped: true, edit_error: message };
    }
    if (message.startsWith("caption_edit_forbidden:")) {
      await db.from("telegram_plugin_posts").update({
        status: "published",
        final_caption: caption,
        draft_caption: caption,
        processing_state: "PUBLISHED",
        error_message: message.slice(0, 500),
        updated_at: new Date().toISOString(),
      }).eq("id", postId);
      console.error("telegram_plugin_caption_publish_failed", { postId, reason: "caption_edit_forbidden" });
      await markQueueDone([String(photo.id), String(document.id)]);
      return { id: postId, title, postUrl, cover_public_url: true, ai_provider: metadata.provider, ai_model: metadata.model, edit_skipped: true, edit_error: message };
    }
    console.error("telegram_plugin_caption_publish_failed", { postId, reason: message });
    throw error;
  }
  await markQueueDone([String(photo.id), ...((Array.isArray(document.relatedDocuments) ? document.relatedDocuments : [document]).map((item: any) => String(item.id || "")).filter(Boolean))]);
  return { id: postId, title, postUrl, cover_public_url: !coverError, cover_error: coverError || null, ai_provider: metadata.provider, ai_model: metadata.model };
}

export async function processPendingPluginPairs(limit = 5) {
  const safe = Math.min(Math.max(Number(limit) || 5, 1), 20);
  if (!db) return { processed: 0, errors: [{ error: "supabase_not_configured" }], pending_checked: 0, results: [] };
  const pairs = await findPairRows(safe);
  const results: any[] = [];
  const errors: any[] = [];
  for (const pair of pairs) {
    const ids = [String(pair.photo.id), String(pair.document.id)];
    const claimed = await claimPair(ids[0], ids[1]);
    if (!claimed) continue;
    try {
      const result = await processPluginPair(pair.photo, pair.document);
      results.push(result);
    } catch (error) {
      const message = clean(error instanceof Error ? error.message : String(error), 500);
      const attempts = Math.max(Number(pair.photo.attempt_count || 1), Number(pair.document.attempt_count || 1));
      await recordQueueError(ids, message, attempts);
      errors.push({ photo_message_id: pair.photo.message_id, document_message_id: pair.document.message_id, error: message });
    }
  }
  const captions = await reapplyLatestPluginCaptions(Math.min(safe, 10));
  return {
    processed: results.length,
    errors,
    pending_checked: pairs.length,
    results,
    caption_reapply: captions,
  };
}

export function getAiRoutingDiagnostics() {
  try {
    const { getConfiguredProviders } = require("@/lib/ai-providers") as typeof import("@/lib/ai-providers");
    return {
      providers: getConfiguredProviders().map((p) => ({
        provider: p.id,
        name: p.name,
        configured: Boolean(p.apiKey),
        models: (p.defaultModels || []).slice(0, 5).map((model) => ({ model })),
      })),
    };
  } catch {
    return { providers: [] };
  }
}

export { reapplyPluginCaption, reapplyLatestPluginCaptions };



/**
 * Refresh an already-published plugin when Telegram sends an edited_channel_post.
 * This path does not depend on the ingest queue because processed queue rows are
 * intentionally deleted after publication.
 */
export async function refreshPublishedPluginPostFromEdit(message: TgMessage) {
  if (!db || !message?.message_id || !message?.chat?.id) {
    return { ok: false, ignored: true, reason: "invalid_message_or_db" };
  }

  const channelId = String(message.chat.id);
  const messageId = Number(message.message_id);
  const photo = largestPhoto(message.photo);
  const photoFileId = String(photo?.file_id || "");
  const caption = String(message.caption || "");

  const lookup = await db
    .from("telegram_plugin_posts")
    .select("id,photo_message_id,document_message_id,telegram_photo_file_id,raw_caption")
    .eq("channel_id", channelId)
    .or(`photo_message_id.eq.${messageId},document_message_id.eq.${messageId}`)
    .limit(1)
    .maybeSingle();

  if (lookup.error) throw new Error("plugin_edit_lookup_failed:" + lookup.error.message);
  if (!lookup.data) return { ok: true, ignored: true, reason: "published_post_not_found" };

  await db.from("telegram_plugin_posts").update({
    raw_caption: caption,
    updated_at: new Date().toISOString(),
  }).eq("id", lookup.data.id);

  const intelligence = await analyzeTelegramPluginPost({
    photoFileId: photoFileId || String(lookup.data.telegram_photo_file_id || ""),
    rawCaption: caption,
    fileName: "",
  });

  const publishable: VerificationResult = {
    ...intelligence,
    ok: true,
    reviewRequired: false,
    category: intelligence.category && intelligence.category !== "Unknown" ? intelligence.category : "Plugin",
    title: intelligence.title || "پلاگین جدید",
    description: intelligence.description || intelligence.translatedCaption || caption.slice(0, 700) || "معرفی محصول صوتی",
    confidence: intelligence.confidence === "low" ? "medium" : intelligence.confidence,
  };

  const applied = await applyVerificationToPost(String(lookup.data.id), publishable);
  if (!applied.ok) throw new Error("plugin_edit_apply_failed:" + String(applied.error || "unknown"));

  return {
    ok: true,
    refreshed: true,
    id: String(lookup.data.id),
    caption: applied.caption || null,
  };
}

/**
 * ARTISTYAR_TELEGRAM_INTELLIGENCE_WRAPPER_V3
 * Publication is never gated by AI verification. The queue row shape uses flat
 * file_id values, so the runtime must pass those exact IDs to vision/cover code.
 */
export async function processPluginPair(photo: any, doc: any) {
  const channelId = String(photo?.channel_id || doc?.channel_id || photo?.chat?.id || doc?.chat?.id || "");
  const photoFileId = String(photo?.file_id || photo?.photo?.[photo.photo.length - 1]?.file_id || "");
  const documentFileId = String(doc?.file_id || doc?.document?.file_id || "");
  const rawCaption = String(photo?.caption || doc?.caption || "");
  const fileName = String(doc?.file_name || doc?.document?.file_name || "");
  const mimeType = String(doc?.mime_type || doc?.document?.mime_type || "");
  const fileSize = Number(doc?.file_size || doc?.document?.file_size || 0) || undefined;
  const photoMessageId = Number(photo?.message_id || 0) || undefined;
  const documentMessageId = Number(doc?.message_id || 0) || undefined;

  if (!photoFileId || !documentFileId) throw new Error("telegram_media_missing");

  if (db && !Array.isArray(doc.relatedDocuments)) {
    try {
      const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const related = await db
        .from("telegram_plugin_ingest_queue")
        .select("id,message_id,channel_id,kind,file_id,file_name,mime_type,file_size,caption,received_at,media_group_id")
        .eq("channel_id", channelId)
        .eq("kind", "document")
        .gte("received_at", since)
        .order("received_at", { ascending: true })
        .limit(30);
      if (!related.error) {
        const primaryCaption = rawCaption.trim().toLowerCase();
        const docs = (related.data || []).filter((item: any) => {
          if (String(item.id) === String(doc.id) || String(item.file_id) === documentFileId) return true;
          const caption = String(item.caption || "").trim().toLowerCase();
          return Boolean(
            (doc.media_group_id && item.media_group_id && doc.media_group_id === item.media_group_id) ||
            (primaryCaption && caption && primaryCaption === caption) ||
            (!primaryCaption && Math.abs(new Date(item.received_at).getTime() - new Date(doc.received_at).getTime()) <= 120000)
          );
        });
        doc.relatedDocuments = docs.length ? docs : [doc];
      }
    } catch (error) {
      console.warn("telegram_plugin_attachment_group_failed", error instanceof Error ? error.message : String(error));
    }
  }

  let intelligence: VerificationResult | null = null;
  try {
    intelligence = await analyzeTelegramPluginPost({ photoFileId, rawCaption, fileName });
  } catch (error) {
    console.warn("telegram_plugin_intelligence_failed_fallback", error instanceof Error ? error.message : String(error));
  }

  const publishable: VerificationResult = {
    ok: true,
    reviewRequired: false,
    title: intelligence?.title || titleFromFileName(fileName) || titleFromCaption(rawCaption) || "پلاگین جدید",
    developer: intelligence?.developer || "",
    version: intelligence?.version || "",
    latestOfficialVersion: intelligence?.latestOfficialVersion || "",
    category: intelligence?.category && intelligence.category !== "Unknown" ? intelligence.category : "Plugin",
    formats: intelligence?.formats || [],
    platforms: intelligence?.platforms || [],
    features: intelligence?.features || [],
    description: intelligence?.description || intelligence?.translatedCaption || rawCaption.slice(0, 700) || "معرفی محصول صوتی",
    installationNotes: intelligence?.installationNotes || "",
    translatedCaption: intelligence?.translatedCaption || "",
    detectedLanguage: intelligence?.detectedLanguage || "Unknown",
    confidence: intelligence?.confidence === "low" ? "medium" : (intelligence?.confidence || "medium"),
    evidence: intelligence?.evidence || [{ source: "caption", status: rawCaption ? "supporting" : "missing" }],
    verificationStatus: intelligence?.verificationStatus || "partial",
    verifiedSourceUrl: intelligence?.verifiedSourceUrl || "",
    verifiedSourceTitle: intelligence?.verifiedSourceTitle || "",
    searchStatus: intelligence?.searchStatus || "unavailable",
    productCount: Array.isArray(doc.relatedDocuments) ? doc.relatedDocuments.length : 1,
    includedProducts: intelligence?.includedProducts || [],
    fileIdentity: intelligence?.fileIdentity || { fileName, consistent: true, detail: "fallback_or_partial" },
  };

  const result = await processPluginPairLegacy(photo, doc, publishable);
  const postId = String(result?.id || "");
  if (postId) {
    const applied = await applyVerificationToPost(postId, publishable);
    if (!applied.ok) console.warn("telegram_plugin_verification_save_failed", { postId, error: applied.error });
  }
  return {
    ...result,
    ok: true,
    review_required: false,
    intelligence: {
      confidence: publishable.confidence,
      verification_status: publishable.verificationStatus,
      verified_source_url: publishable.verifiedSourceUrl,
    },
  };
}


/** Runtime fallback processor — disabled by default.
 * Next.js instrumentation.ts owns the single in-process interval to avoid
 * duplicate timers when this module is also imported. Set
 * ARTISTYAR_TELEGRAM_PROCESSOR_OWNER=sync-module only for exceptional recovery.
 */
let runtimeProcessorStarted = false;

function startRuntimePluginProcessor() {
  if (runtimeProcessorStarted) return;
  if (process.env.ARTISTYAR_TELEGRAM_PROCESSOR_OWNER !== "sync-module") return;
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production" || process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.ARTISTYAR_DISABLE_INLINE_TELEGRAM_PROCESSOR === "1") return;
  runtimeProcessorStarted = true;
  const run = async () => {
    try {
      const result = await processPendingPluginPairs(5);
      if (result.processed || result.errors.length) {
        console.info("telegram_plugin_runtime_processor", {
          processed: result.processed,
          errors: result.errors.length,
          pending_checked: result.pending_checked,
        });
      }
    } catch (error) {
      console.error("telegram_plugin_runtime_processor_failed", error instanceof Error ? error.message : String(error));
    }
  };
  setTimeout(() => void run(), 5000);
  setInterval(() => void run(), 120000);
}

startRuntimePluginProcessor();
