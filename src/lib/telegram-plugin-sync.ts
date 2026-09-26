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
import { getConfiguredProviders } from "@/lib/ai-providers";

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
    allowed_updates: ["channel_post"],
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

export async function enqueuePluginMessage(message: TgMessage) {
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
    .upsert(row, { onConflict: "channel_id,message_id", ignoreDuplicates: true })
    .select("id,channel_id,message_id,kind,media_group_id")
    .maybeSingle();

  if (inserted.error) throw new Error("plugin_queue_insert_failed:" + inserted.error.message);
  return { queued: true, duplicate: !inserted.data, id: inserted.data?.id || null, kind, message_id: message.message_id };
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

function extractVersion(fileName: string, caption: string) {
  const source = String(fileName || "") + " " + String(caption || "");
  const match = source.match(/\bv?(\d+(?:\.\d+){1,4})\b/i);
  return match?.[1] || "";
}

function inferDeveloper(title: string) {
  const known = [
    "BABY Audio","iZotope","Native Instruments","FabFilter","Waves","Arturia","Sonible",
    "Pulsar Modular","Excite Audio","Mastering The Mix","KeySolutions Sounds","Lemur Audio",
    "Soundtoys","Plugin Alliance","Softube","Universal Audio","Slate Digital","Eventide",
    "Valhalla DSP","UAD","MeldaProduction","Output","Spitfire Audio","XLN Audio","Evolution Series",
  ];
  const lower = title.toLowerCase();
  return known.find((name) => lower.startsWith(name.toLowerCase() + " ")) || "";
}

function inferFormats(fileName: string, caption: string) {
  const source = (String(fileName || "") + " " + String(caption || "")).toLowerCase();
  const formats: string[] = [];
  if (/\bvst3?\b|\.vst3?\b/.test(source)) formats.push("VST");
  if (/\bau\b|audio unit|\.component\b/.test(source)) formats.push("AU");
  if (/\baax\b|\.aaxplugin\b/.test(source)) formats.push("AAX");
  if (/\bclap\b|\.clap\b/.test(source)) formats.push("CLAP");
  if (/standalone/.test(source)) formats.push("Standalone");
  return Array.from(new Set(formats));
}

function inferPlatforms(fileName: string, caption: string) {
  const source = String(fileName || "") + " " + String(caption || "");
  const platforms: string[] = [];
  if (/\b(win|windows|pc)\b/i.test(source)) platforms.push("Windows");
  if (/\b(mac|macos|osx|apple)\b/i.test(source)) platforms.push("macOS");
  if (/\blinux\b/i.test(source)) platforms.push("Linux");
  return Array.from(new Set(platforms));
}

function inferCategory(title: string, caption: string) {
  const source = (String(title || "") + " " + String(caption || "")).toLowerCase();
  if (/\b(eq|equalizer|compressor|limiter|saturation|distortion|reverb|delay|chorus|phaser|flanger|gate|de-?esser|filter)\b/.test(source)) return "Effect";
  if (/\b(synth|synthesizer|instrument|piano|keys|drum|sampler)\b/.test(source)) return "Instrument";
  return "Audio Plugin";
}

function deterministicMetadata(fileName: string, caption: string): PluginData {
  const title = titleFromFileName(fileName) || titleFromCaption(caption) || "پلاگین جدید";
  const developer = inferDeveloper(title);
  const version = extractVersion(fileName, caption);
  const formats = inferFormats(fileName, caption);
  const platforms = inferPlatforms(fileName, caption);
  const category = inferCategory(title, caption);
  const evidence = String(caption || "").trim();
  const description = evidence
    ? "مشخصات استخراج‌شده از منبع Telegram: " + evidence.slice(0, 600)
    : [developer, version ? "نسخه " + version : "", formats.length ? "فرمت " + formats.join("، ") : "", platforms.length ? "مناسب برای " + platforms.join(" و ") : ""]
        .filter(Boolean).join(" · ") || "اطلاعات تکمیلی پلاگین از منبع اصلی در دسترس نیست.";
  return {
    title,
    developer,
    version,
    category,
    formats,
    platforms,
    description,
    features: [],
    tags: [developer, title, category].filter(Boolean),
    translatedCaption: description,
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
      description: clean(parsed.description || parsed.translatedCaption || fallback.description, 900),
      features: Array.isArray(parsed.features) ? parsed.features.map((x: unknown) => clean(x, 120)).filter(Boolean).slice(0, 8) : fallback.features,
      tags: Array.isArray(parsed.tags) ? parsed.tags.map((x: unknown) => clean(x, 40)).filter(Boolean).slice(0, 12) : fallback.tags,
      translatedCaption: clean(parsed.translatedCaption || parsed.description || fallback.translatedCaption || "", 900),
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
      "You are extracting accurate product metadata for an audio-plugin catalog.",
      "Use ONLY facts supported by the filename and Telegram caption. Never invent specs.",
      "Write description and translatedCaption in Persian, concise but informative.",
      "Preserve developer/version/formats/platforms when directly present or clearly inferable.",
      "description must explain what the plugin is or does when supported by the source; never mention ArtistYar or smart introduction.",
      "features should contain concrete capabilities stated or clearly supported by the source.",
      "Schema: title, developer, version, category, formats[], platforms[], description, features[], tags[], translatedCaption.",
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
        if (parsed.title && parsed.description.trim()) return { data: parsed, provider: candidate.providerId, model: candidate.modelId };
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
  const footer = "\n\n🎛️ <b>ArtistYar</b> — " + siteUrl() + "\n📢 Channel: " + handle;
  const description = String(p.translatedCaption || p.description || "").trim();
  const lines = [
    "🎛️ <b>" + String(p.title || "پلاگین جدید").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</b>",
    p.developer ? "🏷 <b>سازنده:</b> " + clean(p.developer, 120) : "",
    p.version ? "🔢 <b>نسخه:</b> " + clean(p.version, 80) : "",
    p.category ? "🎚 <b>دسته:</b> " + clean(p.category, 80) : "",
    p.formats?.length ? "🔌 <b>فرمت:</b> " + clean(p.formats.join(" / "), 180) : "",
    p.platforms?.length ? "💻 <b>سیستم‌عامل:</b> " + clean(p.platforms.join(" / "), 120) : "",
    description ? "\n📝 <b>توضیحات:</b>\n" + clean(description, 700) : "",
    p.features?.length ? "\n✨ <b>ویژگی‌ها:</b>\n• " + p.features.map((x) => clean(x, 120)).join("\n• ") : "",
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
    if (/not enough rights|need administrator|can't be edited|chat not found|message not found/i.test(message)) return true;
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

async function processQueuedPair(photo: any, document: any) {
  if (!db) throw new Error("supabase_not_configured");
  const photoFileId = String(photo.file_id || "");
  const documentFileId = String(document.file_id || "");
  if (!photoFileId || !documentFileId) throw new Error("telegram_media_missing");

  // Verify the NEW photo file belongs to the active bot before any publish work.
  await telegramGetFile(photoFileId);

  const metadata = await aiMetadata(String(document.file_name || ""), String(document.caption || photo.caption || ""));
  const p = metadata.data;
  const title = p.title || titleFromFileName(String(document.file_name || "")) || titleFromCaption(String(document.caption || photo.caption || "")) || "پلاگین جدید";
  const caption = captionFor({ ...p, title });
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
    updated_at: new Date().toISOString(),
  };

  const upserted = await db
    .from("telegram_plugin_posts")
    .upsert(payload, { onConflict: "channel_id,document_message_id" })
    .select("id")
    .single();
  if (upserted.error) throw new Error("plugin_db_upsert_failed:" + upserted.error.message);
  const postId = String(upserted.data.id);

  // The real Telegram photo is the only cover source. Storage failures are
  // retried by the queue and never replaced with a channel logo or fake URL.
  try {
    const { syncPublishedPluginCover } = await import("@/lib/telegram-plugin-covers");
    await syncPublishedPluginCover({ postId, photoFileId });
  } catch (error) {
    throw new Error("plugin_cover_sync_failed:" + clean(error instanceof Error ? error.message : String(error), 300));
  }

  await editCaption(channelId, Number(photo.message_id), caption);
  await markQueueDone([String(photo.id), String(document.id)]);
  return { id: postId, title, postUrl, cover_public_url: true, ai_provider: metadata.provider, ai_model: metadata.model };
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
      const result = await processQueuedPair(pair.photo, pair.document);
      results.push(result);
    } catch (error) {
      const message = clean(error instanceof Error ? error.message : String(error), 500);
      const attempts = Math.max(Number(pair.photo.attempt_count || 1), Number(pair.document.attempt_count || 1));
      await recordQueueError(ids, message, attempts);
      errors.push({ photo_message_id: pair.photo.message_id, document_message_id: pair.document.message_id, error: message });
    }
  }
  const captions = await reapplyLatestPluginCaptions(Math.min(safe, 3));
  return {
    processed: results.length,
    errors,
    pending_checked: pairs.length,
    results,
    caption_reapply: captions,
  };
}

export async function processPluginPair(photo: TgMessage | null, document: TgMessage | null) {
  if (!photo || !document) throw new Error("photo_and_document_required");
  return processPluginPairInternal(photo, document);
}

async function processPluginPairInternal(photo: TgMessage, document: TgMessage) {
  if (!db) throw new Error("supabase_not_configured");
  const p = largestPhoto(photo.photo);
  const d = document.document;
  if (!p?.file_id || !d?.file_id) throw new Error("telegram_media_missing");
  const fakePhotoRow = {
    id: "direct-photo",
    file_id: p.file_id,
    message_id: photo.message_id,
    channel_id: String(photo.chat?.id),
    channel_username: photo.chat?.username || "",
    caption: photo.caption || "",
  };
  const fakeDocumentRow = {
    id: "direct-document",
    file_id: d.file_id,
    message_id: document.message_id,
    channel_id: String(document.chat?.id),
    channel_username: document.chat?.username || "",
    caption: document.caption || "",
    file_name: d.file_name || null,
    mime_type: d.mime_type || null,
    file_size: d.file_size || null,
  };
  return processQueuedPair(fakePhotoRow, fakeDocumentRow);
}

export function getAiRoutingDiagnostics() {
  return {
    providers: getConfiguredProviders().map((p) => ({
      provider: p.id,
      name: p.name,
      configured: Boolean(p.apiKey),
      models: (p.defaultModels || []).slice(0, 5).map((model) => ({ model })),
    })),
  };
}

export { reapplyPluginCaption, reapplyLatestPluginCaptions };
