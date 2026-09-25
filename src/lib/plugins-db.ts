/**
 * Shared Supabase client + resilient query for the Telegram plugin catalog.
 * Plugin binaries stay on Telegram; only metadata + latest-3 covers live here.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Progressive selects — try full first, then strip optional columns. */
const SELECTS = [
  "id,title,developer,version,category,formats,platforms,description,features,tags,telegram_photo_file_id,telegram_post_url,file_name,cover_storage_path,cover_public_url,created_at",
  "id,title,developer,version,category,formats,platforms,description,features,tags,telegram_photo_file_id,telegram_post_url,file_name,created_at",
  "id,title,developer,version,category,description,telegram_photo_file_id,telegram_post_url,file_name,created_at",
  "id,title,category,telegram_post_url,created_at",
  "id,title,created_at",
];

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
  const timeoutMs = 8000;
  const resilientFetch: typeof fetch = async (input, init) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      if (init?.signal) {
        if (init.signal.aborted) controller.abort();
        else init.signal.addEventListener("abort", () => controller.abort(), { once: true });
      }
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  };
  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: resilientFetch },
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
  if (/Failed to fetch|fetch failed|ECONNREFUSED|ENOTFOUND|network/i.test(detail)) {
    return "network_error";
  }
  return "plugin_query_failed";
}

/**
 * Load latest published plugins with progressive column fallback so partial
 * migrations still serve the catalog.
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
    // Only continue progressive fallback on missing-column errors.
    if (!/column .* does not exist/i.test(lastDetail)) {
      break;
    }
    console.warn("plugins_query_column_fallback", select.split(",")[0], lastDetail.slice(0, 160));
  }

  // Final minimal fallback: keep the published filter so a partial schema never
  // leaks processing/failed/hidden rows into the public catalog.
  const bare = await db
    .from("telegram_plugin_posts")
    .select("id,title,category,telegram_post_url,created_at")
    .eq("status", "published")
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
