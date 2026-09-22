// Optimized hero WebP at build (was 3.8MB PNG -> ~30KB WebP)
const fs = require("fs");
const path = require("path");
const out = path.join(__dirname, "..", "public", "artistyar-studio-hero.webp");
const b64 = fs.readFileSync(path.join(__dirname, "hero.b64"), "utf8").trim();
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.from(b64, "base64"));
console.log("[ensure-hero] wrote", out, fs.statSync(out).size, "bytes");
