import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { inflateSync } from "zlib";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lib = join(root, "src/lib");
const target = join(lib, "telegram-plugin-sync.ts");
const single = join(lib, "telegram-plugin-sync.ts.zlib.b64");
const prefix = "telegram-plugin-sync.ts.zlib.b64.";

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
  const plugin = (process.env.TELEGRAM_PLUGIN_BOT_TOKEN || "").trim();
  if (plugin) return plugin;
  return (process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || "").trim();
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

source = source.replace(
  /function makeCaption\(p: PluginData\) \{[\s\S]*?\nasync function editCaption/,
  `function makeCaption(p: PluginData) {
  const handle = channelHandle();
  const footer = "\\n\\n🎛️ <b>ArtistYar</b> — https://artistyaar.ir\\n📢 Channel: " + handle;
  let translated = String(p.translatedCaption || "").trim();
  translated = translated
    .replace(/\\n\\n🎛️[\\s\\S]*$/i, "")
    .replace(/https?:\\/\\/artistyaar\\.ir/gi, "")
    .trim();
  translated = translated.replace(/<[^>]+>/g, " ").replace(/[ \\t]{2,}/g, " ").replace(/\\n{3,}/g, "\\n\\n").trim();

  if (translated) {
    const budget = 1024 - footer.length;
    return esc(translated).slice(0, budget).trimEnd() + footer;
  }

  const lines = [
    "🎛️ <b>" + esc(p.title) + "</b>",
    p.developer ? "🏷 <b>Developer:</b> " + esc(p.developer) : "",
    p.version ? "🔢 <b>Version:</b> " + esc(p.version) : "",
    p.category ? "🎚 <b>Category:</b> " + esc(p.category) : "",
    p.formats.length ? "🔌 <b>Format:</b> " + esc(p.formats.join(" / ")) : "",
    p.platforms.length ? "💻 <b>Platform:</b> " + esc(p.platforms.join(" / ")) : "",
    p.description ? "\\n" + esc(p.description) : "",
    p.features.length ? "\\n✨ <b>ویژگی‌ها</b>\\n" + p.features.slice(0, 4).map(x => "• " + esc(x)).join("\\n") : "",
  ].filter(Boolean);

  const bodyBudget = 1024 - footer.length;
  return lines.join("\\n").slice(0, bodyBudget).trimEnd() + footer;
}
async function editCaption`
);

source = source.replace(
  /async function editCaption\(chatId: string \| number, messageId: number, caption: string\) \{[\s\S]*?\n\}/,
  `async function editCaption(chatId: string | number, messageId: number, caption: string) {
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
}`
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

  const finalCaption = makeCaption(p);`
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

writeFileSync(target, source);
console.log(
  "inflated telegram-plugin-sync.ts",
  source.length,
  "bytes; coverSync=",
  source.includes("syncPublishedPluginCover"),
  "; telegramBytesImage=",
  /pluginImageResponse[\s\S]{0,120}telegramBytes/.test(source),
);
