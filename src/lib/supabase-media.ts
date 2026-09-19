import { createClient } from "@supabase/supabase-js";
import { parseBuffer } from "music-metadata";
import { SupabaseOperationError } from "./supabase-error";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const bucket = process.env.SUPABASE_BUCKET || "artistyar-media";
const STORAGE_FILE_LIMIT = process.env.SUPABASE_STORAGE_FILE_LIMIT || "50MB";
const configured = Boolean(url && secret);
const supabase = configured ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

export type MediaCategory = "student-work" | "free-training" | "prodby-mehrshad";
export type MediaItem = { id: string; publicId: string; title: string; description: string; category: MediaCategory; kind: "image" | "video" | "audio" | "raw"; format: string; resourceType: "image" | "video" | "raw"; url: string; createdAt: string; artist: string; album: string; genre: string; year: number | null; duration: number | null; coverUrl: string | null; isActive: boolean; };
export type StorageItem = { path: string; name: string; mimeType: string; size: number; createdAt: string; url: string; };

export function hasSupabase(): boolean { return configured; }
export function normalizeCategory(value: unknown): MediaCategory | null {
  if (value === "free-training" || value === "prodby-mehrshad" || value === "student-work") return value;
  return null;
}

function clean(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim().slice(0, 500) : fallback;
}

function toItem(row: Record<string, unknown>): MediaItem {
  const mime = String(row.mime_type || "");
  const ext = String(row.file_ext || "").toLowerCase();
  const kind = mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : mime.startsWith("audio/") || ["mp3", "wav", "m4a", "ogg", "flac", "aac"].includes(ext) ? "audio" : "raw";
  const resourceType = kind === "image" ? "image" : kind === "video" ? "video" : "raw";
  return { id: String(row.id), publicId: String(row.storage_path), title: clean(row.title), description: clean(row.description), category: normalizeCategory(row.category) || "student-work", kind, format: ext, resourceType, url: String(row.public_url), createdAt: String(row.created_at || ""), artist: clean(row.artist), album: clean(row.album), genre: clean(row.genre), year: row.year ? Number(row.year) : null, duration: row.duration ? Number(row.duration) : null, coverUrl: row.cover_url ? String(row.cover_url) : null, isActive: row.is_active !== false };
}

export async function listPublishedMedia(): Promise<MediaItem[]> {
  if (!supabase) return [];
  const result = await supabase.from("media_assets").select("*").eq("status", "published").order("created_at", { ascending: false }).limit(200);
  if (result.error) throw new SupabaseOperationError("media_list", result.error);
  return (result.data || []).filter((row) => row.is_active !== false).map((row) => toItem(row));
}

export async function listStorageFiles(): Promise<StorageItem[]> {
  if (!supabase) return [];
  const folders = ["", "student-work", "free-training", "ProdBy Mehrshad", "prodby-mehrshad"];
  const out: StorageItem[] = [];
  const seen = new Set<string>();
  for (const folder of folders) {
    const result = await supabase.storage.from(bucket).list(folder, { limit: 500, sortBy: { column: "created_at", order: "desc" } });
    if (result.error) continue;
    for (const file of result.data || []) {
      if (!file.name || file.name === ".emptyFolderPlaceholder") continue;
      const path = folder ? folder + "/" + file.name : file.name;
      if (seen.has(path)) continue;
      seen.add(path);
      out.push({ path, name: file.name, mimeType: String(file.metadata?.mimetype || "application/octet-stream"), size: Number(file.metadata?.size || 0), createdAt: String(file.created_at || ""), url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl });
    }
  }
  return out;
}

export async function registerExistingMedia(input: { publicId: string; title: string; description: string; category: MediaCategory; consent: boolean; mimeType: string; }): Promise<MediaItem> {
  if (!supabase) throw new Error("supabase_not_configured");
  const publicUrl = supabase.storage.from(bucket).getPublicUrl(input.publicId).data.publicUrl;
  const ext = input.publicId.toLowerCase().split(".").pop() || "bin";
  const slash = input.publicId.lastIndexOf("/");
  const objectFolder = slash >= 0 ? input.publicId.slice(0, slash) : "";
  const objectName = slash >= 0 ? input.publicId.slice(slash + 1) : input.publicId;
  let found = false;
  const listed = await supabase.storage.from(bucket).list(objectFolder, { limit: 1000 });
  if (!listed.error && (listed.data || []).some((entry) => entry.name === objectName)) found = true;
  else {
    const signed = await supabase.storage.from(bucket).createSignedUrl(input.publicId, 30);
    if (!signed.error && signed.data?.signedUrl) found = true;
  }
  if (!found) throw new Error("media_object_not_found: فایل در Storage پیدا نشد. مسیر باید دقیقاً همان نام داخل bucket باشد (مثلاً student-work/clip.mp4).");
  const result = await supabase.from("media_assets").upsert({ storage_path: input.publicId, public_url: publicUrl, title: input.title.trim().slice(0, 200), description: input.description.trim().slice(0, 1000), category: input.category, mime_type: input.mimeType || "application/octet-stream", file_ext: ext, consent: input.consent, status: "published" }, { onConflict: "storage_path" }).select().single();
  if (result.error) throw new SupabaseOperationError("media_register", result.error);
  return toItem(result.data);
}

export async function uploadMedia(input: { buffer: Buffer; filename: string; mimeType: string; title: string; description: string; category: MediaCategory; consent: boolean; }): Promise<MediaItem> {
  if (!supabase) throw new Error("supabase_not_configured");
  const ext = input.filename.toLowerCase().split(".").pop() || "bin";
  const folder = input.category === "prodby-mehrshad" ? "ProdBy Mehrshad" : input.category;
  const path = folder + "/" + crypto.randomUUID() + "." + ext;
  const upload = await supabase.storage.from(bucket).upload(path, input.buffer, { contentType: input.mimeType || "application/octet-stream", upsert: false, cacheControl: "31536000" });
  if (upload.error) throw new SupabaseOperationError("media_upload", upload.error);
  const publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  const inserted = await supabase.from("media_assets").insert({ storage_path: path, public_url: publicUrl, title: input.title.trim().slice(0, 200), description: input.description.trim().slice(0, 1000), category: input.category, mime_type: input.mimeType, file_ext: ext, consent: input.consent, status: "published" }).select().single();
  if (inserted.error) { await supabase.storage.from(bucket).remove([path]); throw new SupabaseOperationError("media_register", inserted.error); }
  return toItem(inserted.data);
}

export async function replaceMediaFile(input: { publicId: string; buffer: Buffer; filename: string; mimeType: string; }): Promise<MediaItem> {
  if (!supabase) throw new Error("supabase_not_configured");
  const existing = await supabase.from("media_assets").select("*").eq("storage_path", input.publicId).maybeSingle();
  if (existing.error) throw new SupabaseOperationError("media_lookup", existing.error);
  if (!existing.data) throw new Error("media_not_found");
  const uploaded = await supabase.storage.from(bucket).upload(input.publicId, input.buffer, { contentType: input.mimeType, upsert: true, cacheControl: "3600" });
  if (uploaded.error) throw new SupabaseOperationError("media_replace_file", uploaded.error);
  const publicUrl = supabase.storage.from(bucket).getPublicUrl(input.publicId).data.publicUrl;
  const ext = input.filename.toLowerCase().split(".").pop() || String(existing.data.file_ext || "bin");
  const result = await supabase.from("media_assets").update({ public_url: publicUrl, mime_type: input.mimeType, file_ext: ext, updated_at: new Date().toISOString() }).eq("storage_path", input.publicId).select().single();
  if (result.error) throw new SupabaseOperationError("media_replace_meta", result.error);
  return toItem(result.data);
}

export async function updateMedia(input: { publicId: string; title: string; description: string; category?: MediaCategory; isActive?: boolean; }): Promise<MediaItem> {
  if (!supabase) throw new Error("supabase_not_configured");
  const patch: Record<string, unknown> = { title: input.title.trim().slice(0, 200), description: input.description.trim().slice(0, 1000), updated_at: new Date().toISOString() };
  if (input.category) patch.category = input.category;
  if (typeof input.isActive === "boolean") patch.is_active = input.isActive;
  const result = await supabase.from("media_assets").update(patch).eq("storage_path", input.publicId).select().single();
  if (result.error) throw new SupabaseOperationError("media_update", result.error);
  return toItem(result.data);
}

export async function deleteMedia(publicId: string): Promise<void> {
  if (!supabase) throw new Error("supabase_not_configured");
  const removed = await supabase.storage.from(bucket).remove([publicId]);
  if (removed.error) throw new SupabaseOperationError("media_delete_file", removed.error);
  const result = await supabase.from("media_assets").delete().eq("storage_path", publicId);
  if (result.error) throw new SupabaseOperationError("media_delete_record", result.error);
}

export async function refreshMediaTags(publicId: string): Promise<MediaItem> {
  if (!supabase) throw new Error("supabase_not_configured");
  const existing = await supabase.from("media_assets").select("*").eq("storage_path", publicId).maybeSingle();
  if (existing.error) throw new SupabaseOperationError("media_lookup", existing.error);
  if (!existing.data) throw new Error("media_not_found");
  return toItem(existing.data);
}

export async function createStandaloneUploadTicket(input: { filename: string; mimeType: string; kind: "video" | "thumbnail" }) {
  if (!supabase) throw new Error("supabase_not_configured");
  const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180) || (input.kind === "video" ? "lesson.mp4" : "thumbnail.jpg");
  const ext = safeName.toLowerCase().split(".").pop() || (input.kind === "video" ? "mp4" : "jpg");
  const path = "free-training-assets/" + input.kind + "/" + crypto.randomUUID() + "." + ext;
  const signed = await supabase.storage.from(bucket).createSignedUploadUrl(path, { upsert: false });
  if (signed.error) throw new SupabaseOperationError("signed_upload_url", signed.error);
  return { path, signedUrl: signed.data.signedUrl, publicUrl: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl, mimeType: input.mimeType || (input.kind === "video" ? "video/mp4" : "image/jpeg") };
}

export async function uploadStandaloneAsset(input: { buffer: Buffer; filename: string; mimeType: string; kind: "video" | "thumbnail" }) {
  if (!supabase) throw new Error("supabase_not_configured");
  const ext = input.filename.toLowerCase().split(".").pop() || (input.kind === "video" ? "mp4" : "webp");
  const path = "free-training-assets/" + input.kind + "/" + crypto.randomUUID() + "." + ext;
  const upload = await supabase.storage.from(bucket).upload(path, input.buffer, { contentType: input.mimeType || "application/octet-stream", upsert: false, cacheControl: "31536000" });
  if (upload.error) throw new Error(upload.error.message);
  return { path, url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl, mimeType: input.mimeType, size: input.buffer.length };
}

export async function probeMediaConnection(): Promise<{ bucket: string; bucketPublic: boolean }> {
  if (!supabase) throw new Error("supabase_not_configured");
  const bucketResult = await supabase.storage.getBucket(bucket);
  if (bucketResult.error) throw new SupabaseOperationError("bucket_probe", bucketResult.error);
  return { bucket, bucketPublic: Boolean(bucketResult.data.public) };
}


export type FreeLessonAdmin = {
  id: string; publicId: string; title: string; description: string; videoUrl: string;
  thumbnailUrl: string | null; duration: number | null; chapters: Array<{ title: string; time: number }>;
  sortOrder: number; isActive: boolean; createdAt: string; updatedAt: string;
};

function toFreeLesson(row: Record<string, unknown>): FreeLessonAdmin {
  return {
    id: String(row.id), publicId: String(row.storage_path), title: clean(row.title), description: clean(row.description),
    videoUrl: String(row.public_url || ""), thumbnailUrl: row.cover_url ? String(row.cover_url) : null,
    duration: row.duration ? Number(row.duration) : null,
    chapters: Array.isArray(row.chapters) ? row.chapters as Array<{ title: string; time: number }> : [],
    sortOrder: Number(row.sort_order || 0), isActive: row.is_active !== false,
    createdAt: String(row.created_at || ""), updatedAt: String(row.updated_at || row.created_at || ""),
  };
}

export async function listFreeLessonsAdmin(): Promise<FreeLessonAdmin[]> {
  if (!supabase) return [];
  const result = await supabase.from("media_assets").select("*").eq("category", "free-training").order("sort_order", { ascending: true }).order("created_at", { ascending: false }).limit(500);
  if (result.error) throw new SupabaseOperationError("free_lessons_list", result.error);
  return (result.data || []).map((row) => toFreeLesson(row));
}

export async function listFreeTrainingStorageFiles(): Promise<StorageItem[]> {
  if (!supabase) return [];
  const folders = ["free-training-assets/video", "free-training", "Free Training"];
  const out: StorageItem[] = [];
  const seen = new Set<string>();
  for (const folder of folders) {
    const result = await supabase.storage.from(bucket).list(folder, { limit: 500, sortBy: { column: "created_at", order: "desc" } });
    if (result.error) continue;
    for (const file of result.data || []) {
      const mime = String(file.metadata?.mimetype || "");
      if (!file.name || file.name === ".emptyFolderPlaceholder" || (mime && !mime.startsWith("video/"))) continue;
      const path = folder + "/" + file.name;
      if (seen.has(path)) continue;
      seen.add(path);
      out.push({ path, name: file.name, mimeType: mime || "video/mp4", size: Number(file.metadata?.size || 0), createdAt: String(file.created_at || ""), url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl });
    }
  }
  return out;
}

export async function registerFreeLessonFromStorage(input: { publicId: string; title: string; description: string; thumbnailUrl?: string | null; sortOrder: number }): Promise<FreeLessonAdmin> {
  if (!supabase) throw new Error("supabase_not_configured");
  const exists = await supabase.storage.from(bucket).createSignedUrl(input.publicId, 60);
  if (exists.error || !exists.data?.signedUrl) throw new Error("media_object_not_found");
  const publicUrl = supabase.storage.from(bucket).getPublicUrl(input.publicId).data.publicUrl;
  const ext = input.publicId.toLowerCase().split(".").pop() || "mp4";
  const result = await supabase.from("media_assets").upsert({ storage_path: input.publicId, public_url: publicUrl, title: input.title.trim().slice(0, 200), description: input.description.trim().slice(0, 1000), category: "free-training", mime_type: "video/" + ext, file_ext: ext, cover_url: input.thumbnailUrl || null, sort_order: input.sortOrder, is_active: true, status: "published" }, { onConflict: "storage_path" }).select().single();
  if (result.error) throw new SupabaseOperationError("free_lesson_register", result.error);
  return toFreeLesson(result.data);
}

export async function updateFreeLesson(input: { publicId: string; title: string; description: string; thumbnailUrl: string | null; chapters: Array<{ title: string; time: number }>; sortOrder: number; isActive: boolean }): Promise<FreeLessonAdmin> {
  if (!supabase) throw new Error("supabase_not_configured");
  const result = await supabase.from("media_assets").update({ title: input.title.trim().slice(0, 200), description: input.description.trim().slice(0, 1000), cover_url: input.thumbnailUrl || null, chapters: input.chapters, sort_order: input.sortOrder, is_active: input.isActive, category: "free-training", updated_at: new Date().toISOString() }).eq("storage_path", input.publicId).eq("category", "free-training").select().single();
  if (result.error) throw new SupabaseOperationError("free_lesson_update", result.error);
  return toFreeLesson(result.data);
}

export async function deleteFreeLesson(publicId: string, removeFile: boolean): Promise<void> {
  if (!supabase) throw new Error("supabase_not_configured");
  if (removeFile) {
    const removed = await supabase.storage.from(bucket).remove([publicId]);
    if (removed.error) throw new SupabaseOperationError("free_lesson_delete_file", removed.error);
  }
  const result = await supabase.from("media_assets").delete().eq("storage_path", publicId).eq("category", "free-training");
  if (result.error) throw new SupabaseOperationError("free_lesson_delete", result.error);
}
