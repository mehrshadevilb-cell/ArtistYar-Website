/**
 * Shared Supabase service client for Admin foundations.
 * Reuses existing env conventions. Never exposes secrets to the client.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

export function getServiceSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = (process.env.SUPABASE_URL || "").trim();
  const key = (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();

  if (!url || !key) {
    cached = null;
    return null;
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function hasAdminSupabase(): boolean {
  return getServiceSupabase() !== null;
}
