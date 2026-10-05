/**
 * Deterministic contracts for /my-artistyar auth gate + student APIs.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

describe("my-artistyar auth gate", () => {
  it("page is wrapped in RequireAuth role=student", () => {
    const page = read("src/app/my-artistyar/page.tsx");
    assert.ok(page.includes("RequireAuth"));
    assert.ok(/role=["']student["']/.test(page));
  });

  it("layout sets robots noindex", () => {
    const layout = read("src/app/my-artistyar/layout.tsx");
    assert.ok(/index:\s*false/.test(layout));
  });

  it("student labels are Persian (no English hub leftovers)", () => {
    const page = read("src/app/my-artistyar/page.tsx");
    assert.ok(page.includes("یادگیری"));
    assert.ok(page.includes("تمرین"));
    assert.ok(page.includes("آرتیست‌یار من") || page.includes("مسیر یادگیری"));
    assert.ok(!page.includes('"Learn"'));
    assert.ok(!page.includes('"Practice"'));
    assert.ok(!page.includes("MY ARTISTYAR"));
  });

  it("RequireAuth redirects unauthenticated users to /login", () => {
    const ra = read("src/components/RequireAuth.tsx");
    assert.ok(ra.includes('"/login"') || ra.includes("'/login'"));
    assert.ok(ra.includes("useAuth"));
  });
});

describe("student data APIs require session", () => {
  it("projects API rejects without session", () => {
    const src = read("src/app/api/user/projects/route.ts");
    assert.ok(src.includes("verifyUserSession") || src.includes("USER_SESSION"));
    assert.ok(src.includes("401") || src.includes("unauthorized"));
  });

  it("learning API scopes by session user id", () => {
    const src = read("src/app/api/user/learning/route.ts");
    assert.ok(src.includes("verifyUserSession") || src.includes("USER_SESSION"));
    assert.ok(src.includes("user_id") || src.includes("s.id") || src.includes("session"));
  });
});
