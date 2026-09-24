/**
 * Shared Supabase client + resilient query for the Telegram plugin catalog.
 * Plugin binaries stay on Telegram; only metadata + latest-3 covers live here.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { withTimeout } from "@/lib/with-timeout";

/** Progressive selects — try full first, then strip optional columns. */
const SELECTS = [
  "id,title,developer,version,category,formats,platforms,description,features,tags,telegram_photo_file_id,telegram_post_url,file_name,cover_storage_path,cover_public_url,created_at",
  "id,title,developer,version,category,formats,platforms,description,features,tags,telegram_photo_file_id,telegram_post_url,file_name,created_at",
  "id,title,developer,version,category,description,telegram_photo_file_id,telegram_post_url,file_name,created_at",
  "id,title,category,telegram_post_url,created_at",
  "id,title,created_at",
];

/** Catalog is optional on the homepage — hard cap so SSR cannot hang. */
const PLUGINS_QUERY_TIMEOUT_MS = 2500;

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
    process.env.SUPABASE_SERVICE_KEY ||
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
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: init?.signal ?? AbortSignal.timeout(PLUGINS_QUERY_TIMEOUT_MS),
        }),
    },
  });
  return cached;
}

export function pluginsDbConfigured(): boolean {
  return Boolean(envUrl() && envKey());
}

export type PluginCatalogRow = {
  id: string;
  title: string;
  developer?: string | null;
  version?: string | null;
  category?: string;
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

function classifyError(detail: string): string {
  if (/relation .* does not exist|could not find the table|schema cache/i.test(detail)) {
    return "table_missing";
  }
  if (/column .* does not exist/i.test(detail)) {
    return "schema_mismatch";
  }
  if (/permission denied|not authorized|JWT|invalid api key|Invalid API key/i.test(detail)) {
    return "permission_denied";
  }
  if (
    /Failed to fetch|fetch failed|ECONNREFUSED|ENOTFOUND|network|aborted|timeout/i.test(
      detail,
    )
  ) {
    return "network_error";
  }
  return "plugin_query_failed";
}

async function queryLatestPluginsInner(limit: number): Promise<PluginQueryResult> {
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
  let lastDetail = "";

  for (const select of SELECTS) {
    const result = await db
      .from("telegram_plugin_posts")
      .select(select)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (!result.error) {
      const items = (result.data ?? []) as unknown as PluginCatalogRow[];
      return { items, unavailable: false };
    }

    lastDetail = result.error.message || String(result.error);
    if (!/column .* does not exist/i.test(lastDetail)) {
      break;
    }
    console.warn(
      "plugins_query_column_fallback",
      select.split(",")[0],
      lastDetail.slice(0, 160),
    );
  }

  const bare = await db
    .from("telegram_plugin_posts")
    .select("id,title,created_at")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (!bare.error) {
    const rows = ((bare.data || []) as unknown as PluginCatalogRow[]).map((row) => ({
      ...row,
      category: row.category || "other",
    }));
    return { items: rows, unavailable: false };
  }

  lastDetail = bare.error.message || lastDetail || String(bare.error);
  console.error("plugins_query_failed", lastDetail.slice(0, 400));
  return {
    items: [],
    unavailable: true,
    errorCode: classifyError(lastDetail),
    errorDetail: lastDetail.slice(0, 240),
  };
}

/**
 * Load latest published plugins with progressive column fallback so partial
 * migrations still serve the catalog. Hard timeout so homepage SSR stays fast.
 */
export async function queryLatestPlugins(limit = 3): Promise<PluginQueryResult> {
  return withTimeout(
    queryLatestPluginsInner(limit),
    PLUGINS_QUERY_TIMEOUT_MS,
    () => ({
      items: [],
      unavailable: true,
      errorCode: "network_error",
      errorDetail: `plugins query timed out after ${PLUGINS_QUERY_TIMEOUT_MS}ms`,
    }),
    "queryLatestPlugins",
  );
}

/** Admin/diagnostics helper — never returns secrets. */
export async function probePluginsCatalog(): Promise<{
  configured: boolean;
  ok: boolean;
  count: number;
  errorCode?: string;
  errorDetail?: string;
}> {
  if (!pluginsDbConfigured()) {
    return { configured: false, ok: false, count: 0, errorCode: "supabase_not_configured" };
  }
  const result = await queryLatestPlugins(3);
  return {
    configured: true,
    ok: !result.unavailable,
    count: result.items.length,
    errorCode: result.errorCode,
    errorDetail: result.errorDetail,
  };
}
