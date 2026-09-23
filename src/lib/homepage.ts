import { createClient } from "@supabase/supabase-js";
import {
  DEFAULT_HOMEPAGE,
  mergeHomepageConfig,
  type HomepageConfig,
} from "@/data/homepage";

const SETTINGS_KEY = "homepage_v1";

function client() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const secret =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !secret) return null;
  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getHomepageConfig(): Promise<HomepageConfig> {
  const sb = client();
  if (!sb) return structuredClone(DEFAULT_HOMEPAGE);
  try {
    const { data, error } = await sb
      .from("site_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();
    if (error || !data?.value) return structuredClone(DEFAULT_HOMEPAGE);
    return mergeHomepageConfig(data.value);
  } catch {
    return structuredClone(DEFAULT_HOMEPAGE);
  }
}

export async function saveHomepageConfig(
  config: HomepageConfig,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = client();
  if (!sb) return { ok: false, error: "supabase_not_configured" };
  const merged = mergeHomepageConfig(config);
  try {
    const { error } = await sb.from("site_settings").upsert(
      {
        key: SETTINGS_KEY,
        value: merged,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "save_failed" };
  }
}
