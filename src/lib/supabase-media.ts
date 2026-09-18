import { createClient } from "@supabase/supabase-js";
import { parseBuffer } from "music-metadata";
import { SupabaseOperationError } from "./supabase-error";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const bucket = process.env.SUPABASE_BUCKET || "artistyar-media";
const STORAGE_FILE_LIMIT = "1GB";
const configured = Boolean(url && secret);
const supabase = configured
  ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export type MediaCategory = "student-work" | "free-training" | "prodby-mehrshad";

export type MediaItem = {
  id: string;
  publicId: string;
  title: string;
  description: string;
  category: MediaCategory;
  kind: "image" | "video" | "audio" | "raw";
  format: string;
  resourceType: "image" | "video" | "raw";
  url: string;
  createdAt: string;
  artist: string;
  album: string;
  genre: string;
  year: number | null;
  duration: number | null;
  coverUrl: string | null;
  isActive: boolean;
};

export type StorageItem = {
  path: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
  url: string;
};

type ExtractedAudioTags = {
  artist: string;
  album: string;
  genre: string;
  year: number | null;
  duration: number | null;
  cover_url: string | null;
  tag_title: string;
  cover_data: Buffer | null;
  cover_format: string;
};

const STORAGE_FOLDERS = ["", "student-work", "free-training", "ProdBy Mehrshad", "prodby-mehrshad"];

export function hasSupabase(): boolean {
  return configured;
}

async function ensureStorageBucket(): Promise<void> {
  if (!supabase) throw new Error("supabase_not_configured");
  const current = await supabase.storage.getBucket(bucket);

  if (current.error) {
    const created = await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: STORAGE_FILE_LIMIT,
    });
    if (created.error && !/already exists|duplicate|exists/i.test(created.error.message)) {
      throw new SupabaseOperationError("bucket_create", created.error);
    }
    return;
  }

  if (!current.data?.public || String(current.data?.file_size_limit || "") !== STORAGE_FILE_LIMIT) {
    const updated = await supabase.storage.updateBucket(bucket, {
      public: true,
      fileSizeLimit: STORAGE_FILE_LIMIT,
    });
    if (updated.error) throw new SupabaseOperationError("bucket_update", updated.error);
  }
}

export async function probeMediaConnection(): Promise<{ bucket: string; bucketPublic: boolean }> {
  if (!supabase) throw new Error("supabase_not_configured");

  const bucketResult = await supabase.storage.getBucket(bucket);
  if (bucketResult.error) throw new SupabaseOperationError("bucket_probe", bucketResult.error);

  const tableResult = await supabase.from("media_assets").select("id").limit(1);
  if (tableResult.error) throw new SupabaseOperationError("media_table_probe", tableResult.error);

  return { bucket, bucketPublic: Boolean(bucketResult.data.public) };
}

export function normalizeCategory(value: unknown): MediaCategory | null {
  if (value === "free-training") return "free-training";
  if (value === "prodby-mehrshad") return "prodby-mehrshad";
  if (value === "student-work") return "student-work";
  return null;
}

function clean(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim().slice(0, 500) : fallback;
}

function toItem(row: Record<string, unknown>): MediaItem {
  const mime = String(row.mime_type || "");
  const ext = String(row.file_ext || "").toLowerCase();
  const kind = mime.startsWith("image/")
    ? "image"
    : mime.startsWith("video/")
      ? "video"
      : mime.startsWith("audio/") || ["mp3", "wav", "m4a", "ogg", "flac", "aac"].includes(ext)
        ? "audio"
        : "raw";
  const resourceType = kind === "image" ? "image" : kind === "video" || kind === "audio" ? "video" : "raw";
  return {
    id: String(row.id),
    publicId: String(row.storage_path),
    title: clean(row.title),
    description: clean(row.description),
    category: normalizeCategory(row.category) || "student-work",
    kind,
    format: ext,
    resourceType,
    url: String(row.public_url),
    createdAt: String(row.created_at || ""),
    artist: clean(row.artist),
    album: clean(row.album),
    genre: clean(row.genre),
    year: row.year ? Number(row.year) : null,
    duration: row.duration ? Number(row.duration) : null,
    coverUrl: row.cover_url ? String(row.cover_url) : null,
    isActive: row.is_active !== false,
  };
}

/** Extract ID3 / common tags + embedded cover from an audio buffer. */
export async function extractAudioTags(
  buffer: Buffer,
  mimeType: string,
): Promise<ExtractedAudioTags> {
  const empty: ExtractedAudioTags = {
    artist: "",
    album: "",
    genre: "",
    year: null,
    duration: null,
    cover_url: null,
    tag_title: "",
    cover_data: null,
    cover_format: "image/jpeg",
  };

  const isAudio =
    mimeType.startsWith("audio/") ||
    ["mp3", "mpeg", "wav", "wave", "m4a", "mp4", "ogg", "flac", "aac", "x-m4a"].some((ext) =>
      mimeType.toLowerCase().includes(ext),
    );

  if (!isAudio || buffer.length < 64) return empty;

  try {
    const parsed = await parseBuffer(buffer, { mimeType: mimeType || "audio/mpeg" }, { duration: true });
    const picture = parsed.common.picture?.[0];

    let cover_url: string | null = null;
    if (picture?.data?.length) {
      const b64 = Buffer.from(picture.data).toString("base64");
      if (b64.length < 400_000) {
        const format = picture.format || "image/jpeg";
        cover_url = `data:${format};base64,${b64}`;
      }
    }

    const yearRaw = parsed.common.year ?? parsed.common.date;
    let year: number | null = null;
    if (typeof yearRaw === "number") year = yearRaw;
    else if (typeof yearRaw === "string") {
      const m = yearRaw.match(/\d{4}/);
      if (m) year = Number(m[0]);
    }

    return {
      artist: clean(parsed.common.artist || parsed.common.albumartist || ""),
      album: clean(parsed.common.album || ""),
      genre: clean(Array.isArray(parsed.common.genre) ? parsed.common.genre[0] : parsed.common.genre || ""),
      year,
      duration: parsed.format.duration ? Math.round(parsed.format.duration) : null,
      cover_url,
      tag_title: clean(parsed.common.title || ""),
      cover_data: picture?.data?.length && picture.data.length < 300_000 ? Buffer.from(picture.data) : null,
      cover_format: picture?.format || "image/jpeg",
    };
  } catch (error) {
    console.warn("extractAudioTags failed", error);
    return empty;
  }
}

async function uploadCoverFromPicture(
  pictureData: Buffer,
  mimeFormat: string,
  category: string,
): Promise<string | null> {
  if (!supabase || pictureData.length < 32) return null;
  const ext = mimeFormat.includes("png") ? "png" : mimeFormat.includes("webp") ? "webp" : "jpg";
  const path = `${category}/covers/${crypto.randomUUID()}.${ext}`;
  const contentType = mimeFormat.startsWith("image/") ? mimeFormat : `image/${ext === "jpg" ? "jpeg" : ext}`;
  const upload = await supabase.storage.from(bucket).upload(path, pictureData, {
    contentType,
    upsert: false,
    cacheControl: "31536000",
  });
  if (upload.error) {
    console.warn("cover upload failed", upload.error.message);
    return null;
  }
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

async function inspectAudio(
  buffer: Buffer,
  mimeType: string,
  category: string,
): Promise<ExtractedAudioTags> {
  const empty: ExtractedAudioTags = {
    artist: "",
    album: "",
    genre: "",
    year: null,
    duration: null,
    cover_url: null,
    tag_title: "",
    cover_data: null,
    cover_format: "image/jpeg",
  };
  const tags = await Promise.race([
    extractAudioTags(buffer, mimeType),
    new Promise<ExtractedAudioTags>((resolve) => setTimeout(() => resolve(empty), 8_000)),
  ]);
  if (tags.cover_data) {
    const uploaded = await uploadCoverFromPicture(tags.cover_data, tags.cover_format, category);
    if (uploaded) tags.cover_url = uploaded;
  }
  return tags;
}

const OPTIONAL_METADATA_FIELDS = ["artist", "album", "genre", "year", "duration", "cover_url"] as const;

function isMissingSchemaColumn(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message || "")
        : String(error);
  return /could not find the [^\n]* column|column .* does not exist|schema cache/i.test(message);
}

function withoutOptionalMetadata(payload: Record<string, unknown>): Record<string, unknown> {
  const core = { ...payload };
  for (const field of OPTIONAL_METADATA_FIELDS) delete core[field];
  return core;
}

async function insertMediaAsset(payload: Record<string, unknown>) {
  let result = await supabase!.from("media_assets").insert(payload).select().single();
  if (result.error && isMissingSchemaColumn(result.error)) {
    console.warn("media_assets schema is missing optional metadata columns; retrying with core columns");
    result = await supabase!.from("media_assets").insert(withoutOptionalMetadata(payload)).select().single();
  }
  return result;
}

async function upsertMediaAsset(payload: Record<string, unknown>) {
  // Register the core asset first. Optional ID3 fields must never prevent
  // Content Management from registering an otherwise valid Storage object.
  const corePayload = withoutOptionalMetadata(payload);
  let result = await supabase!.from("media_assets").upsert(corePayload, { onConflict: "storage_path" }).select().single();
  if (result.error) return result;

  const metadata = Object.fromEntries(
    OPTIONAL_METADATA_FIELDS
      .filter((field) => field in payload)
      .map((field) => [field, payload[field]]),
  );
  if (Object.keys(metadata).length) {
    const tagged = await supabase!
      .from("media_assets")
      .update(metadata)
      .eq("storage_path", String(payload.storage_path))
      .select()
      .single();

    // A stale PostgREST schema cache or an older media_assets table is
    // tolerated here; the core registration has already succeeded.
    if (!tagged.error) return tagged;
    if (!isMissingSchemaColumn(tagged.error)) console.warn("media metadata update skipped:", tagged.error.message);
  }
  return result;
}

async function updateMediaAsset(publicId: string, payload: Record<string, unknown>) {
  let result = await supabase!.from("media_assets").update(payload).eq("storage_path", publicId).select().single();
  if (result.error && isMissingSchemaColumn(result.error)) {
    console.warn("media_assets schema is missing optional metadata columns; retrying tag update with core columns");
    result = await supabase!
      .from("media_assets")
      .update({ updated_at: new Date().toISOString() })
      .eq("storage_path", publicId)
      .select()
      .single();
  }
  return result;
}

function storageFolderForCategory(category: MediaCategory): string {
  if (category === "prodby-mehrshad") return "ProdBy Mehrshad";
  return category;
}

export async function uploadMedia(input: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  title: string;
  description: string;
  category: MediaCategory;
  consent: boolean;
}): Promise<MediaItem> {
  if (!supabase) throw new Error("supabase_not_configured");
  await ensureStorageBucket();
  const ext = input.filename.toLowerCase().split(".").pop() || "bin";
  const folder = storageFolderForCategory(input.category);
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const upload = await supabase.storage.from(bucket).upload(path, input.buffer, {
    contentType: input.mimeType || "application/octet-stream",
    upsert: false,
    cacheControl: "31536000",
  });
  if (upload.error) throw new SupabaseOperationError("media_upload", upload.error);
  const publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

  const audio = await inspectAudio(input.buffer, input.mimeType, folder);
  const finalTitle =
    input.title.trim().length >= 3 ? input.title.trim().slice(0, 200) : audio.tag_title.slice(0, 200) || input.filename;

  const inserted = await insertMediaAsset({
    storage_path: path,
    public_url: publicUrl,
    title: finalTitle,
    description: input.description.trim().slice(0, 1000),
    category: input.category,
    mime_type: input.mimeType,
    file_ext: ext,
    artist: audio.artist,
    genre: audio.genre,
    year: audio.year,
    duration: audio.duration,
    cover_url: audio.cover_url,
    consent: input.consent,
    status: "published",
  });

  if (inserted.error) {
    await supabase.storage.from(bucket).remove([path]);
    throw new SupabaseOperationError("media_register", inserted.error);
  }
  return toItem(inserted.data);
}

export async function uploadStandaloneAsset(input: { buffer: Buffer; filename: string; mimeType: string; kind: "video" | "thumbnail" }) {
  if (!supabase) throw new Error("supabase_not_configured");
  await ensureStorageBucket();
  const ext = input.filename.toLowerCase().split(".").pop() || (input.kind === "video" ? "mp4" : "webp");
  const path = `free-training-assets/${input.kind}/${crypto.randomUUID()}.${ext}`;
  const upload = await supabase.storage.from(bucket).upload(path, input.buffer, {
    contentType: input.mimeType || "application/octet-stream",
    upsert: false,
    cacheControl: "31536000",
  });
  if (upload.error) throw new Error(upload.error.message);
  return { path, url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl, mimeType: input.mimeType, size: input.buffer.length };
}

export async function listPublishedMedia(): Promise<MediaItem[]> {
  if (!supabase) return [];
  const result = await supabase
    .from("media_assets")
    .select("*")
    .eq("status", "published")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(200);
  if (result.error) throw new SupabaseOperationError("media_list", result.error);
  return (result.data || []).map((row) => toItem(row));
}

export async function listStorageFiles(): Promise<StorageItem[]> {
  if (!supabase) return [];
  const results = await Promise.all(
    STORAGE_FOLDERS.map((folder) =>
      supabase!.storage.from(bucket).list(folder, { limit: 200, sortBy: { column: "created_at", order: "desc" } }),
    ),
  );
  return results.flatMap((result, index) => {
    if (result.error) {
      console.warn("storage list failed", STORAGE_FOLDERS[index], result.error.message);
      return [];
    }
    const folder = STORAGE_FOLDERS[index];
    return (result.data || [])
      .filter((file) => file.name !== ".emptyFolderPlaceholder" && !file.name.endsWith("/"))
      .filter((file) => Boolean(file.metadata || file.id))
      .map((file) => {
        const path = folder ? `${folder}/${file.name}` : file.name;
        return {
          path,
          name: file.name,
          mimeType: String(file.metadata?.mimetype || "application/octet-stream"),
          size: Number(file.metadata?.size || 0),
          createdAt: String(file.created_at || ""),
          url: supabase!.storage.from(bucket).getPublicUrl(path).data.publicUrl,
        };
      });
  });
}

export async function registerExistingMedia(input: {
  publicId: string;
  title: string;
  description: string;
  category: MediaCategory;
  consent: boolean;
  mimeType: string;
}) {
  if (!supabase) throw new Error("supabase_not_configured");
  const publicUrl = supabase.storage.from(bucket).getPublicUrl(input.publicId).data.publicUrl;
  const ext = input.publicId.toLowerCase().split(".").pop() || "bin";
  const downloaded = await supabase.storage.from(bucket).download(input.publicId);
  if (downloaded.error) throw new SupabaseOperationError("media_download", downloaded.error);
  const buffer = Buffer.from(await downloaded.data.arrayBuffer());
  const folder = storageFolderForCategory(input.category);
  const audio = await inspectAudio(buffer, input.mimeType, folder);
  const finalTitle =
    input.title.trim().length >= 3 ? input.title.trim().slice(0, 200) : audio.tag_title.slice(0, 200) || input.publicId;

  const result = await upsertMediaAsset({
    storage_path: input.publicId,
    public_url: publicUrl,
    title: finalTitle,
    description: input.description.trim().slice(0, 1000),
    category: input.category,
    mime_type: input.mimeType,
    file_ext: ext,
    artist: audio.artist,
    genre: audio.genre,
    year: audio.year,
    duration: audio.duration,
    cover_url: audio.cover_url,
    consent: input.consent,
    status: "published",
  });
  if (result.error) throw new SupabaseOperationError("media_register", result.error);
  return toItem(result.data);
}

/** Re-download file and re-extract MP3 tags + cover for an existing published asset. */
export async function refreshMediaTags(publicId: string): Promise<MediaItem> {
  if (!supabase) throw new Error("supabase_not_configured");

  const existing = await supabase.from("media_assets").select("*").eq("storage_path", publicId).maybeSingle();
  if (existing.error) throw new SupabaseOperationError("media_lookup", existing.error);
  if (!existing.data) throw new Error("media_not_found");

  const mimeType = String(existing.data.mime_type || "audio/mpeg");
  const category = normalizeCategory(existing.data.category) || "student-work";
  const folder = storageFolderForCategory(category);

  const downloaded = await supabase.storage.from(bucket).download(publicId);
  if (downloaded.error) throw new SupabaseOperationError("media_download", downloaded.error);
  const buffer = Buffer.from(await downloaded.data.arrayBuffer());
  const audio = await inspectAudio(buffer, mimeType, folder);

  const result = await updateMediaAsset(publicId, {
    artist: audio.artist,
    genre: audio.genre,
    year: audio.year,
    duration: audio.duration,
    cover_url: audio.cover_url,
    updated_at: new Date().toISOString(),
  });

  if (result.error) throw new SupabaseOperationError("media_tag_update", result.error);
  return toItem(result.data);
}

export async function updateMedia(input: { publicId: string; title: string; description: string; category?: MediaCategory; isActive?: boolean }) {
  if (!supabase) throw new Error("supabase_not_configured");
  const patch: Record<string, unknown> = {
    title: input.title.trim().slice(0, 200),
    description: input.description.trim().slice(0, 1000),
    updated_at: new Date().toISOString(),
  };
  if (input.category) patch.category = input.category;
  if (typeof input.isActive === "boolean") {
    patch.is_active = input.isActive;
    patch.status = input.isActive ? "published" : "draft";
  }
  const result = await supabase
    .from("media_assets")
    .update(patch)
    .eq("storage_path", input.publicId)
    .select()
    .single();
  if (result.error) throw new SupabaseOperationError("media_update", result.error);
  return toItem(result.data);
}

export async function replaceMediaFile(input: { publicId: string; buffer: Buffer; filename: string; mimeType: string }) {
  if (!supabase) throw new Error("supabase_not_configured");
  const existing = await supabase.from("media_assets").select("*").eq("storage_path", input.publicId).maybeSingle();
  if (existing.error) throw new SupabaseOperationError("media_lookup", existing.error);
  if (!existing.data) throw new Error("media_not_found");

  const uploaded = await supabase.storage.from(bucket).upload(input.publicId, input.buffer, {
    contentType: input.mimeType,
    upsert: true,
    cacheControl: "3600",
  });
  if (uploaded.error) throw new SupabaseOperationError("media_replace_file", uploaded.error);

  const publicUrl = supabase.storage.from(bucket).getPublicUrl(input.publicId).data.publicUrl;
  const ext = input.filename.toLowerCase().split(".").pop() || String(existing.data.file_ext || "bin");
  const result = await supabase.from("media_assets").update({
    public_url: publicUrl,
    mime_type: input.mimeType,
    file_ext: ext,
    updated_at: new Date().toISOString(),
  }).eq("storage_path", input.publicId).select().single();
  if (result.error) throw new SupabaseOperationError("media_replace_record", result.error);
  return toItem(result.data);
}

export async function deleteMedia(publicId: string) {
  if (!supabase) throw new Error("supabase_not_configured");
  const removed = await supabase.storage.from(bucket).remove([publicId]);
  if (removed.error) throw new SupabaseOperationError("media_delete_file", removed.error);
  const result = await supabase.from("media_assets").delete().eq("storage_path", publicId);
  if (result.error) throw new SupabaseOperationError("media_delete_record", result.error);
}


export type FreeLessonChapter = { title: string; time: number };

export type FreeLessonAdminItem = {
  id: string;
  publicId: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  chapters: FreeLessonChapter[];
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function freeLessonFromRow(row: Record<string, unknown>): FreeLessonAdminItem {
  const chapters = Array.isArray(row.chapters)
    ? row.chapters
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          title: clean((item as Record<string, unknown>).title),
          time: Math.max(0, Number((item as Record<string, unknown>).time) || 0),
        }))
        .filter((item) => item.title)
    : [];
  return {
    id: String(row.id),
    publicId: String(row.storage_path),
    title: clean(row.title),
    description: clean(row.description),
    videoUrl: String(row.public_url || ""),
    thumbnailUrl: row.cover_url ? String(row.cover_url) : null,
    duration: row.duration ? Number(row.duration) : null,
    chapters,
    sortOrder: Number(row.sort_order) || 0,
    isActive: row.status === "published" && row.is_active !== false,
    createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || row.created_at || ""),
  };
}

export async function listFreeLessonsAdmin(): Promise<FreeLessonAdminItem[]> {
  if (!supabase) throw new Error("supabase_not_configured");
  const result = await supabase
    .from("media_assets")
    .select("*")
    .eq("category", "free-training")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(500);
  if (result.error) throw new SupabaseOperationError("free_lessons_list", result.error);
  return (result.data || []).map((row) => freeLessonFromRow(row));
}

export async function registerFreeLessonFromStorage(input: {
  publicId: string;
  title: string;
  description: string;
  thumbnailUrl?: string | null;
  sortOrder?: number;
}) {
  if (!supabase) throw new Error("supabase_not_configured");
  const existing = await supabase.from("media_assets").select("id").eq("storage_path", input.publicId).maybeSingle();
  if (existing.error) throw new SupabaseOperationError("free_lesson_lookup", existing.error);
  if (existing.data) {
    const updated = await supabase.from("media_assets").update({
      category: "free-training",
      title: input.title.trim().slice(0, 200),
      description: input.description.trim().slice(0, 1000),
      cover_url: input.thumbnailUrl || null,
      sort_order: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0,
      is_active: true,
      status: "published",
      updated_at: new Date().toISOString(),
    }).eq("storage_path", input.publicId).select().single();
    if (updated.error) throw new SupabaseOperationError("free_lesson_register", updated.error);
    return freeLessonFromRow(updated.data);
  }

  const info = await supabase.storage.from(bucket).list(input.publicId.includes("/") ? input.publicId.split("/").slice(0, -1).join("/") : "", { limit: 1 });
  const fileName = input.publicId.split("/").pop() || input.publicId;
  const file = (info.data || []).find((item) => item.name === fileName);
  const mimeType = String(file?.metadata?.mimetype || "video/mp4");
  const publicUrl = supabase.storage.from(bucket).getPublicUrl(input.publicId).data.publicUrl;
  const result = await supabase.from("media_assets").insert({
    storage_path: input.publicId,
    public_url: publicUrl,
    title: input.title.trim().slice(0, 200),
    description: input.description.trim().slice(0, 1000),
    category: "free-training",
    mime_type: mimeType,
    file_ext: (fileName.split(".").pop() || "mp4").toLowerCase(),
    cover_url: input.thumbnailUrl || null,
    consent: true,
    status: "published",
    sort_order: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0,
    is_active: true,
    chapters: [],
  }).select().single();
  if (result.error) throw new SupabaseOperationError("free_lesson_register", result.error);
  return freeLessonFromRow(result.data);
}

export async function updateFreeLesson(input: {
  publicId: string;
  title: string;
  description: string;
  thumbnailUrl?: string | null;
  chapters?: FreeLessonChapter[];
  sortOrder?: number;
  isActive?: boolean;
}) {
  if (!supabase) throw new Error("supabase_not_configured");
  const result = await supabase.from("media_assets").update({
    title: input.title.trim().slice(0, 200),
    description: input.description.trim().slice(0, 1000),
    cover_url: input.thumbnailUrl || null,
    chapters: Array.isArray(input.chapters) ? input.chapters.slice(0, 100) : [],
    sort_order: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0,
    is_active: input.isActive !== false,
    status: input.isActive === false ? "draft" : "published",
    updated_at: new Date().toISOString(),
  }).eq("storage_path", input.publicId).eq("category", "free-training").select().single();
  if (result.error) throw new SupabaseOperationError("free_lesson_update", result.error);
  return freeLessonFromRow(result.data);
}

export async function deleteFreeLesson(publicId: string, removeFile = false) {
  if (!supabase) throw new Error("supabase_not_configured");
  const result = await supabase.from("media_assets").delete().eq("storage_path", publicId).eq("category", "free-training");
  if (result.error) throw new SupabaseOperationError("free_lesson_delete", result.error);
  if (removeFile) {
    const removed = await supabase.storage.from(bucket).remove([publicId]);
    if (removed.error) throw new SupabaseOperationError("free_lesson_delete_file", removed.error);
  }
}

export async function listFreeTrainingStorageFiles(): Promise<StorageItem[]> {
  if (!supabase) return [];
  const folders = ["free-training", "free-training-assets/video", ""];
  const results = await Promise.all(folders.map((folder) =>
    supabase!.storage.from(bucket).list(folder, { limit: 500, sortBy: { column: "created_at", order: "desc" } })
  ));
  const seen = new Set<string>();
  return results.flatMap((result, index) => {
    if (result.error) return [];
    const folder = folders[index];
    return (result.data || [])
      .filter((file) => file.name !== ".emptyFolderPlaceholder" && !file.name.endsWith("/"))
      .filter((file) => String(file.metadata?.mimetype || "").startsWith("video/"))
      .map((file) => {
        const path = folder ? `${folder}/${file.name}` : file.name;
        if (seen.has(path)) return null;
        seen.add(path);
        return {
          path,
          name: file.name,
          mimeType: String(file.metadata?.mimetype || "video/mp4"),
          size: Number(file.metadata?.size || 0),
          createdAt: String(file.created_at || ""),
          url: supabase!.storage.from(bucket).getPublicUrl(path).data.publicUrl,
        };
      })
      .filter(Boolean) as StorageItem[];
  });
}
