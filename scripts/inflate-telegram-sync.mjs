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
    current.includes("async function processPluginPair") &&
    current.includes("export async function processPendingPluginPairs") &&
    current.includes("syncPublishedPluginCover") &&
    current.includes("deterministicMetadata") &&
    current.includes("final_caption") &&
    current.includes("caption_edit_forbidden")
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
  '{ text: "🎛️ آرتیست‌یار", url: "https://artistyaar.ir" }'
);
source = source.replace(
  /\{ text: "📢 کانال پلاگین‌ها", url: "https:\/\/t\.me\/" \+ handle\.replace\(\/\^@\/, ""\) \}/g,
  '{ text: "📢 کانال VST/Plugin", url: "https://t.me/" + handle.replace(/^@/, "") }'
);
source = source.replace(
  /\{ text: "📢 کانال پلاگین‌ها", url: "https:\/\/t\.me\/" \+ handle \}/g,
  '{ text: "📢 کانال VST/Plugin", url: "https://t.me/" + handle }'
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
  const verified = (globalThis as any).__ARTISTYAR_VERIFIED_DATA;
  try {
    if (verified?.title) {
      ai = {
        data: {
          title: verified.title,
          developer: verified.developer || "",
          version: verified.version || "",
          category: verified.category || "Unknown",
          formats: Array.isArray(verified.formats) ? verified.formats : [],
          platforms: Array.isArray(verified.platforms) ? verified.platforms : [],
          description: verified.description || "",
          features: Array.isArray(verified.features) ? verified.features : [],
          translatedCaption: verified.translatedCaption || "",
        },
      };
    } else {
      ai = await identify(photoFileId, fileName, caption);
    }
  } catch (aiError) {
    console.error("telegram_plugin_ai_caption_fallback", clean(aiError instanceof Error ? aiError.message : String(aiError), 300));
    ai = {
      data: {
        title: "",
        developer: "",
        version: "",
        category: "Unknown",
        formats: [],
        platforms: [],
        description: "",
        features: [],
        translatedCaption: "",
      },
    };
  }
  let p = enforceCaptionFacts(ai.data, caption);
  if (verified?.title) {
    p = {
      ...p,
      title: verified.title,
      developer: verified.developer || "",
      version: verified.version || "",
      category: verified.category || "Unknown",
      formats: Array.isArray(verified.formats) ? verified.formats : [],
      platforms: Array.isArray(verified.platforms) ? verified.platforms : [],
      description: verified.description || "",
      features: Array.isArray(verified.features) ? verified.features : [],
      translatedCaption: verified.translatedCaption || "",
    };
  } else {
    p = {
      ...p,
      title: p.title && p.title !== "پلاگین بدون نام" ? p.title : "",
      developer: p.developer || "",
      category: p.category || "Unknown",
      description: artistYarClean(p.description || ""),
    };
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
  source = source
    .replace(/function inferDeveloper\(/, "function inferDeveloperLegacy(")
    .replace(/function inferCategory\(/, "function inferCategoryLegacy(")
    .replace(/function buildDeterministicDescription\(/, "function buildDeterministicDescriptionLegacy(")
    .replace(/function makeCaption\(/, "function makeCaptionLegacy(");
  const helper = String.raw`
const ARTISTYAR_CAPTION_QUALITY_V3 = true;

function artistYarEvidence(values: any[], depth = 0): string {
  if (depth > 3) return "";
  const out: string[] = [];
  for (const value of values || []) {
    if (value == null) continue;
    if (typeof value === "object") out.push(Array.isArray(value) ? artistYarEvidence(value, depth + 1) : artistYarEvidence(Object.values(value), depth + 1));
    else out.push(String(value));
  }
  return out.join(" ").trim();
}

function artistYarHasCyrillic(value: unknown): boolean {
  return /[А-ЯЁЂЃЄЅІЇЈЉЊЋЌЎЏа-яёђѓєѕіїјљњћќўџ]/.test(String(value ?? ""));
}

function artistYarClean(value: unknown): string {
  return String(value ?? "")
    .replace(/Generated by AI|AI generated|Translated by AI|translation status|generation status|fallback status|scraping status|internal confidence|prompt-related|processing debug|Source:?|According to source|provider:?|model:?|confidence:?|fallback:?|منبع(?: اصلی)?[:：]?|بر اساس منبع|طبق سایت رسمی|ترجمه شده توسط هوش مصنوعی|تولید شده توسط هوش مصنوعی|اطلاعات از منبع اصلی در دسترس نیست/gi, "")
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

function artistYarCategory(text: string): string {
  const t = String(text || "").toLowerCase();
  if (/ableton live|fl studio|cubase|logic pro|studio one|bitwig studio|reaper|pro tools|reason/.test(t)) return "DAW";
  if (/bundle|collection|complete|music production suite/.test(t)) return "Plugin Bundle";
  if (/preset|presets|patch bank|patch library|soundbank|sound bank|preset bank|patches/.test(t)) return "Preset Library";
  if (/sample library|kontakt library|instrument library|orchestral tools library|spitfire.*library|sample pack|sample collection/.test(t)) return "Sample Library";
  if (/fabfilter pro|pro-q|pro-c|pro-l|ssl e-channel|cla-76|h-delay|ozone|neutron|compressor|equalizer|limiter|delay|reverb|chorus|saturation|distortion|de-esser|gate|multiband/.test(t)) return "Audio Effect Plugin";
  if (/omnisphere|keyscape|trilian|serum|massive|diva|pigments|sylenth1|kontakt|vital|synthesizer|software instrument|virtual instrument/.test(t)) return "VST Instrument";
  if (/tuner|loudness meter|spectrum analyzer|audio analyzer|utility plugin|audio utility/.test(t)) return "Audio Utility";
  return "";
}

function artistYarDeveloper(text: string): string {
  const t = String(text || "");
  if (/omnisphere|keyscape|trilian|spectrasonics/i.test(t)) return "Spectrasonics";
  if (/pro[- ]?q|pro[- ]?c|pro[- ]?l|fabfilter/i.test(t)) return "FabFilter";
  if (/kontakt|native instruments/i.test(t)) return "Native Instruments";
  if (/ozone|neutron|izotope/i.test(t)) return "iZotope";
  if (/ssl e[- ]?channel|cla[- ]?76|h[- ]?delay|waves/i.test(t)) return "Waves";
  if (/massive x?/i.test(t)) return "Native Instruments";
  if (/diva/i.test(t)) return "u-he";
  if (/pigments/i.test(t)) return "Arturia";
  if (/sylenth1/i.test(t)) return "LennarDigital";
  if (/serum/i.test(t)) return "Xfer Records";
  if (/vital/i.test(t)) return "Vital Audio";
  if (/ableton live/i.test(t)) return "Ableton";
  if (/fl studio/i.test(t)) return "Image-Line";
  if (/cubase/i.test(t)) return "Steinberg";
  if (/logic pro/i.test(t)) return "Apple";
  if (/studio one/i.test(t)) return "PreSonus";
  if (/bitwig studio/i.test(t)) return "Bitwig";
  if (/reaper/i.test(t)) return "Cockos";
  if (/pro tools/i.test(t)) return "Avid";
  if (/reason/i.test(t)) return "Reason Studios";
  return "";
}

function artistYarDescription(text: string): string {
  const t = String(text || "");
  if (/omnisphere/i.test(t) && !/patch|preset|library/i.test(t)) return "Omnisphere یک سینتی‌سایزر نرم‌افزاری قدرتمند برای ساخت و طراحی صداست که در تولید موسیقی و sound design کاربرد دارد.";
  if (/fabfilter pro[- ]?q/i.test(t)) return "FabFilter Pro-Q یک پلاگین EQ برای شکل‌دهی و اصلاح فرکانس‌های صداست که در میکس و مسترینگ استفاده می‌شود.";
  if (/kontakt library|sample library|instrument library|spitfire.*library|orchestral tools library/i.test(t)) return "یک کتابخانه ساز برای Kontakt یا محیط‌های ساز مجازی که مجموعه‌ای از نمونه‌ها و صداهای آماده را برای تولید موسیقی و طراحی صدا ارائه می‌دهد.";
  if (/kontakt/i.test(t) && !/library/i.test(t)) return "Kontakt یک ساز مجازی و سامپلر حرفه‌ای برای اجرای کتابخانه‌های ساز و نمونه‌های صوتی در تولید موسیقی است.";
  if (/ozone/i.test(t)) return "Ozone مجموعه‌ای از ابزارهای پردازش و مسترینگ صداست که برای کنترل و بهبود نهایی میکس و مسترینگ استفاده می‌شود.";
  if (/ssl e[- ]?channel/i.test(t)) return "SSL E-Channel یک پلاگین پردازش کانال برای EQ، شکل‌دهی تُن و کنترل دینامیک صدا در میکس است.";
  if (/eq|equalizer|pro[- ]?q/i.test(t)) return "یک پلاگین EQ برای شکل‌دهی، اصلاح و کنترل فرکانس‌های صدا که در میکس و مسترینگ استفاده می‌شود.";
  if (/compressor|compression|cla[- ]?76|pro[- ]?c/i.test(t)) return "یک پلاگین کمپرسور برای کنترل داینامیک و شکل‌دهی به شدت صدای ترک‌ها که در میکس و مسترینگ کاربرد دارد.";
  if (/reverb|room|plate reverb|hall/i.test(t)) return "یک پلاگین ریورب برای ایجاد فضا و عمق در صدا که در میکس، طراحی صدا و تولید موسیقی استفاده می‌شود.";
  if (/delay|echo|h[- ]?delay/i.test(t)) return "یک پلاگین Delay برای ایجاد تکرار و عمق زمانی در صدا که در میکس و طراحی صدا کاربرد دارد.";
  if (/synth|synthesizer|serum|massive|diva|pigments|sylenth1|vital/i.test(t)) return "یک سینتی‌سایزر نرم‌افزاری برای ساخت و طراحی صدا که در تولید موسیقی و sound design کاربرد دارد.";
  if (/daw|ableton live|fl studio|cubase|logic pro|studio one|bitwig|reaper|pro tools|reason/i.test(t)) return "یک نرم‌افزار DAW برای ضبط، تنظیم، ویرایش و تولید موسیقی و اجرای پروژه‌های صوتی.";
  if (/preset|presets|patch bank|patch library|soundbank|sound bank/i.test(t)) return "یک مجموعه پریست و صداهای آماده برای استفاده در تولید موسیقی و طراحی صدا.";
  if (/sample library|kontakt library|instrument library|sample pack|sample collection/i.test(t)) return "یک کتابخانه نمونه شامل سازها و صداهای آماده که برای تولید موسیقی، تنظیم و طراحی صدا استفاده می‌شود.";
  if (/bundle|collection|complete|music production suite/i.test(t)) return "یک مجموعه از چند پلاگین یا ابزار صوتی که امکانات مختلفی برای تولید موسیقی، میکس یا مسترینگ ارائه می‌دهد.";
  if (/tuner|loudness meter|spectrum analyzer|audio analyzer|utility plugin|audio utility/i.test(t)) return "یک ابزار صوتی برای اندازه‌گیری، تحلیل یا مدیریت سیگنال که در تولید، میکس و بررسی صدا کاربرد دارد.";
  if (/audio effect plugin|plugin|vst|audio plugin/i.test(t)) return "یک پلاگین صوتی برای پردازش و شکل‌دهی صدا که در تولید موسیقی، میکس یا مسترینگ استفاده می‌شود.";
  if (/vst instrument|virtual instrument|software instrument/i.test(t)) return "یک ساز مجازی برای اجرای صدا و تولید موسیقی که برای ساخت ملودی، آکورد و بخش‌های مختلف تنظیم استفاده می‌شود.";
  return "";
}

function artistYarEmoji(category: string): string {
  const c = String(category || "").toLowerCase();
  if (/daw/.test(c)) return "🎚️";
  if (/sample library/.test(c)) return "🎻";
  if (/preset library/.test(c)) return "🎼";
  if (/bundle/.test(c)) return "📦";
  if (/utility/.test(c)) return "🧰";
  if (/instrument|virtual instrument/.test(c)) return "🎹";
  return "🎛️";
}

function inferDeveloper(...args: any[]) {
  return artistYarDeveloper(artistYarEvidence(args));
}
function inferCategory(...args: any[]) {
  return artistYarCategory(artistYarEvidence(args)) || "Unknown";
}
function buildDeterministicDescription(...args: any[]): string {
  return artistYarDescription(artistYarEvidence(args));
}
function makeCaption(p: any): string {
  const title = artistYarClean(p?.title || "پلاگین جدید");
  const developer = artistYarClean(p?.developer || "");
  const category = artistYarClean(p?.category || "");
  const version = artistYarClean(p?.version || "");
  const formats = Array.isArray(p?.formats) ? p.formats.map(artistYarClean).filter((x: string) => x && !artistYarHasCyrillic(x)).slice(0, 3) : [];
  const platforms = Array.isArray(p?.platforms) ? p.platforms.map(artistYarClean).filter((x: string) => x && !artistYarHasCyrillic(x)).slice(0, 2) : [];
  const evidence = artistYarEvidence([p?.title, p?.category, p?.developer, p?.description, p?.features, p?.formats]);
  let description = artistYarClean(p?.description || "");
  if (!description || artistYarHasCyrillic(description) || /^(?:مشخصات|اطلاعات|این محصول)/i.test(description)) description = artistYarDescription(evidence);
  const features = Array.isArray(p?.features) ? p.features.map(artistYarClean).filter((x: string) => x && !artistYarHasCyrillic(x)).slice(0, 5) : [];
  const emoji = artistYarEmoji(category);
  const lines = [
    title ? emoji + " " + title : "",
    developer && !artistYarHasCyrillic(developer) ? "🏢 " + developer : "",
    category && !artistYarHasCyrillic(category) ? "🏷️ " + category : "",
    version && !artistYarHasCyrillic(version) ? "📦 نسخه: " + version : "",
    formats.length ? "🎹 فرمت: " + formats.join(" / ") : "",
    platforms.length ? "💻 سیستم‌عامل: " + platforms.join(" / ") : "",
    description && !artistYarHasCyrillic(description) ? "📝 " + description.slice(0, 420) : "",
    features.length ? "✨ " + features.join(" • ") : "",
    "🎛️ آرتیست‌یار",
  ].filter(Boolean);
  return lines.join("\n").slice(0, 1024).trim();
}
`;
  return helper + "\n" + source;
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
