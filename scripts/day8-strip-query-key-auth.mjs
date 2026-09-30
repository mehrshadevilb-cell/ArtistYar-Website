/**
 * Day 8: force telegram plugin admin routes to header-only auth.
 * Idempotent — safe to re-run.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const plugins = join(root, "src/app/api/telegram/plugins");

function ensureImport(src, symbol) {
  if (src.includes('from "@/lib/telegram-admin-auth"')) return src;
  const line = `import { ${symbol} } from "@/lib/telegram-admin-auth";\n`;
  const idx = src.indexOf("\n");
  return src.slice(0, idx + 1) + line + src.slice(idx + 1);
}

function replaceAuthorized(src, body) {
  return src.replace(/function authorized\(request: Request\) \{[\s\S]*?\n\}/, body);
}

for (const name of readdirSync(plugins)) {
  const route = join(plugins, name, "route.ts");
  let src;
  try {
    src = readFileSync(route, "utf8");
  } catch {
    continue;
  }
  if (name === "webhook") continue;
  if (name === "process") {
    src = ensureImport(src, "isTelegramProcessAuthorized");
    src = replaceAuthorized(
      src,
      "function authorized(request: Request) {\n  return isTelegramProcessAuthorized(request);\n}",
    );
  } else {
    src = ensureImport(src, "isTelegramAdminAuthorized");
    src = replaceAuthorized(
      src,
      "function authorized(request: Request) {\n  return isTelegramAdminAuthorized(request);\n}",
    );
  }
  if (src.includes('searchParams.get("key")')) {
    src = src
      .split("\n")
      .filter((l) => !l.includes('searchParams.get("key")'))
      .join("\n");
  }
  writeFileSync(route, src);
  console.log("patched", name);
}
