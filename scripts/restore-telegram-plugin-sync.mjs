/**
 * Emergency check for telegram-plugin-sync.ts truncation.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "src/lib/telegram-plugin-sync.ts");
const current = existsSync(target) ? readFileSync(target, "utf8") : "";
if (current.includes("export async function enqueuePluginMessage") && current.length > 10000) {
  console.log("telegram-plugin-sync.ts looks intact");
  process.exit(0);
}
console.error("telegram-plugin-sync.ts is missing or truncated.");
console.error("Restore with:");
console.error("  git show 0fd93340e828abbee0a800537beda9acb8a21281:src/lib/telegram-plugin-sync.ts > src/lib/telegram-plugin-sync.ts");
process.exit(1);
