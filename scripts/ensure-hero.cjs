// Optimized hero WebP at build (target: 3.8MB PNG -> ~30-80KB WebP)
const fs = require("fs");
const path = require("path");
const out = path.join(__dirname, "..", "public", "artistyar-studio-hero.webp");
const b64Path = path.join(__dirname, "hero.b64");

try {
  if (fs.existsSync(b64Path)) {
    const b64 = fs.readFileSync(b64Path, "utf8").trim();
    // Valid WebP payload is large; skip tiny placeholders
    if (b64.length > 5000) {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, Buffer.from(b64, "base64"));
      console.log("[ensure-hero] wrote", out, fs.statSync(out).size, "bytes");
      process.exit(0);
    }
  }
  if (fs.existsSync(out) && fs.statSync(out).size > 5000) {
    console.log("[ensure-hero] existing webp ok", fs.statSync(out).size, "bytes");
    process.exit(0);
  }
  console.warn(
    "[ensure-hero] missing valid public/artistyar-studio-hero.webp — copy from artifacts/artistyar-studio-hero.webp",
  );
} catch (err) {
  console.warn("[ensure-hero] skipped:", err && err.message ? err.message : err);
}
process.exit(0);
