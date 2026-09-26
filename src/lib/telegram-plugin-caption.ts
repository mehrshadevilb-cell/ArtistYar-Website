/**
 * Telegram plugin caption editor — regenerates Persian captions for published posts
 * and edits the source channel message when the bot has can_edit_messages.
 */
import { createClient } from "@supabase/supabase-js";
import { telegramBytes } from "@/lib/telegram-plugin-media";

const TG = "https://api.telegram.org";

function botToken() {
  const plugin = (process.env.TELEGRAM_PLUGIN_BOT_TOKEN || "").trim();
  if (plugin) return plugin;
  return (process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || "").trim();
}

function channelHandle() {
  const configured = (
    process.env.TELEGRAM_PLUGIN_CHANNEL_ID ||
    process.env.TELEGRAM_PLUGIN_CHANNEL_USERNAME ||
    "@ProAudios"
  ).trim();
  if (configured.startsWith("@") && configured.length > 1) return configured;
  const explicit = (process.env.TELEGRAM_PLUGIN_CHANNEL_USERNAME || "").trim();
  if (explicit) return explicit.startsWith("@") ? explicit : "@" + explicit;
  return "@ProAudios";
}

function clean(v: unknown, max = 500) {
  return String(v ?? "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function esc(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function tg(method: string, body: Record<string, unknown>) {
  const t = botToken();
  if (!t) throw new Error("telegram_bot_token_missing");
  const res = await fetch(TG + "/bot" + t + "/" + method, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => null);
  if (res.ok && data?.ok) return data.result;
  throw new Error(clean(data?.description || "telegram_" + method + "_failed", 240));
}

function titleFromFileName(fileName: string) {
  const raw = String(fileName || "").trim();
  if (!raw) return "";
  let name = raw.replace(/\.(rar|zip|7z|tar|gz|tgz|bz2|xz|dmg|pkg|msi|exe|appimage|vst3?|component|aaxplugin|clap|dll|so|dylib)$/i, "");
  name = name.replace(/[-_.]?(?:Regged|Incl(?:uded)?|Patched|Keygen|Crack|Repack|Unlocked)[-_.].*$/i, "");
  name = name.replace(/[-_.]?(?:R2R|MORiA|Team|Repost|WIN|MAC|LINUX)\b.*$/i, "");
  name = name.replace(/[._+]+/g, " ").replace(/\s+/g, " ").trim();
  name = name.replace(/\b(?:incl|included|patched|keygen|r2r|team|repost|regged|win|mac|linux)\b/gi, " ").replace(/\s+/g, " ").trim();
  name = name.replace(/\s+v?\d+(?:[\.\s_]\d+){1,3}\s*$/i, "").trim();
  return name.slice(0, 160);
}

function titleFromCaption(caption: string) {
  const raw = String(caption || "").trim();
  if (!raw) return "";
  const first = raw.split(/\r?\n/).map((l) => l.trim()).find(Boolean) || "";
  if (!first) return "";
  let name = first
    .split(/(?:Формат|Format|Разрядность|Bit|Системные|System|Табл|Tablet|VST|AU\b|STANDALONE)/i)[0]
    .trim();
  name = name.replace(/\s+v?\d+(?:[\.\s]\d+){1,3}\s*$/i, "").trim();
  name = name.replace(/[|_—–-]{2,}/g, " ").replace(/\s+/g, " ").trim();
  if (name.length < 3 || name.length > 120) return "";
  if (/^(?:v?\d+[\.\d]*)$/i.test(name)) return "";
  return name.slice(0, 160);
}

function makeCaption(p: {
  title: string;
  developer?: string | null;
  version?: string | null;
  category?: string | null;
  formats?: string[] | null;
  platforms?: string[] | null;
  description?: string | null;
}) {
  const handle = channelHandle();
  const footer = "\n\n🎛️ <b>ArtistYar</b> — https://artistyaar.ir\n📢 Channel: " + handle;
  const lines = [
    "🎛️ <b>" + esc(p.title) + "</b>",
    p.developer ? "🏷 <b>Developer:</b> " + esc(String(p.developer)) : "",
    p.version ? "🔢 <b>Version:</b> " + esc(String(p.version)) : "",
    p.category ? "🎚 <b>Category:</b> " + esc(String(p.category)) : "",
    p.formats?.length ? "🔌 <b>Format:</b> " + esc(p.formats.join(" / ")) : "",
    p.platforms?.length ? "💻 <b>Platform:</b> " + esc(p.platforms.join(" / ")) : "",
    p.description ? "\n" + esc(String(p.description).slice(0, 600)) : "",
  ].filter(Boolean);
  const bodyBudget = 1024 - footer.length;
  return lines.join("\n").slice(0, bodyBudget).trimEnd() + footer;
}

async function editCaption(chatId: string | number, messageId: number, caption: string) {
  const body = caption.slice(0, 1024);
  try {
    return await tg("editMessageCaption", {
      chat_id: chatId,
      message_id: messageId,
      caption: body,
      parse_mode: "HTML",
    });
  } catch (error) {
    const message = clean(error instanceof Error ? error.message : String(error), 300);
    if (/message is not modified/i.test(message)) return true;
    if (/can't parse entities|parse entities|unsupported start tag|unexpected end tag/i.test(message)) {
      const plain = body.replace(/<[^>]+>/g, "");
      try {
        return await tg("editMessageCaption", {
          chat_id: chatId,
          message_id: messageId,
          caption: plain.slice(0, 1024),
        });
      } catch (retryError) {
        const retryMessage = clean(retryError instanceof Error ? retryError.message : String(retryError), 300);
        if (/message is not modified/i.test(retryMessage)) return true;
        throw retryError;
      }
    }
    throw error;
  }
}

function getDb() {
  const url = (process.env.SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Rebuild Persian caption for a published post and edit the Telegram message.
 * Does not require AI — uses stored title/metadata + filename/caption fallbacks.
 */
export async function reapplyPluginCaption(postId: string): Promise<{
  ok: boolean;
  title?: string;
  edited?: boolean;
  error?: string;
}> {
  const db = getDb();
  if (!db) return { ok: false, error: "supabase_not_configured" };

  const row = await db
    .from("telegram_plugin_posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();
  if (row.error || !row.data) return { ok: false, error: "post_not_found" };
  const post = row.data;

  let title = String(post.title || "").trim();
  if (!title || title === "پلاگین بدون نام") {
    title =
      titleFromCaption(String(post.raw_caption || "")) ||
      titleFromFileName(String(post.file_name || "")) ||
      title ||
      "پلاگین بدون نام";
  }

  const caption = makeCaption({
    title,
    developer: post.developer,
    version: post.version,
    category: post.category,
    formats: post.formats,
    platforms: post.platforms,
    description: post.description,
  });

  // Prefer editing the photo message (caption lives on media), else document message
  const channelId = String(post.channel_id || "").trim();
  const photoMid = Number(post.photo_message_id || 0);
  const docMid = Number(post.document_message_id || 0);
  const targetMid = photoMid || docMid;
  if (!channelId || !targetMid) {
    return { ok: false, error: "telegram_message_missing", title };
  }

  try {
    await editCaption(channelId, targetMid, caption);
    await db
      .from("telegram_plugin_posts")
      .update({
        title,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId);
    return { ok: true, title, edited: true };
  } catch (error) {
    const message = clean(error instanceof Error ? error.message : String(error), 240);
    await db
      .from("telegram_plugin_posts")
      .update({
        title,
        error_message: "caption_edit_failed:" + message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId);
    return { ok: false, title, edited: false, error: message };
  }
}

/** Re-apply captions for the latest N published plugins. */
export async function reapplyLatestPluginCaptions(limit = 3) {
  const db = getDb();
  if (!db) return { ok: false, error: "supabase_not_configured", results: [] as const };

  const safe = Math.min(Math.max(Number(limit) || 3, 1), 10);
  const rows = await db
    .from("telegram_plugin_posts")
    .select("id,title")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(safe);

  if (rows.error) return { ok: false, error: rows.error.message, results: [] as const };

  const results = [];
  for (const row of rows.data || []) {
    results.push({ id: row.id, ...(await reapplyPluginCaption(String(row.id))) });
  }
  return { ok: results.every((r) => r.ok), results };
}
