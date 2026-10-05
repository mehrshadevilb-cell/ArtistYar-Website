import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiRoot = join(root, "src/app/api");

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (name === "route.ts") acc.push(p);
  }
  return acc;
}

const AUTH_MARKERS = [
  "requireAdmin",
  "getAdminSession",
  "verifyAdminSession",
  "ADMIN_SESSION_COOKIE",
  "requireUser",
  "getUserSession",
  "getSession",
  "unauthorized",
  "status: 401",
  "status:401",
  "admin_session_required",
  "دسترسی مدیریت",
  "نشست ادمین",
  "ARTISTYAR_SESSION",
  "verifyPlugin",
  "process_secret",
  "x-telegram",
  "Bearer",
  "auth()",
  "isAdmin",
  "authorized()",
];

describe("API auth surface static contracts", () => {
  const routes = walk(apiRoot);
  it("discovers API routes", () => {
    assert.ok(routes.length > 50, `expected many routes, got ${routes.length}`);
  });

  it("admin routes require admin auth markers", () => {
    const adminRoutes = routes.filter((r) => r.includes("/api/admin/"));
    assert.ok(adminRoutes.length > 10);
    const missing = [];
    for (const r of adminRoutes) {
      const src = readFileSync(r, "utf8");
      if (!AUTH_MARKERS.some((m) => src.includes(m))) missing.push(r.replace(root + "/", ""));
    }
    assert.deepEqual(missing, [], `admin routes without auth markers: ${missing.join(", ")}`);
  });

  it("user project routes scope by session", () => {
    const userRoutes = routes.filter((r) => r.includes("/api/user/"));
    for (const r of userRoutes) {
      const src = readFileSync(r, "utf8");
      assert.ok(
        AUTH_MARKERS.some((m) => src.includes(m)) || src.includes("userId") || src.includes("session"),
        `missing auth on ${r}`
      );
    }
  });

  it("telegram process does not read secret from query", () => {
    const processRoute = routes.find((r) => r.includes("telegram/plugins/process"));
    if (!processRoute) return;
    const src = readFileSync(processRoute, "utf8");
    assert.ok(!/searchParams\.get\(['\"]process_secret['\"]\)/.test(src));
    assert.ok(!/searchParams\.get\(['\"]secret['\"]\)/.test(src));
  });
});
