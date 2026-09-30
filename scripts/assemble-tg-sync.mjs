/**
 * Assemble telegram-plugin-sync.ts from scripts/tg-sync.zlib.b64.* parts.
 * No-op if target already complete.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "src/lib/telegram-plugin-sync.ts");
const prefix = "tg-sync.zlib.b64.";

function complete(src) {
  return (
    typeof src === "string" &&
    src.includes("export async function enqueuePluginMessage") &&
    src.includes("export async function processPendingPluginPairs") &&
    src.includes("syncPublishedPluginCover") &&
    src.length > 20000 &&
    !src.includes("PLACEHOLDER_WILL_REPLACE")
  );
}

if (existsSync(target) && complete(readFileSync(target, "utf8"))) {
  console.log("telegram-plugin-sync.ts already complete");
  process.exit(0);
}

const parts = readdirSync(join(root, "scripts"))
  .filter((n) => n.startsWith(prefix) && /^\d+$/.test(n.slice(prefix.length)))
  .sort((a, b) => Number(a.slice(prefix.length)) - Number(b.slice(prefix.length)));

if (!parts.length) {
  console.error("missing tg-sync.zlib.b64 parts");
  process.exit(1);
}

const b64 = parts.map((n) => readFileSync(join(root, "scripts", n), "utf8").trim()).join("");
const source = inflateSync(Buffer.from(b64, "base64")).toString("utf8");
if (!complete(source)) {
  console.error("inflated source failed integrity check", source.length);
  process.exit(1);
}
writeFileSync(target, source);
console.log("restored telegram-plugin-sync.ts", source.length, "bytes from", parts.length, "parts");
