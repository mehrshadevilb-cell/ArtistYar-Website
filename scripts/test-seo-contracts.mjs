/**
 * Day 6 — static SEO contract tests (no live server).
 * Verifies source contracts for robots, sitemap, SearchAction, private noindex.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

describe("SEO contracts — SearchAction", () => {
  it("does not advertise courses?q= SearchAction without implementation", () => {
    const layout = read("src/app/layout.tsx");
    assert.ok(!layout.includes("`${siteUrl}/courses?q={search_term_string}`"));
    assert.ok(!layout.includes('"/courses?q={search_term_string}"'));
    const courses = read("src/app/courses/page.tsx");
    assert.ok(!courses.includes("searchParams"), "courses page has no searchParams handling");
  });
});

describe("SEO contracts — robots private paths", () => {
  it("disallows admin, api, login, register, practice, my-artistyar", () => {
    const robots = read("src/app/robots.ts");
    for (const path of ["/admin/", "/api/", "/login", "/register", "/practice", "/my-artistyar", "/panel/"]) {
      assert.ok(robots.includes(`"${path}"`) || robots.includes(`'${path}'`), `robots should disallow ${path}`);
    }
    assert.ok(robots.includes("sitemap:"), "robots should reference sitemap");
  });
});

describe("SEO contracts — private page metadata noindex", () => {
  it("login, my-artistyar, practice, register set robots noindex", () => {
    for (const file of [
      "src/app/login/layout.tsx",
      "src/app/my-artistyar/layout.tsx",
      "src/app/practice/layout.tsx",
      "src/app/register/layout.tsx",
    ]) {
      assert.ok(existsSync(join(root, file)), `${file} must exist`);
      const src = read(file);
      assert.ok(/index:\s*false/.test(src), `${file} must set robots index: false`);
    }
  });
});

describe("SEO contracts — sitemap public routes", () => {
  it("includes key public paths and excludes admin/auth", () => {
    const sitemap = read("src/app/sitemap.ts");
    for (const path of ["/", "/courses", "/ai", "/ai-music", "/about", "/contact", "/plugins"]) {
      assert.ok(sitemap.includes(`"${path}"`) || sitemap.includes(`'${path}'`), `sitemap should list ${path}`);
    }
    assert.ok(!sitemap.includes('"/admin"') && !sitemap.includes('"/login"'), "sitemap must not list admin/login");
    assert.ok(sitemap.includes("getCatalog") || sitemap.includes("packageRoutes"), "dynamic course routes present");
  });
});

describe("SEO contracts — no localhost in canonical defaults", () => {
  it("layout and robots default to artistyaar.ir", () => {
    const layout = read("src/app/layout.tsx");
    const robots = read("src/app/robots.ts");
    assert.ok(layout.includes("artistyaar.ir") || layout.includes("NEXT_PUBLIC_SITE_URL"));
    assert.ok(robots.includes("artistyaar.ir") || robots.includes("NEXT_PUBLIC_SITE_URL"));
    assert.ok(!layout.includes("localhost:3000"));
  });
});

describe("SEO contracts — structured data honesty", () => {
  it("WebSite JSON-LD remains without fabricated SearchAction", () => {
    const layout = read("src/app/layout.tsx");
    assert.ok(layout.includes('"@type": "WebSite"'));
    assert.ok(!layout.includes('"@type": "SearchAction"'));
    assert.ok(!layout.includes("potentialAction"));
  });
});

describe("SEO contracts — root document direction", () => {
  it("root layout sets lang=fa and dir=rtl on html", () => {
    const layout = read("src/app/layout.tsx");
    assert.match(layout, /<html[^>]*lang="fa"/);
    assert.match(layout, /<html[^>]*dir="rtl"/);
  });
});
