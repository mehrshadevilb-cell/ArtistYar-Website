import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const bucket = process.env.SUPABASE_BUCKET || "artistyar-media";

const supabase = url && secret
  ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

/**
 * The media API is intentionally public-read. Storage itself is server-managed
 * with the service-role key, so the bucket must exist and be public before any
 * upload/list/delete operation can succeed reliably on a fresh Supabase project.
 */
export async function ensureMediaBucket(): Promise<void> {
  if (!supabase) throw new Error("supabase_not_configured");

  const current = await supabase.storage.getBucket(bucket);
  if (current.error) {
    const created = await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: "50MB",
    });

    if (created.error && !/already exists|duplicate|exists/i.test(created.error.message)) {
      throw new Error(`media_bucket_create_failed: ${created.error.message}`);
    }
    return;
  }

  if (!current.data?.public) {
    const updated = await supabase.storage.updateBucket(bucket, {
      public: true,
      fileSizeLimit: "50MB",
    });
    if (updated.error) throw new Error(`media_bucket_update_failed: ${updated.error.message}`);
  }
}

export function mediaBucketName(): string {
  return bucket;
}
