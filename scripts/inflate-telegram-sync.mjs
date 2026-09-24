import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { inflateSync } from "zlib";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lib = join(root, "src/lib");
const target = join(lib, "telegram-plugin-sync.ts");
const single = join(lib, "telegram-plugin-sync.ts.zlib.b64");

let b64 = "";
if (existsSync(single)) {
  b64 = readFileSync(single, "utf8").trim();
} else {
  const prefix = "telegram-plugin-sync.ts.zlib.b64.";
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

// Prefer a dedicated plugin bot token.
source = source.replace(
  /function botToken\(\) \{[\s\S]*?\n\}/,
  `function botToken() {
  const plugin = (process.env.TELEGRAM_PLUGIN_BOT_TOKEN || "").trim();
  if (plugin) return plugin;
  return (process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || "").trim();
}`
);

// ArtistYar branding: remove hardcoded ProAudios defaults/footer.
source = source.replace(
  /return \(process\.env\.TELEGRAM_PLUGIN_CHANNEL_ID \|\| "@ProAudios"\)\.trim\(\);/,
  'return (process.env.TELEGRAM_PLUGIN_CHANNEL_ID || "").trim();'
);
if (!/function channelHandle\(/.test(source)) {
  source = source.replace(
    /function siteUrl\(\) \{/,
    `export function channelHandle() {
  const configured = configuredChannel();
  if (configured.startsWith("@") && configured.length > 1) return configured;
  const explicit = (process.env.TELEGRAM_PLUGIN_CHANNEL_USERNAME || "").trim();
  if (explicit) return explicit.startsWith("@") ? explicit : "@" + explicit;
  return "@ArtistYaar";
}
function siteUrl() {`
  );
}
source = source.replace(/ArtistYar\/ProAudios footer/g, "ArtistYar footer");
source = source.replace(
  /Channel: @ProAudios/g,
  'Channel: " + channelHandle() + "'
);
source = source.replace(
  /return \(value \+ "\\n\\n🎛️ ArtistYar — https:\/\/artistyaar\.ir\\n📢 Channel: " \+ channelHandle\(\) \+ ""\)\.slice\(0, 1000\);/,
  'return (value + "\\n\\n🎛️ ArtistYar — https://artistyaar.ir\\n📢 Channel: " + channelHandle()).slice(0, 1000);'
);
source = source.replace(
  /const footer = "\\n\\n🎛️ <b>ArtistYar<\/b> — https:\/\/artistyaar\.ir\\n📢 Channel: " \+ channelHandle\(\) \+ "";/,
  'const handle = channelHandle();\n  const footer = "\\n\\n🎛️ <b>ArtistYar</b> — https://artistyaar.ir\\n📢 Channel: " + handle;'
);
source = source.replace(
  /\.replace\(\/\\n\\n🎛️ ArtistYar — https:\\\/\\\/artistyaar\\\.ir\\n📢 Channel: @ProAudios\$\/i, ""\)/,
  '.replace(/\\n\\n🎛️ ArtistYar — https:\\/\\/artistyaar\\.ir\\n📢 Channel: @[A-Za-z0-9_]+$/i, "")'
);
if (!/channel_not_configured/.test(source)) {
  source = source.replace(
    /const resolved = await resolveConfiguredChannel\(\);\n  if \(!isChannelAllowed\(message, resolved\)\) \{\n    return \{ ignored: true, reason: "channel_not_allowed" \};\n  \}/,
    `if (!configuredChannel()) {
    return { ignored: true, reason: "channel_not_configured" };
  }

  const resolved = await resolveConfiguredChannel();
  if (!isChannelAllowed(message, resolved)) {
    return { ignored: true, reason: "channel_not_allowed" };
  }`
  );
}

writeFileSync(target, source);
console.log("inflated telegram-plugin-sync.ts", source.length, "bytes; ProAudios leftovers:", (source.match(/ProAudios/g) || []).length);
