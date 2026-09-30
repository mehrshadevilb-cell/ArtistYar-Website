/**
 * Day 7 — static security/runtime contracts.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

describe("Day7 security headers", () => {
  it("next.config declares HSTS, CSP, nosniff, frame options", () => {
    const cfg = read("next.config.ts");
    assert.ok(cfg.includes("Strict-Transport-Security"));
    assert.ok(cfg.includes("max-age=31536000"));
    assert.ok(cfg.includes("Content-Security-Policy"));
    assert.ok(cfg.includes("X-Content-Type-Options"));
    assert.ok(cfg.includes("X-Frame-Options"));
    assert.ok(cfg.includes("frame-ancestors 'self'") || cfg.includes("SAMEORIGIN"));
    assert.ok(!cfg.includes("unsafe-eval"), "CSP must not enable unsafe-eval");
  });
});

describe("Day7 education progress authorization", () => {
  it("GET lesson path verifies course access like PUT", () => {
    const src = read("src/app/api/education/progress/route.ts");
    assert.ok(src.includes("verifyCourseAccess"));
    const getIdx = src.indexOf("export async function GET");
    const putIdx = src.indexOf("export async function PUT");
    assert.ok(getIdx >= 0 && putIdx > getIdx);
    const getBody = src.slice(getIdx, putIdx);
    assert.ok(getBody.includes("lessonId"));
    assert.ok(getBody.includes("verifyCourseAccess"));
    assert.ok(getBody.includes("course_access_required"));
    assert.ok(!/return NextResponse\.json\(\{\s*error:\s*r\.error\.message/.test(src));
  });
});

describe("Day7 process secret transport", () => {
  it("telegram process secret is header-only", () => {
    const src = read("src/app/api/telegram/plugins/process/route.ts");
    const helper = read("src/lib/telegram-admin-auth.ts");
    assert.ok(src.includes("isTelegramProcessAuthorized") || helper.includes("x-telegram-plugin-process-secret"));
    assert.ok(helper.includes("x-telegram-plugin-process-secret"));
    assert.ok(!src.includes('searchParams.get("process_secret")'));
    assert.ok(!src.includes("searchParams.get('process_secret')"));
  });
});

describe("Day7 session cookies", () => {
  it("user and admin session cookies are httpOnly with production secure", () => {
    const src = read("src/lib/server-admin-auth.ts");
    assert.ok(src.includes("httpOnly: true"));
    assert.ok(src.includes('secure: process.env.NODE_ENV === "production"'));
    assert.ok(src.includes('sameSite: "lax"'));
    assert.ok(src.includes("timingSafeEqual"));
  });
});

describe("Day7 music rate limit classification", () => {
  it("music generate rateMap remains process-local UX throttle", () => {
    const src = read("src/app/api/music/generate/route.ts");
    assert.ok(src.includes("rateMap"));
    assert.ok(src.includes("MAX_PER_WINDOW") || src.includes("rateMap.set"));
  });
});
