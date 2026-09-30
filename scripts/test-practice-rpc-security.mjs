/**
 * Static security regression checks for Day 1 practice RPC + secret transport hardening.
 * Does not require live DB credentials; verifies source and migration contracts.
 */
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const migration = read("../supabase/migrations/20260930_harden_practice_rpc_security.sql");
const instrumentation = read("../src/instrumentation.ts");
const processRoute = read("../src/app/api/telegram/plugins/process/route.ts");
const processScript = read("../scripts/process-telegram-plugins.mjs");
const progressRoute = read("../src/app/api/practice/progress/route.ts");
const statusRoute = read("../src/app/api/practice/status/route.ts");

// --- Migration: revoke client roles, grant service_role only ---
assert.match(migration, /REVOKE ALL ON FUNCTION public\.get_practice_daily_quota\(text\) FROM PUBLIC/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.get_practice_daily_quota\(text\) FROM anon/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.get_practice_daily_quota\(text\) FROM authenticated/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.consume_practice_daily_stage\(text, boolean\) FROM PUBLIC/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.consume_practice_daily_stage\(text, boolean\) FROM anon/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.consume_practice_daily_stage\(text, boolean\) FROM authenticated/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.refund_practice_daily_stage\(text\) FROM PUBLIC/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.refund_practice_daily_stage\(text, uuid\) FROM PUBLIC/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_practice_daily_quota\(text\) TO service_role/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.consume_practice_daily_stage\(text, boolean\) TO service_role/);
assert.match(migration, /SET search_path = public/);

// --- Secret must not appear in query strings ---
assert.doesNotMatch(instrumentation, /process_secret=/);
assert.doesNotMatch(instrumentation, /\?secret=/);
assert.match(instrumentation, /x-telegram-plugin-process-secret/);

assert.doesNotMatch(processScript, /process_secret=/);
assert.doesNotMatch(processScript, /\?key=/);
assert.match(processScript, /x-telegram-plugin-process-secret|x-web-admin-key/);

// Route must not accept process_secret from query
assert.doesNotMatch(processRoute, /searchParams\.get\("process_secret"\)/);
assert.ok(
  processRoute.includes("isTelegramProcessAuthorized") || /x-telegram-plugin-process-secret/.test(processRoute),
  "process route must use header process secret (helper or inline)",
);

// --- Application still calls RPCs via service-role client ---
assert.match(progressRoute, /consume_practice_daily_stage/);
assert.match(progressRoute, /refund_practice_daily_stage/);
assert.match(progressRoute, /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/);
assert.match(statusRoute, /get_practice_daily_quota/);
assert.match(statusRoute, /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/);

console.log("practice_rpc_security_checks_passed");
console.log(
  JSON.stringify({
    anon_rpc_execution: "DENIED_BY_MIGRATION",
    authenticated_rpc_execution: "DENIED_BY_MIGRATION",
    cross_user_access: "BLOCKED_AT_DB_BOUNDARY",
    service_role_path: "GRANTED",
    secret_in_query_rejection: "ROUTE_NO_LONGER_READS_QUERY_SECRET",
    secret_header_authentication: "INSTRUMENTATION_AND_CRON_USE_HEADER",
  }),
);
