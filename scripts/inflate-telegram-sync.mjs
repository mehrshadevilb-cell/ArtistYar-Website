/**
 * Compatibility shim. Production source is now plain
 * src/lib/telegram-plugin-sync.ts (no zlib payload).
 * If numbered zlib.b64.* chunks still exist, inflate them
 * over the placeholder; otherwise leave the plain source as-is.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { inflateSync } from "zlib";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lib = join(root, "src/lib");
const target = join(lib, "telegram-plugin-sync.ts");
const single = join(lib, "telegram-plugin-sync.ts.zlib.b64");
const prefix = "telegram-plugin-sync.ts.zlib.b64.";

const parts = existsSync(lib)
  ? readdirSync(lib)
      .filter((name) => name.startsWith(prefix) && /^\d+$/.test(name.slice(prefix.length)))
      .sort((a, b) => Number(a.slice(prefix.length)) - Number(b.slice(prefix.length)))
  : [];

if (!existsSync(single) && !parts.length) {
  if (existsSync(target)) {
    const text = readFileSync(target, "utf8");
    if (!text.includes("telegram_plugin_sync_not_inflated")) {
      console.log("telegram-plugin-sync.ts is already plain source (" + text.length + " bytes)");
      process.exit(0);
    }
  }
  console.error("missing telegram-plugin-sync source");
  process.exit(1);
}

let b64 = "";
if (existsSync(single)) {
  b64 = readFileSync(single, "utf8").trim();
} else {
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

writeFileSync(target, source);
console.log("inflated telegram-plugin-sync.ts", source.length, "bytes from", b64.length, "b64 chars");
