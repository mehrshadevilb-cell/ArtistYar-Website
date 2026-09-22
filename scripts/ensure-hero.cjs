// Assemble optimized hero WebP at build time (was 3.8MB PNG -> 80KB WebP)
const fs = require("fs");
const path = require("path");
const dir = __dirname;
const out = path.join(dir, "..", "public", "artistyar-studio-hero.webp");
const parts = [1, 2, 3, 4].map((n) =>
  fs.readFileSync(path.join(dir, "hero.b64.part" + n), "utf8").trim()
);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.from(parts.join(""), "base64"));
console.log("[ensure-hero] wrote", out, fs.statSync(out).size, "bytes");
