import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { inflateSync } from "zlib";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lib = join(root, "src/lib");
const target = join(lib, "telegram-plugin-sync.ts");
const single = join(lib, "telegram-plugin-sync.ts.zlib.b64");
const prefix = "telegram-plugin-sync.ts.zlib.b64.";

// The checked-in TypeScript source is now the canonical runtime. Preserve a
// repaired source when it already contains the complete queue/processor surface;
// the compressed artifact remains a recovery fallback for genuinely missing or
// placeholder source files. This guarantees future inflation cannot silently
// resurrect the old stub.
if (existsSync(target)) {
  const current = readFileSync(target, "utf8");
  if (
    current.includes("export async function enqueuePluginMessage") &&
    current.includes("async function processQueuedPair") &&
    current.includes("syncPublishedPluginCover") &&
    current.includes("deterministicMetadata") &&
    current.includes("ARTISTYAR_CAPTION_QUALITY_V2")
  ) {
    console.log("telegram-plugin-sync.ts already contains canonical production runtime + caption quality; inflation skipped");
    process.exit(0);
  }
}

let b64 = "";
if (existsSync(single)) {
  const candidate = readFileSync(single, "utf8").trim();
  if (candidate.length > 1000) {
    b64 = candidate;
    console.log("using single zlib.b64 payload");
  }
}
if (!b64) {
  const parts = readdirSync(lib)
    .filter((name) => name.startsWith(prefix) && /^\d+$/.test(name.slice(prefix.length)))
    .sort((a, b) => Number(a.slice(prefix.length)) - Number(b.slice(prefix.length)));
  if (!parts.length) {
    console.error("missing telegram-plugin-sync compressed payload");
    process.exit(1);
  }
  console.log("joining parts", parts.join(","));
  b64 = parts.map((name) => readFileSync(join(lib, name), "utf8")).join("").trim();
}

let source = inflateSync(Buffer.from(b64, "base64")).toString("utf8");

source = source.replace(
  /function botToken\(\) \{[\s\S]*?\n\}/,
  `function botToken() {
  // Must match src/lib/telegram-plugin-bot.ts resolvePluginBotToken()
  const plugin = (process.env.TELEGRAM_PLUGIN_BOT_TOKEN || "").trim();
  if (plugin) return plugin;
  const legacy = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  if (legacy) return legacy;
  const token = (process.env.TELEGRAM_TOKEN || "").trim();
  if (token) return token;
  return (process.env.BOT_TOKEN || "").trim();
}`
);

source = source.replace(
  /return \(process\.env\.TELEGRAM_PLUGIN_CHANNEL_ID \|\| "@ProAudios"\)\.trim\(\);/,
  'return (process.env.TELEGRAM_PLUGIN_CHANNEL_ID || process.env.TELEGRAM_PLUGIN_CHANNEL_USERNAME || "@ProAudios").trim();'
);
source = source.replace(
  /return \(process\.env\.TELEGRAM_PLUGIN_CHANNEL_ID \|\| ""\)\.trim\(\);/,
  'return (process.env.TELEGRAM_PLUGIN_CHANNEL_ID || process.env.TELEGRAM_PLUGIN_CHANNEL_USERNAME || "@ProAudios").trim();'
);

if (!/function channelHandle\(/.test(source)) {
  source = source.replace(
    /function siteUrl\(\) \{/,
    `export function channelHandle() {
  const configured = configuredChannel();
  if (configured.startsWith("@") && configured.length > 1) return configured;
  const explicit = (process.env.TELEGRAM_PLUGIN_CHANNEL_USERNAME || "").trim();
  if (explicit) return explicit.startsWith("@") ? explicit : "@" + explicit;
  return "@ProAudios";
}
function siteUrl() {`
  );
}

// Preserve captionFor / editCaption from the compressed payload when present.
// Only normalize button labels if an older recovery payload still carries legacy text.
source = source.replace(
  /\{ text: "🌐 وب‌سایت ArtistYar", url: "https:\/\/artistyaar\.ir" \}/g,
  '{ text: "آرتیست‌یار", url: "https://artistyaar.ir" }'
);
source = source.replace(
  /\{ text: "📢 کانال پلاگین‌ها", url: "https:\/\/t\.me\/" \+ handle\.replace\(\/\^@\/, ""\) \}/g,
  '{ text: "کانال VST/Plugin", url: "https://t.me/" + handle.replace(/^@/, "") }'
);
source = source.replace(
  /\{ text: "📢 کانال پلاگین‌ها", url: "https:\/\/t\.me\/" \+ handle \}/g,
  '{ text: "کانال VST/Plugin", url: "https://t.me/" + handle }'
);

source = source.replace(
  /const channelUser = \(photo\.chat\?\.username \|\| configuredChannel\(\)\.replace\(\/\^@\/, ""\) \|\| ""\)\.replace\(\/\^@\/, ""\);\n  const postUrl = channelUser \? "https:\/\/t\.me\/" \+ channelUser \+ "\/" \+ photo\.message_id : null;/,
  `const channelUser = (photo.chat?.username || doc.chat?.username || configuredChannel().replace(/^@/, "") || "").replace(/^@/, "");
  const linkMessageId = doc.message_id || photo.message_id;
  const postUrl = channelUser ? "https://t.me/" + channelUser + "/" + linkMessageId : null;`
);

if (!source.includes("syncPublishedPluginCover")) {
  source = source.replace(
    /if \(result\.error\) throw new Error\("plugin_db_insert_failed:" \+ result\.error\.message\);\n  const finalCaption = makeCaption\(p\);/,
    `if (result.error) throw new Error("plugin_db_insert_failed:" + result.error.message);

  // Covers for latest-3 only. Plugin binaries remain exclusively on Telegram.
  try {
    const { syncPublishedPluginCover } = await import("@/lib/telegram-plugin-covers");
    await syncPublishedPluginCover({
      postId: String(result.data?.id || ""),
      photoFileId: photoFileId,
    });
  } catch (coverError) {
    console.error(
      "plugin_cover_sync_failed",
      clean(coverError instanceof Error ? coverError.message : String(coverError), 400),
    );
  }

  const finalCaption = makeCaption(p);
  if (!String(finalCaption || "").trim()) {
    throw new Error("plugin_caption_generation_empty");
  }`
  );
}

if (!source.includes("caption_edit_forbidden")) {
  source = source.replace(
    /if \(\/message to edit not found\|message not found\/i\.test\(message\)\) \{[\s\S]*?return \{ id: result\.data\?\.id, title: p\.title, edit_skipped: true \};\n    \}\n    throw error;/,
    `if (/message to edit not found|message not found/i.test(message)) {
      await db.from("telegram_plugin_posts").update({
        status: "published",
        error_message: "source_message_not_found",
        updated_at: new Date().toISOString(),
      }).eq("id", result.data?.id);
      return { id: result.data?.id, title: p.title, edit_skipped: true };
    }
    if (/not enough rights|chat not found|need administrator|can't be edited|message can't be edited/i.test(message)) {
      await db.from("telegram_plugin_posts").update({
        status: "published",
        error_message: "caption_edit_forbidden:" + message.slice(0, 160),
        updated_at: new Date().toISOString(),
      }).eq("id", result.data?.id);
      console.error("telegram_plugin_caption_edit_forbidden", message);
      return { id: result.data?.id, title: p.title, edit_skipped: true, edit_error: message };
    }
    throw error;`
  );
}

source = source.replace(
  /export async function pluginImageResponse\(fileId: string\) \{[\s\S]*?\n\}/,
  `export async function pluginImageResponse(fileId: string) {
  const downloaded = await telegramBytes(fileId);
  return {
    body: downloaded.bytes,
    headers: {
      get(name: string) {
        if (String(name).toLowerCase() === "content-type") return downloaded.contentType || "image/jpeg";
        return null;
      },
    },
  };
}`
);

source = source.replace(
  /return \(value \+ "\\n\\n🎛️ ArtistYar — https:\/\/artistyaar\.ir\\n📢 Channel: @ProAudios"\)\.slice\(0, 1000\);/,
  'return (value + "\\n\\n🎛️ ArtistYar — https://artistyaar.ir\\n📢 Channel: " + channelHandle()).slice(0, 1000);'
);

if (!source.includes("function titleFromFileName")) {
  source = source.replace(
    /function enforceCaptionFacts\(data: PluginData, rawCaption: string\): PluginData \{/,
    `function titleFromFileName(fileName: string) {
  const raw = String(fileName || "").trim();
  if (!raw) return "";
  let name = raw.replace(/\\.(rar|zip|7z|tar|gz|tgz|bz2|xz|dmg|pkg|msi|exe|appimage|vst3?|component|aaxplugin|clap|dll|so|dylib)$/i, "");
  name = name.replace(/[._+]+/g, " ").replace(/\\s+/g, " ").trim();
  name = name.replace(/\\b(?:incl|patched|keygen|r2r|team|repost)\\b/gi, " ").replace(/\\s+/g, " ").trim();
  return name.slice(0, 160);
}
function enforceCaptionFacts(data: PluginData, rawCaption: string): PluginData {`
  );
}

source = source.replace(
  /const ai = await identify\(photoFileId, fileName, caption\);\n  const p = enforceCaptionFacts\(ai\.data, caption\);/,
  `let ai;
  try {
    ai = await identify(photoFileId, fileName, caption);
  } catch (aiError) {
    console.error("telegram_plugin_ai_caption_fallback", clean(aiError instanceof Error ? aiError.message : String(aiError), 300));
    ai = {
      data: {
        title: titleFromFileName(fileName) || titleFromCaption(caption) || "پلاگین جدید",
        developer: "",
        version: "",
        category: "Audio Plugin",
        formats: [],
        platforms: [],
        description: caption ? String(caption).slice(0, 600) : "",
        features: [],
        translatedCaption: "",
      },
    };
  }
  let p = enforceCaptionFacts(ai.data, caption);
  if (!p.title || p.title === "پلاگین بدون نام") {
    const fromFile = titleFromFileName(fileName);
    if (fromFile) p = { ...p, title: fromFile };
  }
`
);

source = source.replace(
  /if \(\/message to edit not found\|message not found\/i\.test\(message\)\) \{\n      await db\.from\("telegram_plugin_posts"\)\.update\(\{\n        status: "published",\n        error_message: "source_message_not_found",/,
  `if (/message to edit not found|message not found/i.test(message)) {
      await db.from("telegram_plugin_posts").update({
        status: "hidden",
        error_message: "source_message_not_found_hidden",`
);


function applyArtistYarCaptionQuality(source) {
  if (source.includes("ARTISTYAR_CAPTION_QUALITY_V2")) return source;

  source = source
    .replace(/function inferDeveloper\(/, "function inferDeveloperLegacy(")
    .replace(/function inferCategory\(/, "function inferCategoryLegacy(")
    .replace(/function buildDeterministicDescription\(/, "function buildDeterministicDescriptionLegacy(")
    .replace(/function makeCaption\(/, "function makeCaptionLegacy(");

  const helper = String.raw\`
const ARTISTYAR_CAPTION_QUALITY_V2 = true;

function artistYarEvidence(values, depth = 0) {
  if (depth > 3) return "";
  const out = [];
  for (const value of values || []) {
    if (value == null) continue;
    if (typeof value === "object") out.push(Array.isArray(value) ? artistYarEvidence(value, depth + 1) : artistYarEvidence(Object.values(value), depth + 1));
    else out.push(String(value));
  }
  return out.join(" ").replace(/\\\\s+/g, " ").trim();
}

function artistYarDeveloper(text) {
  const t = String(text || "");
  if (/\\\\bomnisphere\\\\b|\\\\bkeyscape\\\\b|\\\\btrilian\\\\b|spectrasonics/i.test(t)) return "Spectrasonics";
  if (/\\\\bpro[- ]?q(?:[ -]?3)?\\\\b|\\\\bpro[- ]?c(?:[ -]?2)?\\\\b|\\\\bpro[- ]?l(?:[ -]?2)?\\\\b|fabfilter/i.test(t)) return "FabFilter";
  if (/\\\\bkontakt\\\\b|native instruments/i.test(t)) return "Native Instruments";
  if (/\\\\bozone\\\\b|\\\\bneutron\\\\b|izotope/i.test(t)) return "iZotope";
  if (/\\\\bssl e[- ]?channel\\\\b|\\\\bcla[- ]?76\\\\b|\\\\bh[- ]?delay\\\\b|waves/i.test(t)) return "Waves";
  if (/\\\\bmassive x?\\\\b/i.test(t)) return "Native Instruments";
  if (/\\\\bdiva\\\\b/i.test(t)) return "u-he";
  if (/\\\\bpigments\\\\b/i.test(t)) return "Arturia";
  if (/\\\\bsylenth1\\\\b/i.test(t)) return "LennarDigital";
  if (/\\\\bserum\\\\b/i.test(t)) return "Xfer Records";
  if (/\\\\bvital\\\\b/i.test(t)) return "Vital Audio";
  if (/\\\\bableton live\\\\b/i.test(t)) return "Ableton";
  if (/\\\\bfl studio\\\\b/i.test(t)) return "Image-Line";
  if (/\\\\bcubase\\\\b/i.test(t)) return "Steinberg";
  if (/\\\\blogic pro(?: x)?\\\\b/i.test(t)) return "Apple";
  if (/\\\\bstudio one\\\\b/i.test(t)) return "PreSonus";
  if (/\\\\bbitwig studio\\\\b/i.test(t)) return "Bitwig";
  if (/\\\\breaper\\\\b/i.test(t)) return "Cockos";
  if (/\\\\bpro tools\\\\b/i.test(t)) return "Avid";
  if (/\\\\breason\\\\b/i.test(t)) return "Reason Studios";
  return "";
}

function artistYarCategory(text) {
  const t = String(text || "");
  if (/\\\\b(?:ableton live|fl studio|cubase|logic pro(?: x)?|studio one|bitwig studio|reaper|pro tools|reason)\\\\b/i.test(t)) return "DAW";
  if (/\\\\b(?:bundle|collection|complete|music production suite)\\\\b/i.test(t)) return "Plugin Bundle";
  if (/\\\\b(?:preset|presets|patch bank|patch library|soundbank|sound bank|preset bank|patches)\\\\b/i.test(t)) return "Preset Library";
  if (/\\\\b(?:sample library|kontakt library|instrument library|orchestral tools library|spitfire(?: audio)? library|sample pack|sample collection)\\\\b/i.test(t)) return "Sample Library";
  if (/\\\\b(?:fabfilter pro[- ]?[qclm]|pro[- ]?q|pro[- ]?c|pro[- ]?l|ssl e[- ]?channel|cla[- ]?76|h[- ]?delay|ozone|neutron|compressor|equalizer|limiter|delay|reverb|chorus|saturation|distortion|de-esser|gate|multiband)\\\\b/i.test(t)) return "Audio Effect Plugin";
  if (/\\\\b(?:omnisphere|keyscape|trilian|serum|massive(?: x)?|diva|pigments|sylenth1|kontakt|vital|synthesizer|software instrument|virtual instrument)\\\\b/i.test(t)) return "VST Instrument";
  if (/\\\\b(?:tuner|loudness meter|spectrum analyzer|audio analyzer|utility plugin|audio utility)\\\\b/i.test(t)) return "Audio Utility";
  return "";
}

function artistYarClean(value) {
  return String(value ?? "")
    .replace(/Generated by AI|AI generated|Translated by AI|translation status|generation status|fallback status|scraping status|internal confidence|prompt-related|processing\\\\/debug|\\\\bSource:?|\\\\bمنبع(?: اصلی)?[:：]?|\\\\bبر اساس منبع\\\\b|\\\\bطبق سایت رسمی\\\\b|ترجمه شده توسط هوش مصنوعی|تولید شده توسط هوش مصنوعی|اطلاعات از منبع اصلی در دسترس نیست/gi, "")
    .replace(/\\\\r/g, "")
    .replace(/[ \\\\t]+/g, " ")
    .replace(/\\\\n{3,}/g, "\\\\n\\\\n")
    .replace(/می ?شود/g, "می‌شود")
    .replace(/می ?کند/g, "می‌کند")
    .replace(/می ?دهد/g, "می‌دهد")
    .replace(/به صورت/g, "به‌صورت")
    .replace(/به کارگیری/g, "به‌کارگیری")
    .replace(/هم زمان/g, "هم‌زمان")
    .replace(/پیش فرض/g, "پیش‌فرض")
    .trim();
}

function artistYarDescription(text) {
  const t = String(text || "");
  if (/\\\\bomnisphere\\\\b/i.test(t) && !/patch|preset|library/i.test(t)) return "Omnisphere از محصولات Spectrasonics و یک ساز مجازی قدرتمند برای ساخت صدا، طراحی صدا و تولید موسیقی است و مجموعه گسترده‌ای از صداها و قابلیت‌های سینتی‌سایزر را در اختیار کاربر قرار می‌دهد.";
  if (/fabfilter pro[- ]?q/i.test(t)) return "FabFilter Pro-Q یک پلاگین اکولایزر دقیق برای شکل‌دهی به صدا و کنترل محدوده‌های فرکانسی است و در میکس و مسترینگ کاربرد دارد.";
  if (/kontakt library|sample library|instrument library|spitfire(?: audio)? library|orchestral tools library/i.test(t)) return "این کتابخانه برای Kontakt یا محیط‌های ساز مجازی طراحی شده و مجموعه‌ای از سازها و نمونه‌های صوتی را برای تولید موسیقی و طراحی صدا در اختیار کاربر قرار می‌دهد.";
  if (/\\\\bkontakt\\\\b/i.test(t) && !/library/i.test(t)) return "Kontakt از محصولات Native Instruments و یک ساز مجازی/سامپلر حرفه‌ای است که برای اجرای کتابخانه‌های ساز و نمونه‌های صوتی در تولید موسیقی استفاده می‌شود.";
  if (/\\\\bozone\\\\b/i.test(t)) return "Ozone از محصولات iZotope و مجموعه‌ای از ابزارهای پردازش و مسترینگ صداست که برای کنترل و بهبود نهایی میکس و مسترینگ استفاده می‌شود.";
  if (/ssl e[- ]?channel/i.test(t)) return "SSL E-Channel از Waves یک پلاگین پردازش کانال است که برای شکل‌دهی به تُن، اکولایز و کنترل دینامیک صدا در میکس استفاده می‌شود.";
  return "";
}

function inferDeveloper(...args) {
  const e = artistYarEvidence(args);
  return artistYarDeveloper(e) || (typeof inferDeveloperLegacy === "function" ? inferDeveloperLegacy(...args) : "");
}
function inferCategory(...args) {
  const e = artistYarEvidence(args);
  return artistYarCategory(e) || (typeof inferCategoryLegacy === "function" ? inferCategoryLegacy(...args) : "Audio Plugin");
}
function buildDeterministicDescription(...args) {
  const e = artistYarEvidence(args);
  return artistYarDescription(e) || artistYarClean(typeof buildDeterministicDescriptionLegacy === "function" ? buildDeterministicDescriptionLegacy(...args) : "");
}
function makeCaption(p) {
  const title = artistYarClean(p?.title || "پلاگین جدید");
  const developer = artistYarClean(p?.developer || "");
  const category = artistYarClean(p?.category || "");
  const version = artistYarClean(p?.version || "");
  const formats = Array.isArray(p?.formats) ? p.formats.map(artistYarClean).filter(Boolean).slice(0, 3) : [];
  const platforms = Array.isArray(p?.platforms) ? p.platforms.map(artistYarClean).filter(Boolean).slice(0, 2) : [];
  const description = artistYarClean(p?.description || "").slice(0, 650);
  const features = Array.isArray(p?.features) ? p.features.map(artistYarClean).filter(Boolean).slice(0, 5) : [];
  return [
    title ? "🎛️ " + title : "",
    developer ? "🏢 " + developer : "",
    category ? "🏷️ " + category : "",
    version ? "📦 نسخه: " + version : "",
    formats.length ? "🎹 فرمت: " + formats.join(" / ") : "",
    platforms.length ? "💻 سیستم‌عامل: " + platforms.join(" / ") : "",
    description ? "📝 " + description : "",
    features.length ? "✨ " + features.join(" • ") : "",
    "🎛️ ArtistYar",
  ].filter(Boolean).join("\\\\n").slice(0, 1024).trim();
}
\`;

  return helper + "\\\\n" + source;
}

source = applyArtistYarCaptionQuality(source);

writeFileSync(target, source);
console.log(
  "inflated telegram-plugin-sync.ts",
  source.length,
  "bytes; coverSync=",
  source.includes("syncPublishedPluginCover"),
  "; telegramBytesImage=",
  /pluginImageResponse[\s\S]{0,120}telegramBytes/.test(source),
);
