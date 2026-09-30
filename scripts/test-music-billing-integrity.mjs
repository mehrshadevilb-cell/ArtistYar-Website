/**
 * Day 2 — AI music billing / financial integrity static + logic checks.
 * Does not require live credentials for the static contract tests.
 */
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

const route = read("../src/app/api/music/generate/route.ts");
const credits = read("../src/lib/music-generation/credits.ts");
const jobs = read("../src/lib/music-generation/job-service.ts");
const migration = read("../supabase/migrations/20260920_user_ai_music_generation.sql");

// --- Authorization before charge ---
const authIdx = route.indexOf("ownedProject");
const chargeIdx = route.indexOf("chargeCredits({");
assert.ok(authIdx > 0 && chargeIdx > 0, "ownedProject and chargeCredits must exist");
assert.ok(authIdx < chargeIdx, "ownedProject authorization must run before chargeCredits");

const projectBlock = route.slice(0, chargeIdx);
assert.match(projectBlock, /ownedProject/);
assert.match(projectBlock, /ProjectNotFound|پروژه انتخاب‌شده معتبر نیست/);

// --- No Date.now() as authoritative idempotency ---
assert.doesNotMatch(route, /gen:\$\{user\.id\}:\$\{Date\.now\(\)\}/);
assert.doesNotMatch(route, /idempotencyKey[\s\S]{0,80}Date\.now\(\)/);
assert.match(route, /randomUUID/);
assert.match(route, /resolveIdempotencyKey|idempotencyKey/);

// --- Refund on post-charge failure ---
assert.match(route, /refund:\$\{idempotencyKey\}:abort|refund_after_failure/);
assert.match(route, /chargedAmount > 0/);

// --- Job unique conflict handling ---
assert.match(jobs, /23505|unique_violation|duplicate\|unique/i);
assert.match(jobs, /idempotency_key/);

// --- Ledger uniqueness in schema ---
assert.match(migration, /UNIQUE \(user_id, idempotency_key\)/);
assert.match(migration, /ai_music_jobs_idempotency_uidx/);

// --- Charge ledger idempotency ---
assert.match(credits, /idempotency_key/);
assert.match(credits, /InsufficientCredits|balance < amount/);

console.log("music_billing_integrity_checks_passed");
console.log(
  JSON.stringify({
    auth_before_charge: "PASS",
    no_date_now_idempotency: "PASS",
    refund_on_abort: "PASS",
    job_unique_race_handling: "PASS",
    ledger_unique_constraint: "PASS",
  }),
);
