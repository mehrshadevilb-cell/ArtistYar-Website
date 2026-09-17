import { createClient } from "@supabase/supabase-js";
import { parseBuffer } from "music-metadata";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const bucket = process.env.SUPABASE_BUCKET || "artistyar-media";
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
};

const STORAGE_FOLDERS = ["", "student-work", "free-training", "ProdBy Mehrshad", "prodby-mehrshad"];

export function hasSupabase(): boolean {
  return configured;
}

export function normalizeCategory(value: unknown): MediaCategory {
  if (value === "free-training") return "free-training";
  if (value === "prodby-mehrshad") return "prodby-mehrshad";
  return "student-work";
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
    category: normalizeCategory(row.category),
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
): Promise<Omit<ExtractedAudioTags, "tag_title"> & { tag_title: string }> {
  const tags = await extractAudioTags(buffer, mimeType);

  try {
    const parsed = await parseBuffer(buffer, { mimeType: mimeType || "audio/mpeg" }, { duration: false });
    const picture = parsed.common.picture?.[0];
    if (picture?.data?.length) {
      const uploaded = await uploadCoverFromPicture(
        Buffer.from(picture.data),
        picture.format || "image/jpeg",
        category,
      );
      if (uploaded) tags.cover_url = uploaded;
    }
  } catch {
    // keep data-URL fallback from extractAudioTags
  }

  return tags;
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
  const ext = input.filename.toLowerCase().split(".").pop() || "bin";
  const folder = storageFolderForCategory(input.category);
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const upload = await supabase.storage.from(bucket).upload(path, input.buffer, {
    contentType: input.mimeType || "application/octet-stream",
    upsert: false,
    cacheControl: "31536000",
  });
  if (upload.error) throw new Error(upload.error.message);
  const publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

  const audio = await inspectAudio(input.buffer, input.mimeType, folder);
  const finalTitle =
    input.title.trim().length >= 3 ? input.title.trim().slice(0, 200) : audio.tag_title.slice(0, 200) || input.filename;

  const inserted = await supabase
    .from("media_assets")
    .insert({
      storage_path: path,
      public_url: publicUrl,
      title: finalTitle,
      description: input.description.trim().slice(0, 1000),
      category: input.category,
      mime_type: input.mimeType,
      file_ext: ext,
      artist: audio.artist,
      album: audio.album,
      genre: audio.genre,
      year: audio.year,
      duration: audio.duration,
      cover_url: audio.cover_url,
      consent: input.consent,
      status: "published",
    })
    .select()
    .single();

  if (inserted.error) {
    await supabase.storage.from(bucket).remove([path]);
    throw new Error(inserted.error.message);
  }
  return toItem(inserted.data);
}

export async function listPublishedMedia(): Promise<MediaItem[]> {
  if (!supabase) return [];
  const result = await supabase
    .from("media_assets")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(200);
  if (result.error) throw new Error(result.error.message);
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
  if (downloaded.error) throw new Error(downloaded.error.message);
  const buffer = Buffer.from(await downloaded.data.arrayBuffer());
  const folder = storageFolderForCategory(input.category);
  const audio = await inspectAudio(buffer, input.mimeType, folder);
  const finalTitle =
    input.title.trim().length >= 3 ? input.title.trim().slice(0, 200) : audio.tag_title.slice(0, 200) || input.publicId;

  const result = await supabase
    .from("media_assets")
    .upsert(
      {
        storage_path: input.publicId,
        public_url: publicUrl,
        title: finalTitle,
        description: input.description.trim().slice(0, 1000),
        category: input.category,
        mime_type: input.mimeType,
        file_ext: ext,
        artist: audio.artist,
        album: audio.album,
        genre: audio.genre,
        year: audio.year,
        duration: audio.duration,
        cover_url: audio.cover_url,
        consent: input.consent,
        status: "published",
      },
      { onConflict: "storage_path" },
    )
    .select()
    .single();
  if (result.error) throw new Error(result.error.message);
  return toItem(result.data);
}

/** Re-download file and re-extract MP3 tags + cover for an existing published asset. */
export async function refreshMediaTags(publicId: string): Promise<MediaItem> {
  if (!supabase) throw new Error("supabase_not_configured");

  const existing = await supabase.from("media_assets").select("*").eq("storage_path", publicId).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (!existing.data) throw new Error("media_not_found");

  const mimeType = String(existing.data.mime_type || "audio/mpeg");
  const category = normalizeCategory(existing.data.category);
  const folder = storageFolderForCategory(category);

  const downloaded = await supabase.storage.from(bucket).download(publicId);
  if (downloaded.error) throw new Error(downloaded.error.message);
  const buffer = Buffer.from(await downloaded.data.arrayBuffer());
  const audio = await inspectAudio(buffer, mimeType, folder);

  const result = await supabase
    .from("media_assets")
    .update({
      artist: audio.artist,
      album: audio.album,
      genre: audio.genre,
      year: audio.year,
      duration: audio.duration,
      cover_url: audio.cover_url,
      updated_at: new Date().toISOString(),
    })
    .eq("storage_path", publicId)
    .select()
    .single();

  if (result.error) throw new Error(result.error.message);
  return toItem(result.data);
}

export async function updateMedia(input: { publicId: string; title: string; description: string }) {
  if (!supabase) throw new Error("supabase_not_configured");
  const result = await supabase
    .from("media_assets")
    .update({
      title: input.title.trim().slice(0, 200),
      description: input.description.trim().slice(0, 1000),
      updated_at: new Date().toISOString(),
    })
    .eq("storage_path", input.publicId)
    .select()
    .single();
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
