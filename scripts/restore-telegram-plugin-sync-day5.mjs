/**
 * Day 5 emergency restore: rebuild telegram-plugin-sync.ts from zlib.b64 parts.
 * Safe no-op if the target already looks complete.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "src/lib/telegram-plugin-sync.ts");
const prefix = "telegram-plugin-sync.day5.zlib.b64.";
const partsDir = join(root, "scripts");

function looksComplete(src) {
  return (
    src.includes("export async function enqueuePluginMessage") &&
    src.includes("export async function processPendingPluginPairs") &&
    src.includes("processPluginPair") &&
    src.length > 20000
  );
}

if (existsSync(target)) {
  const current = readFileSync(target, "utf8");
  if (looksComplete(current)) {
    console.log("telegram-plugin-sync.ts already complete; skip day5 restore");
    process.exit(0);
  }
}

const parts = readdirSync(partsDir)
  .filter((n) => n.startsWith(prefix) && /^\d+$/.test(n.slice(prefix.length)))
  .sort((a, b) => Number(a.slice(prefix.length)) - Number(b.slice(prefix.length)));

if (!parts.length) {
  console.error("missing day5 restore parts");
  process.exit(1);
}

const b64 = parts.map((n) => readFileSync(join(partsDir, n), "utf8").trim()).join("");
const source = inflateSync(Buffer.from(b64, "base64")).toString("utf8");
if (!looksComplete(source)) {
  console.error("inflated source failed integrity check");
  process.exit(1);
}
writeFileSync(target, source);
console.log("restored telegram-plugin-sync.ts", source.length, "bytes from", parts.length, "parts");
