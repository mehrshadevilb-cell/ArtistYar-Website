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

// Prefer a dedicated plugin bot token. Falling back to BOT_TOKEN shares a
// token with RahYar long-polling and causes TelegramConflictError
// (webhook vs getUpdates cannot coexist on one bot).
source = source.replace(
  /function botToken\(\) \{[\s\S]*?\n\}/,
  `function botToken() {
  const plugin = (process.env.TELEGRAM_PLUGIN_BOT_TOKEN || "").trim();
  if (plugin) return plugin;
  return (process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || "").trim();
}`
);

writeFileSync(target, source);
console.log("inflated telegram-plugin-sync.ts", source.length, "bytes from", b64.length, "b64 chars");
