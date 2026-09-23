import { readFileSync, writeFileSync, existsSync } from "fs";
import { inflateSync } from "zlib";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const single = join(root, "src/lib/telegram-plugin-sync.ts.zlib.b64");
const partA = join(root, "src/lib/telegram-plugin-sync.ts.zlib.b64.a");
const partB = join(root, "src/lib/telegram-plugin-sync.ts.zlib.b64.b");
const target = join(root, "src/lib/telegram-plugin-sync.ts");

let b64 = "";
if (existsSync(single)) {
  b64 = readFileSync(single, "utf8").trim();
} else if (existsSync(partA) && existsSync(partB)) {
  b64 = (readFileSync(partA, "utf8") + readFileSync(partB, "utf8")).trim();
} else {
  console.error("missing telegram-plugin-sync compressed payload");
  process.exit(1);
}

const source = inflateSync(Buffer.from(b64, "base64")).toString("utf8");
writeFileSync(target, source);
console.log("inflated telegram-plugin-sync.ts", source.length, "bytes");
