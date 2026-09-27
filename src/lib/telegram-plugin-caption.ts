/**
 * Telegram plugin caption editor — regenerates Persian captions for published posts
 * and edits the source channel message when the bot has can_edit_messages.
 */
import { createClient } from "@supabase/supabase-js";
import { resolvePluginBotToken } from "@/lib/telegram-plugin-bot";

const TG = "https://api.telegram.org";

function botToken() {
  // Same resolution as webhook / getFile / covers — file_ids are bot-specific.
  return resolvePluginBotToken();
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

function hasCyrillic(value: unknown) {
  return /[А-ЯЁЂЃЄЅІЇЈЉЊЋЌЎЏа-яёђѓєѕіїјљњћќўџ]/.test(String(value ?? ""));
}

function categoryEmoji(category: string) {
  const c = String(category || "").toLowerCase();
  if (/daw/.test(c)) return "🎚️";
  if (/sample library/.test(c)) return "🎻";
  if (/preset library/.test(c)) return "🎼";
  if (/bundle/.test(c)) return "📦";
  if (/utility/.test(c)) return "🧰";
  if (/instrument|virtual instrument/.test(c)) return "🎹";
  return "🎛️";
}

function deterministicDescription(input: {
  title?: unknown;
  category?: unknown;
  developer?: unknown;
  description?: unknown;
  features?: unknown;
}) {
  const t = [
    input.title,
    input.category,
    input.developer,
    input.description,
    ...(Array.isArray(input.features) ? input.features : []),
  ].filter(Boolean).join(" ");

  if (/omnisphere/i.test(t) && !/patch|preset|library/i.test(t)) return "Omnisphere یک سینتی‌سایزر نرم‌افزاری قدرتمند برای ساخت و طراحی صداست که در تولید موسیقی و sound design کاربرد دارد.";
  if (/fabfilter pro[- ]?q/i.test(t)) return "FabFilter Pro-Q یک پلاگین EQ برای شکل‌دهی و اصلاح فرکانس‌های صداست که در میکس و مسترینگ استفاده می‌شود.";
  if (/kontakt library|sample library|instrument library|sample pack|sample collection/i.test(t)) return "یک کتابخانه ساز برای Kontakt یا محیط‌های ساز مجازی که مجموعه‌ای از نمونه‌ها و صداهای آماده را برای تولید موسیقی و طراحی صدا ارائه می‌دهد.";
  if (/\bkontakt\b/i.test(t) && !/library/i.test(t)) return "Kontakt یک ساز مجازی و سامپلر حرفه‌ای برای اجرای کتابخانه‌های ساز و نمونه‌های صوتی در تولید موسیقی است.";
  if (/\bozone\b/i.test(t)) return "Ozone مجموعه‌ای از ابزارهای پردازش و مسترینگ صداست که برای کنترل و بهبود نهایی میکس و مسترینگ استفاده می‌شود.";
  if (/ssl e[- ]?channel/i.test(t)) return "SSL E-Channel یک پلاگین پردازش کانال برای EQ، شکل‌دهی تُن و کنترل دینامیک صدا در میکس است.";
  if (/\b(eq|equalizer|pro[- ]?q)\b/i.test(t)) return "یک پلاگین EQ برای شکل‌دهی، اصلاح و کنترل فرکانس‌های صدا که در میکس و مسترینگ استفاده می‌شود.";
  if (/\b(compressor|compression|cla[- ]?76|pro[- ]?c)\b/i.test(t)) return "یک پلاگین کمپرسور برای کنترل داینامیک و شکل‌دهی به شدت صدای ترک‌ها که در میکس و مسترینگ کاربرد دارد.";
  if (/\b(reverb|room|plate reverb|hall)\b/i.test(t)) return "یک پلاگین ریورب برای ایجاد فضا و عمق در صدا که در میکس، طراحی صدا و تولید موسیقی استفاده می‌شود.";
  if (/\b(delay|echo|h[- ]?delay)\b/i.test(t)) return "یک پلاگین Delay برای ایجاد تکرار و عمق زمانی در صدا که در میکس و طراحی صدا کاربرد دارد.";
  if (/\b(synth|synthesizer|serum|massive|diva|pigments|sylenth1|vital)\b/i.test(t)) return "یک سینتی‌سایزر نرم‌افزاری برای ساخت و طراحی صدا که در تولید موسیقی و sound design کاربرد دارد.";
  if (/\b(daw|ableton live|fl studio|cubase|logic pro|studio one|bitwig|reaper|pro tools|reason)\b/i.test(t)) return "یک نرم‌افزار DAW برای ضبط، تنظیم، ویرایش و تولید موسیقی و اجرای پروژه‌های صوتی.";
  if (/\b(preset|presets|patch bank|patch library|soundbank|sound bank)\b/i.test(t)) return "یک مجموعه پریست و صداهای آماده برای استفاده در تولید موسیقی و طراحی صدا.";
  if (/\b(bundle|collection|complete|music production suite)\b/i.test(t)) return "یک مجموعه از چند پلاگین یا ابزار صوتی که امکانات مختلفی برای تولید موسیقی، میکس یا مسترینگ ارائه می‌دهد.";
  if (/\b(tuner|loudness meter|spectrum analyzer|audio analyzer|utility plugin|audio utility)\b/i.test(t)) return "یک ابزار صوتی برای اندازه‌گیری، تحلیل یا مدیریت سیگنال که در تولید، میکس و بررسی صدا کاربرد دارد.";
  if (/audio effect plugin|plugin|vst|audio plugin/i.test(t)) return "یک پلاگین صوتی برای پردازش و شکل‌دهی صدا که در تولید موسیقی، میکس یا مسترینگ استفاده می‌شود.";
  if (/vst instrument|virtual instrument|software instrument/i.test(t)) return "یک ساز مجازی برای اجرای صدا و تولید موسیقی که برای ساخت ملودی، آکورد و بخش‌های مختلف تنظیم استفاده می‌شود.";
  return "";
}

function cleanCaptionText(value: unknown) {
  return String(value ?? "")
    .replace(/Generated by AI|AI generated|Translated by AI|translation status|generation status|fallback status|scraping status|internal confidence|prompt-related|processing\/debug|Source:?|منبع(?: اصلی)?[:：]?|بر اساس منبع|طبق سایت رسمی|ترجمه شده توسط هوش مصنوعی|تولید شده توسط هوش مصنوعی|اطلاعات از منبع اصلی در دسترس نیست/gi, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/می ?شود/g, "می‌شود")
    .replace(/می ?کند/g, "می‌کند")
    .replace(/می ?دهد/g, "می‌دهد")
    .replace(/به صورت/g, "به‌صورت")
    .replace(/به کارگیری/g, "به‌کارگیری")
    .replace(/هم زمان/g, "هم‌زمان")
    .replace(/پیش فرض/g, "پیش‌فرض")
    .trim();
}

function makeCaption(p: {
  title: string;
  developer?: string | null;
  version?: string | null;
  category?: string | null;
  formats?: string[] | null;
  platforms?: string[] | null;
  description?: string | null;
  features?: string[] | null;
}) {
  const footer = "\n\n🎛️ <b>ArtistYar</b>";
  const title = cleanCaptionText(p.title);
  const developer = cleanCaptionText(p.developer);
  const version = cleanCaptionText(p.version);
  const category = cleanCaptionText(p.category);
  const formats = (p.formats || []).map(cleanCaptionText).filter((x) => x && !hasCyrillic(x)).slice(0, 3);
  const platforms = (p.platforms || []).map(cleanCaptionText).filter((x) => x && !hasCyrillic(x)).slice(0, 2);
  let description = cleanCaptionText(p.description);
  if (!description || hasCyrillic(description) || /^(?:مشخصات|اطلاعات|این محصول)/i.test(description)) {
    description = deterministicDescription(p);
  }
  const features = (p.features || []).map(cleanCaptionText).filter((x) => x && !hasCyrillic(x)).slice(0, 5);
  const emoji = categoryEmoji(category);
  const lines = [
    title ? emoji + " <b>" + esc(title) + "</b>" : "",
    developer && !hasCyrillic(developer) ? "🏢 <b>سازنده:</b> " + esc(developer) : "",
    version && !hasCyrillic(version) ? "📦 <b>نسخه:</b> " + esc(version) : "",
    category && !hasCyrillic(category) ? "🏷️ <b>دسته:</b> " + esc(category) : "",
    formats.length ? "🎹 <b>فرمت:</b> " + esc(formats.join(" / ")) : "",
    platforms.length ? "💻 <b>سیستم‌عامل:</b> " + esc(platforms.join(" / ")) : "",
    description && !hasCyrillic(description) ? "\n📝 " + esc(description.slice(0, 420)) : "",
    features.length ? "\n✨ " + features.map((x) => esc(x)).join(" • ") : "",
  ].filter(Boolean);
  const bodyBudget = 1024 - footer.length;
  return lines.join("\n").slice(0, bodyBudget).trimEnd() + footer;
}

async function editCaption(chatId: string | number, messageId: number, caption: string) {
  const body = caption.slice(0, 1024);
  const handle = channelHandle().replace(/^@/, "");
  const replyMarkup = {
    inline_keyboard: [[
      { text: "🎛️ آرتیست‌یار", url: "https://artistyaar.ir" },
      { text: "📢 کانال VST/Plugin", url: "https://t.me/" + handle },
    ]],
  };
  try {
    return await tg("editMessageCaption", {
      chat_id: chatId,
      message_id: messageId,
      caption: body,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
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
          reply_markup: replyMarkup,
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
/**
 * Re-apply a caption through the evidence-first intelligence pipeline.
 * The legacy formatter remains available only as an emergency implementation detail.
 */
export async function reapplyPluginCaption(postId: string): Promise<{
  ok: boolean;
  title?: string;
  edited?: boolean;
  error?: string;
}> {
  try {
    const { verifyStoredPlugin } = await import("@/lib/telegram-plugin-intelligence");
    const result = await verifyStoredPlugin(postId, false);
    const verified = "result" in result ? result.result : null;
    const error = "error" in result ? result.error : undefined;
    if (result.ok && verified?.title) {
      return { ok: true, title: verified.title, edited: true };
    }
    return {
      ok: false,
      title: verified?.title,
      edited: false,
      error: error || verified?.reason || "verification_required",
    };
  } catch (error) {
    return {
      ok: false,
      edited: false,
      error: clean(error instanceof Error ? error.message : String(error), 240),
    };
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


/** Publish an explicitly reviewed caption without re-running product identification. */
export async function publishPluginCaption(postId: string, caption: string): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  if (!db) return { ok: false, error: "supabase_not_configured" };
  const row = await db.from("telegram_plugin_posts")
    .select("id,channel_id,photo_message_id,document_message_id")
    .eq("id", postId)
    .maybeSingle();
  if (row.error || !row.data) return { ok: false, error: "post_not_found" };
  const messageId = Number(row.data.photo_message_id || row.data.document_message_id || 0);
  if (!row.data.channel_id || !messageId) return { ok: false, error: "telegram_message_missing" };
  const cleanCaption = String(caption || "").trim().slice(0, 1024);
  if (!cleanCaption) return { ok: false, error: "caption_empty" };
  try {
    await editCaption(String(row.data.channel_id), messageId, cleanCaption);
    const updated = await db.from("telegram_plugin_posts").update({
      final_caption: cleanCaption,
      draft_caption: "",
      updated_at: new Date().toISOString(),
    }).eq("id", postId);
    if (updated.error) return { ok: false, error: updated.error.message };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: clean(error instanceof Error ? error.message : String(error), 240) };
  }
}
