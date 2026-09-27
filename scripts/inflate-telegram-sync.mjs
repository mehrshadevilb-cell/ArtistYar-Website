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
    current.includes("deterministicMetadata")
  ) {
    console.log("telegram-plugin-sync.ts already contains canonical production runtime; inflation skipped");
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

writeFileSync(target, source);
console.log(
  "inflated telegram-plugin-sync.ts",
  source.length,
  "bytes; coverSync=",
  source.includes("syncPublishedPluginCover"),
  "; telegramBytesImage=",
  /pluginImageResponse[\s\S]{0,120}telegramBytes/.test(source),
);
