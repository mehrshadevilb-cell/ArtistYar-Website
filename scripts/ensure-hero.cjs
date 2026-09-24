// Optimized hero WebP at build
const fs = require("fs");
const path = require("path");
const out = path.join(__dirname, "..", "public", "artistyar-studio-hero.webp");
const b64Path = path.join(__dirname, "hero.b64");

try {
  if (fs.existsSync(b64Path)) {
    const b64 = fs.readFileSync(b64Path, "utf8").trim().replace(/\s+/g, "");
    if (b64.length > 800) {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      const buf = Buffer.from(b64, "base64");
      if (buf.length > 500) {
        fs.writeFileSync(out, buf);
        console.log("[ensure-hero] wrote", out, buf.length, "bytes");
        process.exit(0);
      }
    }
  }
  if (fs.existsSync(out) && fs.statSync(out).size > 500) {
    console.log("[ensure-hero] existing webp ok", fs.statSync(out).size, "bytes");
    process.exit(0);
  }
  console.warn("[ensure-hero] missing valid public/artistyar-studio-hero.webp");
} catch (err) {
  console.warn("[ensure-hero] skipped:", err && err.message ? err.message : err);
}
process.exit(0);
