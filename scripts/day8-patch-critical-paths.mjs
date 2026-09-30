import { readFileSync, writeFileSync } from "node:fs";

const p = "scripts/test-critical-paths.mjs";
let s = readFileSync(p, "utf8");
const neu =
  'assert.ok(processRoute.includes("isTelegramProcessAuthorized") || /x-telegram-plugin-process-secret/i.test(processRoute));';
if (s.includes("isTelegramProcessAuthorized")) {
  console.log("critical-paths already patched");
  process.exit(0);
}
const patterns = [
  "assert.match(processRoute, /x-telegram-plugin-process-secret/i);",
  'assert.match(processRoute, /x-telegram-plugin-process-secret/i);',
];
let hit = false;
for (const old of patterns) {
  if (s.includes(old)) {
    s = s.replace(old, neu);
    hit = true;
    break;
  }
}
if (!hit) {
  s = s.replace(
    /assert\.match\(\s*processRoute\s*,\s*\/x-telegram-plugin-process-secret\/i\s*\);/,
    neu,
  );
}
writeFileSync(p, s);
console.log("patched critical-paths", s.includes("isTelegramProcessAuthorized"));
