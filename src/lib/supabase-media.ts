import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const bucket = process.env.SUPABASE_BUCKET || "artistyar-media";
const configured = Boolean(url && secret);
const supabase = configured ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

export type MediaItem = {
  id: string;
  publicId: string;
  title: string;
  description: string;
  category: "student-work" | "free-training";
  kind: "image" | "video" | "audio" | "raw";
  format: string;
  resourceType: "image" | "video" | "raw";
  url: string;
  createdAt: string;
};
export type StorageItem = { path: string; name: string; mimeType: string; size: number; createdAt: string; url: string };

export function hasSupabase(): boolean { return configured; }
function clean(value: unknown, fallback = ""): string { return typeof value === "string" ? value.trim().slice(0, 500) : fallback; }
function toItem(row: Record<string, unknown>): MediaItem {
  const mime = String(row.mime_type || "");
  const ext = String(row.file_ext || "").toLowerCase();
  const kind = mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : mime.startsWith("audio/") || ["mp3", "wav", "m4a", "ogg", "flac", "aac"].includes(ext) ? "audio" : "raw";
  const resourceType = kind === "image" ? "image" : kind === "video" || kind === "audio" ? "video" : "raw";
  return { id: String(row.id), publicId: String(row.storage_path), title: clean(row.title), description: clean(row.description), category: row.category === "free-training" ? "free-training" : "student-work", kind, format: ext, resourceType, url: String(row.public_url), createdAt: String(row.created_at || "") };
}

export async function uploadMedia(input: { buffer: Buffer; filename: string; mimeType: string; title: string; description: string; category: "student-work" | "free-training"; consent: boolean }): Promise<MediaItem> {
  if (!supabase) throw new Error("supabase_not_configured");
  const ext = input.filename.toLowerCase().split(".").pop() || "bin";
  const path = `${input.category}/${crypto.randomUUID()}.${ext}`;
  const upload = await supabase.storage.from(bucket).upload(path, input.buffer, { contentType: input.mimeType || "application/octet-stream", upsert: false, cacheControl: "31536000" });
  if (upload.error) throw new Error(upload.error.message);
  const publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  const inserted = await supabase.from("media_assets").insert({ storage_path: path, public_url: publicUrl, title: input.title.trim().slice(0, 200), description: input.description.trim().slice(0, 1000), category: input.category, mime_type: input.mimeType, file_ext: ext, consent: input.consent, status: "published" }).select().single();
  if (inserted.error) { await supabase.storage.from(bucket).remove([path]); throw new Error(inserted.error.message); }
  return toItem(inserted.data);
}

export async function listPublishedMedia(): Promise<MediaItem[]> {
  if (!supabase) return [];
  const result = await supabase.from("media_assets").select("*").eq("status", "published").order("created_at", { ascending: false }).limit(100);
  if (result.error) throw new Error(result.error.message);
  return (result.data || []).map((row) => toItem(row));
}

export async function listStorageFiles(): Promise<StorageItem[]> {
  if (!supabase) return [];
  const folders = ["", "student-work", "free-training"];
  const results = await Promise.all(folders.map((folder) => supabase!.storage.from(bucket).list(folder, { limit: 100, sortBy: { column: "created_at", order: "desc" } })));
  return results.flatMap((result, index) => {
    if (result.error) throw new Error(result.error.message);
    const folder = folders[index];
    return (result.data || []).filter((file) => file.name !== ".emptyFolderPlaceholder").map((file) => { const path = folder ? `${folder}/${file.name}` : file.name; return { path, name: file.name, mimeType: String(file.metadata?.mimetype || "application/octet-stream"), size: Number(file.metadata?.size || 0), createdAt: String(file.created_at || ""), url: supabase!.storage.from(bucket).getPublicUrl(path).data.publicUrl }; });
  });
}

export async function registerExistingMedia(input: { publicId: string; title: string; description: string; category: "student-work" | "free-training"; consent: boolean; mimeType: string }) {
  if (!supabase) throw new Error("supabase_not_configured");
  const publicUrl = supabase.storage.from(bucket).getPublicUrl(input.publicId).data.publicUrl;
  const ext = input.publicId.toLowerCase().split(".").pop() || "bin";
  const result = await supabase.from("media_assets").upsert({ storage_path: input.publicId, public_url: publicUrl, title: input.title.trim().slice(0, 200), description: input.description.trim().slice(0, 1000), category: input.category, mime_type: input.mimeType, file_ext: ext, consent: input.consent, status: "published" }, { onConflict: "storage_path" }).select().single();
  if (result.error) throw new Error(result.error.message);
  return toItem(result.data);
}

export async function updateMedia(input: { publicId: string; title: string; description: string }) {
  if (!supabase) throw new Error("supabase_not_configured");
  const result = await supabase.from("media_assets").update({ title: input.title.trim().slice(0, 200), description: input.description.trim().slice(0, 1000), updated_at: new Date().toISOString() }).eq("storage_path", input.publicId).select().single();
  if (result.error) throw new Error(result.error.message);
  return toItem(result.data);
}

export async function deleteMedia(publicId: string) {
  if (!supabase) throw new Error("supabase_not_configured");
  const removed = await supabase.storage.from(bucket).remove([publicId]);
  if (removed.error) throw new Error(removed.error.message);
  const result = await supabase.from("media_assets").delete().eq("storage_path", publicId);
  if (result.error) throw new Error(result.error.message);
}
