/**
 * Shared Supabase client + resilient query for the Telegram plugin catalog.
 * Plugin binaries stay on Telegram; only metadata + latest-3 covers live here.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const CORE_SELECT =
  "id,title,developer,version,category,formats,platforms,description,features,tags,telegram_photo_file_id,telegram_post_url,file_name,created_at";
const COVER_SELECT = "cover_storage_path,cover_public_url";
const FULL_SELECT = CORE_SELECT + "," + COVER_SELECT;

function envUrl() {
  return (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).trim();
}

function envKey() {
  return (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();
}

let cached: SupabaseClient | null | undefined;

export function getPluginsDb(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = envUrl();
  const key = envKey();
  if (!url || !key) {
    cached = null;
    return null;
  }
  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}

export type PluginCatalogRow = {
  id: string;
  title: string;
  developer?: string | null;
  version?: string | null;
  category: string;
  formats?: string[];
  platforms?: string[];
  description?: string;
  features?: string[];
  tags?: string[];
  telegram_photo_file_id?: string | null;
  telegram_post_url?: string | null;
  file_name?: string | null;
  cover_storage_path?: string | null;
  cover_public_url?: string | null;
  created_at: string;
};

export type PluginQueryResult = {
  items: PluginCatalogRow[];
  unavailable: boolean;
  errorCode?: string;
  errorDetail?: string;
};

/**
 * Load latest published plugins. Falls back to a core column set if cover
 * columns are missing (migration not yet applied).
 */
export async function queryLatestPlugins(limit = 3): Promise<PluginQueryResult> {
  const db = getPluginsDb();
  if (!db) {
    return {
      items: [],
      unavailable: true,
      errorCode: "supabase_not_configured",
      errorDetail: "SUPABASE_URL or service role key missing",
    };
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 3, 1), 3);

  const run = async (select: string) =>
    db
      .from("telegram_plugin_posts")
      .select(select)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(safeLimit);

  let result = await run(FULL_SELECT);

  if (result.error) {
    const msg = result.error.message || "";
    const missingCover =
      /cover_storage_path|cover_public_url|column .* does not exist/i.test(msg);
    if (missingCover) {
      console.warn("plugins_query_cover_columns_missing_fallback", msg.slice(0, 200));
      result = await run(CORE_SELECT);
    }
  }

  if (result.error) {
    const detail = result.error.message || String(result.error);
    console.error("plugins_query_failed", detail.slice(0, 400));
    const tableMissing = /relation .* does not exist|could not find the table/i.test(detail);
    return {
      items: [],
      unavailable: true,
      errorCode: tableMissing ? "table_missing" : "plugin_query_failed",
      errorDetail: detail.slice(0, 240),
    };
  }

  const rows = (result.data || []) as PluginCatalogRow[];
  return { items: rows, unavailable: false };
}
