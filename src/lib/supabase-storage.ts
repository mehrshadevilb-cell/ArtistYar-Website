import { createClient } from "@supabase/supabase-js";
import { isMissingBucketError, SupabaseOperationError } from "./supabase-error";

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
    if (!isMissingBucketError(current.error)) {
      throw new SupabaseOperationError("bucket_lookup", current.error);
    }
    const created = await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: "50MB",
    });

    if (created.error && !/already exists|duplicate|exists/i.test(created.error.message)) {
      throw new SupabaseOperationError("bucket_create", created.error);
    }
    return;
  }

  if (!current.data?.public) {
    const updated = await supabase.storage.updateBucket(bucket, {
      public: true,
      fileSizeLimit: "50MB",
    });
    if (updated.error) throw new SupabaseOperationError("bucket_update", updated.error);
  }
}

export async function probeMediaBucket(): Promise<{ name: string; public: boolean }> {
  if (!supabase) throw new Error("supabase_not_configured");
  const result = await supabase.storage.getBucket(bucket);
  if (result.error) throw new SupabaseOperationError("bucket_probe", result.error);
  return { name: result.data.name, public: Boolean(result.data.public) };
}

export function mediaBucketName(): string {
  return bucket;
}
