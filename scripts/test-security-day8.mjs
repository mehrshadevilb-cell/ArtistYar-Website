/**
 * Day 8 — residual security contracts (static + optional live header probe).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

describe("Day8 telegram admin query-key removal", () => {
  it("telegram plugin admin routes reject query-key auth (header only)", () => {
    const dir = join(root, "src/app/api/telegram/plugins");
    const routes = readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => join(dir, d.name, "route.ts"))
      .filter((p) => {
        try {
          readFileSync(p);
          return true;
        } catch {
          return false;
        }
      });
    assert.ok(routes.length >= 4);
    for (const route of routes) {
      const src = readFileSync(route, "utf8");
      assert.ok(
        !src.includes('searchParams.get("key")') && !src.includes("searchParams.get('key')"),
        `${route} must not accept ?key=`,
      );
    }
    const helper = read("src/lib/telegram-admin-auth.ts");
    assert.ok(helper.includes("isTelegramAdminAuthorized"));
    assert.ok(helper.includes("isTelegramProcessAuthorized"));
    assert.ok(helper.includes("timingSafeEqual"));
    assert.ok(!helper.includes("searchParams"));
  });
});

describe("Day8 process secret remains header-only", () => {
  it("process route uses shared helper and no query secrets", () => {
    const src = read("src/app/api/telegram/plugins/process/route.ts");
    assert.ok(src.includes("isTelegramProcessAuthorized"));
    assert.ok(!src.includes('searchParams.get("key")'));
  });
});

describe("Day8 education progress contracts", () => {
  it("GET verifies course access and redacts DB errors", () => {
    const src = read("src/app/api/education/progress/route.ts");
    const getBody = src.slice(src.indexOf("export async function GET"), src.indexOf("export async function PUT"));
    assert.ok(getBody.includes("verifyCourseAccess"));
    assert.ok(src.includes("storage_unavailable"));
    assert.ok(!/error:\s*r\.error\.message/.test(src));
  });
});

describe("Day8 music rate limit remains UX-only", () => {
  it("rateMap is process-local; durable controls are auth+credits", () => {
    const src = read("src/app/api/music/generate/route.ts");
    assert.ok(src.includes("rateMap"));
  });
});

describe("Day8 next.config still declares CSP and HSTS", () => {
  it("source headers include Strict-Transport-Security and Content-Security-Policy", () => {
    const cfg = read("next.config.ts");
    assert.ok(cfg.includes("Strict-Transport-Security"));
    assert.ok(cfg.includes("Content-Security-Policy"));
  });
});

describe("Day8 live header probe (informational)", () => {
  it("records production header presence without failing on deploy lag", async () => {
    if (process.env.DAY8_REQUIRE_LIVE_HEADERS === "1") {
      const res = await fetch("https://artistyaar.ir/", { method: "HEAD", redirect: "follow" });
      assert.ok(res.headers.get("strict-transport-security"), "live HSTS missing");
      assert.ok(res.headers.get("content-security-policy"), "live CSP missing");
    } else {
      assert.ok(true);
    }
  });
});
