import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { inflateSync } from "zlib";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lib = join(root, "src/lib");
const target = join(lib, "telegram-plugin-sync.ts");
const single = join(lib, "telegram-plugin-sync.ts.zlib.b64");
const prefix = "telegram-plugin-sync.ts.zlib.b64.";

// Prefer already-patched plain source when present (no placeholder).
if (existsSync(target)) {
  const existing = readFileSync(target, "utf8");
  if (!existing.includes("telegram_plugin_sync_not_inflated") && existing.includes("pluginImageResponse")) {
    console.log("telegram-plugin-sync.ts already present (" + existing.length + " bytes)");
    process.exit(0);
  }
}

let b64 = "";
if (existsSync(single)) {
  b64 = readFileSync(single, "utf8").trim();
  console.log("using single zlib.b64 payload");
} else {
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

const source = inflateSync(Buffer.from(b64, "base64")).toString("utf8");
writeFileSync(target, source);
console.log("inflated telegram-plugin-sync.ts", source.length, "bytes from", b64.length, "b64 chars");
