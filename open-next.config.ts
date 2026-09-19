import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext → Cloudflare Workers.
 * Optional: bind a KV namespace as NEXT_INC_CACHE_KV in wrangler for ISR cache.
 */
export default defineCloudflareConfig();
