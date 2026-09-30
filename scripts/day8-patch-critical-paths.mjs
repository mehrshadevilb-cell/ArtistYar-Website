import { readFileSync, writeFileSync } from "node:fs";

const files = [
  {
    path: "scripts/test-critical-paths.mjs",
    old: "assert.match(processRoute, /x-telegram-plugin-process-secret/i);",
    neu: 'assert.ok(processRoute.includes("isTelegramProcessAuthorized") || /x-telegram-plugin-process-secret/i.test(processRoute));',
  },
  {
    path: "scripts/test-security-runtime-day7.mjs",
    old: 'assert.ok(src.includes("x-telegram-plugin-process-secret"));',
    neu: 'const helper = read("src/lib/telegram-admin-auth.ts");\n    assert.ok(src.includes("isTelegramProcessAuthorized") || helper.includes("x-telegram-plugin-process-secret"));\n    assert.ok(helper.includes("x-telegram-plugin-process-secret"));',
  },
];

for (const f of files) {
  let s = readFileSync(f.path, "utf8");
  if (s.includes("isTelegramProcessAuthorized") && f.path.includes("critical")) {
    console.log(f.path, "already ok");
    continue;
  }
  if (s.includes(f.old)) {
    s = s.replace(f.old, f.neu);
    writeFileSync(f.path, s);
    console.log("patched", f.path);
  } else {
    console.log("pattern not found", f.path);
  }
}
