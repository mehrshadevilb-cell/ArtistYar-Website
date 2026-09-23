import { readFileSync, writeFileSync } from "fs";
import { inflateSync } from "zlib";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packed = join(root, "src/lib/telegram-plugin-sync.ts.zlib.b64");
const target = join(root, "src/lib/telegram-plugin-sync.ts");
const b64 = readFileSync(packed, "utf8").trim();
const source = inflateSync(Buffer.from(b64, "base64")).toString("utf8");
writeFileSync(target, source);
console.log("inflated telegram-plugin-sync.ts", source.length, "bytes");
