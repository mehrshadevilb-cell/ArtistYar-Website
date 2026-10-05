/**
 * Practice API ownership / IDOR source contracts.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

describe("practice progress ownership", () => {
  const src = read("src/app/api/practice/progress/route.ts");

  it("POST uses authenticated session id for writes, not body.userId alone", () => {
    assert.ok(src.includes("verifyUserSession"));
    assert.ok(src.includes("const userId = auth.id") || src.includes("userId = auth.id"));
    assert.ok(src.includes("requestedUserId") && src.includes("auth.id"));
  });

  it("GET prefers session identity for non-admin", () => {
    assert.ok(src.includes("auth.admin && requested") || src.includes("auth.admin"));
    assert.ok(src.includes("unauthorized"));
  });

  it("duplicate submissions are rejected", () => {
    assert.ok(src.includes("isDuplicateSubmission"));
    assert.ok(src.includes("409") || src.includes("duplicate"));
  });

  it("question tokens are verified when present", () => {
    assert.ok(src.includes("verifyPracticeQuestionToken"));
  });

  it("server calculates XP", () => {
    assert.ok(src.includes("calculateRoundXp"));
  });
});

describe("practice question route binds identity", () => {
  it("question token module binds userId and gameId", () => {
    const tok = read("src/lib/practice-question-token.ts");
    assert.ok(tok.includes("userId"));
    assert.ok(tok.includes("gameId"));
  });
});
