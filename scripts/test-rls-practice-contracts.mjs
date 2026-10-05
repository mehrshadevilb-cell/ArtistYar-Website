/**
 * Migration-level RLS / SECURITY DEFINER contracts for practice.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migDir = join(root, "supabase/migrations");

describe("practice RPC lockdown migration", () => {
  const file = "20260930_harden_practice_rpc_security.sql";
  const src = readFileSync(join(migDir, file), "utf8");

  it("revokes execute from anon and authenticated", () => {
    assert.ok(/REVOKE ALL ON FUNCTION public\.consume_practice_daily_stage/.test(src));
    assert.ok(src.includes("FROM anon"));
    assert.ok(src.includes("FROM authenticated"));
  });

  it("grants execute only to service_role", () => {
    assert.ok(/GRANT EXECUTE ON FUNCTION public\.consume_practice_daily_stage[\s\S]*TO service_role/.test(src));
  });

  it("sets search_path on SECURITY DEFINER functions", () => {
    assert.ok(src.includes("SET search_path"));
  });
});

describe("admin sensitive table lockdown", () => {
  it("lockdown migration exists", () => {
    const names = readdirSync(migDir);
    assert.ok(names.some((n) => n.includes("lockdown_admin")));
  });
});
