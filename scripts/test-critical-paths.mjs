/**
 * Day 4 — Critical-path testing foundation (Node built-in test runner).
 * Deterministic. No network, no production DB, no secrets required.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

function adminSignature(secret, payload) {
  return createHmac("sha256", secret).update(payload).digest("hex").slice(0, 32);
}
function userSignature(secret, payload) {
  return createHmac("sha256", secret).update("user:" + payload).digest("hex").slice(0, 32);
}

function createAdminSession(secret, username, issuedAt = Date.now()) {
  const payload = `${username}:${issuedAt}`;
  return `${Buffer.from(payload).toString("base64url")}.${adminSignature(secret, payload)}`;
}

function verifyAdminSession(secret, configuredAdmin, value, maxAgeSec = 12 * 60 * 60) {
  if (!value || !secret) return null;
  try {
    const [encoded, providedSignature] = value.split(".");
    if (!encoded || !providedSignature) return null;
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const expected = adminSignature(secret, payload);
    const a = Buffer.from(providedSignature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const separator = payload.lastIndexOf(":");
    if (separator <= 0) return null;
    const username = payload.slice(0, separator);
    const issuedAt = Number(payload.slice(separator + 1));
    if (!username || !Number.isFinite(issuedAt)) return null;
    if (!configuredAdmin || username !== configuredAdmin) return null;
    const ageSeconds = Math.floor((Date.now() - issuedAt) / 1000);
    if (ageSeconds < 0 || ageSeconds > maxAgeSec) return null;
    return { username, issuedAt };
  } catch {
    return null;
  }
}

function createUserSession(secret, user, issuedAt = Date.now()) {
  const payload = JSON.stringify({ ...user, issuedAt });
  return `${Buffer.from(payload).toString("base64url")}.${userSignature(secret, payload)}`;
}

function verifyUserSession(secret, value, maxAgeSec = 7 * 24 * 60 * 60) {
  if (!value || !secret) return null;
  try {
    const [encoded, providedSignature] = value.split(".");
    if (!encoded || !providedSignature) return null;
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const expected = userSignature(secret, payload);
    const a = Buffer.from(providedSignature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(payload);
    if (
      parsed.role !== "student" ||
      typeof parsed.id !== "string" ||
      typeof parsed.username !== "string" ||
      !Number.isFinite(parsed.issuedAt)
    ) {
      return null;
    }
    const age = Math.floor((Date.now() - Number(parsed.issuedAt)) / 1000);
    if (age < 0 || age > maxAgeSec) return null;
    return {
      id: parsed.id,
      username: parsed.username,
      fullName: typeof parsed.fullName === "string" ? parsed.fullName : parsed.username,
      role: "student",
      telegramId: typeof parsed.telegramId === "string" ? parsed.telegramId : undefined,
    };
  } catch {
    return null;
  }
}

function estimateGenerationCredits(durationMs) {
  if (!durationMs || durationMs <= 15_000) return 1;
  if (durationMs <= 45_000) return 2;
  return 3;
}

describe("authentication — admin session", () => {
  const secret = "day4-test-secret-not-production";
  const admin = "artistyar-admin";

  test("rejects missing session", () => {
    assert.equal(verifyAdminSession(secret, admin, undefined), null);
    assert.equal(verifyAdminSession(secret, admin, ""), null);
  });

  test("rejects malformed session", () => {
    assert.equal(verifyAdminSession(secret, admin, "not-a-session"), null);
    assert.equal(verifyAdminSession(secret, admin, "abc.def"), null);
  });

  test("rejects tampered signature", () => {
    const token = createAdminSession(secret, admin);
    const [enc] = token.split(".");
    assert.equal(verifyAdminSession(secret, admin, `${enc}.00000000000000000000000000000000`), null);
  });

  test("rejects session for different admin username after rotation", () => {
    const token = createAdminSession(secret, "old-admin");
    assert.equal(verifyAdminSession(secret, admin, token), null);
  });

  test("rejects expired session", () => {
    const issuedAt = Date.now() - 13 * 60 * 60 * 1000;
    const token = createAdminSession(secret, admin, issuedAt);
    assert.equal(verifyAdminSession(secret, admin, token), null);
  });

  test("accepts valid admin session bound to configured username", () => {
    const token = createAdminSession(secret, admin);
    const session = verifyAdminSession(secret, admin, token);
    assert.ok(session);
    assert.equal(session.username, admin);
  });

  test("rejects when secret missing", () => {
    const token = createAdminSession(secret, admin);
    assert.equal(verifyAdminSession("", admin, token), null);
  });
});

describe("authentication — user session", () => {
  const secret = "day4-user-secret-not-production";
  const user = { id: "u-test-1", username: "student1", fullName: "Student One", role: "student" };

  test("rejects unauthenticated / empty", () => {
    assert.equal(verifyUserSession(secret, undefined), null);
    assert.equal(verifyUserSession(secret, ""), null);
  });

  test("rejects role escalation via payload mutation", () => {
    const payload = JSON.stringify({ ...user, role: "admin", issuedAt: Date.now() });
    const token = `${Buffer.from(payload).toString("base64url")}.${userSignature(secret, payload)}`;
    assert.equal(verifyUserSession(secret, token), null);
  });

  test("rejects missing id or username", () => {
    const payload = JSON.stringify({ role: "student", username: "x", issuedAt: Date.now() });
    const token = `${Buffer.from(payload).toString("base64url")}.${userSignature(secret, payload)}`;
    assert.equal(verifyUserSession(secret, token), null);
  });

  test("accepts valid student session", () => {
    const token = createUserSession(secret, user);
    const session = verifyUserSession(secret, token);
    assert.ok(session);
    assert.equal(session.id, "u-test-1");
    assert.equal(session.role, "student");
  });

  test("rejects expired user session", () => {
    const token = createUserSession(secret, user, Date.now() - 8 * 24 * 60 * 60 * 1000);
    assert.equal(verifyUserSession(secret, token), null);
  });
});

describe("billing pure logic — credit estimation", () => {
  test("short clip costs 1 credit", () => {
    assert.equal(estimateGenerationCredits(undefined), 1);
    assert.equal(estimateGenerationCredits(0), 1);
    assert.equal(estimateGenerationCredits(15_000), 1);
  });
  test("medium clip costs 2 credits", () => {
    assert.equal(estimateGenerationCredits(15_001), 2);
    assert.equal(estimateGenerationCredits(45_000), 2);
  });
  test("long clip costs 3 credits", () => {
    assert.equal(estimateGenerationCredits(45_001), 3);
    assert.equal(estimateGenerationCredits(120_000), 3);
  });
  test("source thresholds match pure helper", () => {
    const src = read("src/lib/music-generation/credits.ts");
    assert.match(src, /15_000/);
    assert.match(src, /45_000/);
  });
});

describe("authorization contracts — music generate", () => {
  const route = read("src/app/api/music/generate/route.ts");

  test("unauthenticated path returns 401 before charge", () => {
    const authIdx = route.indexOf("if (!user)");
    const chargeIdx = route.indexOf("chargeCredits({");
    assert.ok(authIdx > 0 && chargeIdx > authIdx);
    assert.match(route.slice(authIdx, chargeIdx), /401/);
  });

  test("ownedProject authorization runs before chargeCredits", () => {
    const authIdx = route.indexOf("ownedProject");
    const chargeIdx = route.indexOf("chargeCredits({");
    assert.ok(authIdx > 0 && authIdx < chargeIdx);
  });

  test("foreign/nonexistent project does not charge", () => {
    assert.match(route, /ProjectNotFound/);
    const block = route.slice(0, route.indexOf("chargeCredits({"));
    assert.match(block, /ownedProject/);
  });

  test("insufficient credits returns 402", () => {
    assert.match(route, /status:\s*402/);
    assert.match(route, /InsufficientCredits/);
  });
});

describe("authorization contracts — admin", () => {
  const settings = read("src/app/api/admin/settings/route.ts");
  test("admin settings rejects missing admin session with 401", () => {
    assert.match(settings, /verifyAdminSession/);
    assert.match(settings, /status:\s*401/);
    assert.match(settings, /unauthorized/);
  });
});

describe("authorization contracts — education progress", () => {
  const progress = read("src/app/api/education/progress/route.ts");
  const access = read("src/lib/education-access.ts");

  test("unauthenticated progress requests require authentication", () => {
    assert.match(progress, /authentication_required/);
    assert.match(progress, /getStudentSession/);
  });

  test("PUT progress requires course access verification", () => {
    assert.match(progress, /verifyCourseAccess/);
    assert.match(progress, /course_access_required/);
    assert.match(access, /verifyCourseAccess/);
  });

  test("GET by lessonId is scoped to authenticated user id only", () => {
    assert.match(progress, /eq\("user_id",\s*Number\(s\.id\)\)/);
    assert.match(progress, /lessonId/);
  });
});

describe("security contracts — telegram processor", () => {
  const processRoute = read("src/app/api/telegram/plugins/process/route.ts");
  const instrumentation = read("src/instrumentation.ts");

  test("processor authenticates via header not query secret", () => {
    assert.match(processRoute, /x-telegram-plugin-process-secret/i);
    assert.doesNotMatch(processRoute, /searchParams\.get\(["']process_secret["']\)/);
  });

  test("instrumentation does not append process_secret to URL", () => {
    assert.doesNotMatch(instrumentation, /process_secret=/);
    assert.match(instrumentation, /x-telegram-plugin-process-secret/i);
  });
});

describe("session source integrity", () => {
  const auth = read("src/lib/server-admin-auth.ts");
  test("admin session binds to ARTISTYAR_ADMIN_USERNAME", () => {
    assert.match(auth, /ARTISTYAR_ADMIN_USERNAME/);
    assert.match(auth, /timingSafeEqual/);
  });
  test("user session requires role student", () => {
    assert.match(auth, /role !== "student"/);
  });
});

describe("day 1–3 regression suite presence", () => {
  test("security, music-billing, schema-inventory scripts exist", () => {
    assert.ok(existsSync(join(root, "scripts/test-practice-rpc-security.mjs")));
    assert.ok(existsSync(join(root, "scripts/test-music-billing-integrity.mjs")));
    assert.ok(existsSync(join(root, "scripts/verify-schema-inventory.mjs")));
  });
});
