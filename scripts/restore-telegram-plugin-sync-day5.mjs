/**
 * Day 5 emergency restore: if telegram-plugin-sync.ts is truncated, expand
 * from scripts/telegram-plugin-sync.restore.zlib.b64.* (zlib+base64 parts).
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "src/lib/telegram-plugin-sync.ts");
const scriptsDir = join(root, "scripts");
const prefix = "telegram-plugin-sync.restore.zlib.b64.";

function looksIntact(src) {
  return (
    src.includes("export async function enqueuePluginMessage") &&
    src.includes("export async function processPendingPluginPairs") &&
    src.includes("syncPublishedPluginCover") &&
    src.length > 20000
  );
}

const current = existsSync(target) ? readFileSync(target, "utf8") : "";
if (looksIntact(current)) {
  console.log("telegram-plugin-sync.ts intact; restore skipped");
  process.exit(0);
}

const parts = readdirSync(scriptsDir)
  .filter((n) => n.startsWith(prefix) && /^\d+$/.test(n.slice(prefix.length)))
  .sort((a, b) => Number(a.slice(prefix.length)) - Number(b.slice(prefix.length)));

if (!parts.length) {
  console.error("missing telegram-plugin-sync restore payload parts");
  process.exit(1);
}

const b64 = parts.map((n) => readFileSync(join(scriptsDir, n), "utf8").trim()).join("");
const source = inflateSync(Buffer.from(b64, "base64")).toString("utf8");
if (!looksIntact(source)) {
  console.error("restored payload failed integrity check");
  process.exit(1);
}
writeFileSync(target, source);
console.log("restored telegram-plugin-sync.ts from Day5 payload", source.length, "parts", parts.length);
