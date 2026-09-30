/**
 * Day 3 — critical schema inventory expectations (static contract).
 * Does not connect to production; guards that repo still documents required objects.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migDir = join(root, "supabase/migrations");
const files = readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();
assert.ok(files.length >= 50, `expected >=50 migration files, got ${files.length}`);

const day1 = files.find((f) => f.includes("harden_practice_rpc_security"));
const day2 = files.find((f) => f.includes("ai_music_credit_charge_atomic"));
const day3 = files.find((f) => f.includes("day3_schema_reconciliation_baseline_marker"));
assert.ok(day1, "Day 1 migration missing");
assert.ok(day2, "Day 2 migration missing");
assert.ok(day3, "Day 3 baseline marker missing");

const all = files.map((f) => readFileSync(join(migDir, f), "utf8")).join("\n");
for (const name of [
  "get_practice_daily_quota",
  "consume_practice_daily_stage",
  "refund_practice_daily_stage",
  "charge_ai_music_credits",
  "refund_ai_music_credits",
  "ai_music_generation_jobs",
  "ai_music_generation_credit_ledger",
  "ay_classes",
  "telegram_plugin_ingest_queue",
]) {
  assert.match(all, new RegExp(name), `schema archive missing reference: ${name}`);
}

const doc = readFileSync(join(root, "docs/migration-reconciliation-day3.md"), "utf8");
assert.match(doc, /Applied and recorded/);
assert.match(doc, /Applied but unrecorded/);
assert.match(doc, /Not applied/);
assert.match(doc, /PARTIAL/);

console.log("schema_inventory_checks_passed");
console.log(JSON.stringify({ migration_files: files.length, day1, day2, day3 }));
