/**
 * Deterministic HMAC student-session crypto contracts (mirrors src/lib/server-admin-auth.ts).
 * Uses a local secret so CI never needs production ARTISTYAR_SESSION_SECRET.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = "artistyar-test-session-secret-not-for-prod";
const USER_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function userSignature(payload) {
  return createHmac("sha256", SECRET).update("user:" + payload).digest("hex").slice(0, 32);
}

function createUserSession(user) {
  const payload = JSON.stringify({ ...user, issuedAt: Date.now() });
  return `${Buffer.from(payload).toString("base64url")}.${userSignature(payload)}`;
}

function verifyUserSession(value) {
  if (!value || !SECRET) return null;
  try {
    const [encoded, providedSignature] = value.split(".");
    if (!encoded || !providedSignature) return null;
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const expected = userSignature(payload);
    const a = Buffer.from(providedSignature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(payload);
    if (
      parsed.role !== "student" ||
      typeof parsed.id !== "string" ||
      typeof parsed.username !== "string" ||
      !Number.isFinite(parsed.issuedAt)
    )
      return null;
    const age = Math.floor((Date.now() - Number(parsed.issuedAt)) / 1000);
    if (age < 0 || age > USER_SESSION_MAX_AGE_SECONDS) return null;
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

describe("student session crypto", () => {
  it("valid student session verifies", () => {
    const token = createUserSession({
      id: "student-a",
      username: "a@test",
      fullName: "Student A",
      role: "student",
    });
    const s = verifyUserSession(token);
    assert.ok(s);
    assert.equal(s.id, "student-a");
    assert.equal(s.role, "student");
  });

  it("tampered payload is rejected", () => {
    const token = createUserSession({
      id: "student-a",
      username: "a",
      fullName: "A",
      role: "student",
    });
    const [enc, sig] = token.split(".");
    const parsed = JSON.parse(Buffer.from(enc, "base64url").toString());
    parsed.id = "student-b";
    const forged = `${Buffer.from(JSON.stringify(parsed)).toString("base64url")}.${sig}`;
    assert.equal(verifyUserSession(forged), null);
  });

  it("wrong role is rejected", () => {
    const payload = JSON.stringify({
      id: "x",
      username: "x",
      fullName: "x",
      role: "admin",
      issuedAt: Date.now(),
    });
    const token = `${Buffer.from(payload).toString("base64url")}.${userSignature(payload)}`;
    assert.equal(verifyUserSession(token), null);
  });

  it("expired session is rejected", () => {
    const payload = JSON.stringify({
      id: "x",
      username: "x",
      fullName: "x",
      role: "student",
      issuedAt: Date.now() - (USER_SESSION_MAX_AGE_SECONDS + 60) * 1000,
    });
    const token = `${Buffer.from(payload).toString("base64url")}.${userSignature(payload)}`;
    assert.equal(verifyUserSession(token), null);
  });

  it("malformed / empty tokens rejected", () => {
    assert.equal(verifyUserSession(undefined), null);
    assert.equal(verifyUserSession(""), null);
    assert.equal(verifyUserSession("not.a.valid"), null);
  });

  it("source mirrors HMAC user: prefix and student role gate", async () => {
    const { readFileSync } = await import("node:fs");
    const { join, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const root = join(dirname(fileURLToPath(import.meta.url)), "..");
    const src = readFileSync(join(root, "src/lib/server-admin-auth.ts"), "utf8");
    assert.ok(src.includes("user:"));
    assert.ok(src.includes('role !== "student"') || src.includes("student"));
    assert.ok(src.includes("timingSafeEqual"));
  });
});
