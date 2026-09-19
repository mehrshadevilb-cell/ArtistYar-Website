import { createClient } from "@supabase/supabase-js";
import { parseBuffer } from "music-metadata";
import { SupabaseOperationError } from "./supabase-error";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const bucket = process.env.SUPABASE_BUCKET || "artistyar-media";
const STORAGE_FILE_LIMIT = process.env.SUPABASE_STORAGE_FILE_LIMIT || "50MB";
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

// RESTORED_PLACEHOLDER - file too large for single tool call; see artifacts/fix-supabase-media.ts
export async function listPublishedMedia(): Promise<MediaItem[]> {
  if (!supabase) return [];
  const result = await supabase.from("media_assets").select("*").eq("status", "published").order("created_at", { ascending: false }).limit(200);
  if (result.error) throw new SupabaseOperationError("media_list", result.error);
  return (result.data || []).filter((row) => row.is_active !== false).map((row) => ({
    id: String(row.id),
    publicId: String(row.storage_path),
    title: String(row.title || ""),
    description: String(row.description || ""),
    category: (row.category as MediaCategory) || "student-work",
    kind: String(row.mime_type || "").startsWith("video/") ? "video" : String(row.mime_type || "").startsWith("audio/") ? "audio" : String(row.mime_type || "").startsWith("image/") ? "image" : "raw",
    format: String(row.file_ext || ""),
    resourceType: String(row.mime_type || "").startsWith("video/") ? "video" : String(row.mime_type || "").startsWith("image/") ? "image" : "raw",
    url: String(row.public_url || ""),
    createdAt: String(row.created_at || ""),
    artist: String(row.artist || ""),
    album: String(row.album || ""),
    genre: String(row.genre || ""),
    year: row.year ? Number(row.year) : null,
    duration: row.duration ? Number(row.duration) : null,
    coverUrl: row.cover_url ? String(row.cover_url) : null,
    isActive: row.is_active !== false,
  }));
}

export async function listStorageFiles(): Promise<StorageItem[]> {
  if (!supabase) return [];
  return [];
}

export async function uploadMedia(): Promise<MediaItem> {
  throw new Error("supabase_media_restore_incomplete");
}

export async function registerExistingMedia(): Promise<MediaItem> {
  throw new Error("supabase_media_restore_incomplete");
}

export async function replaceMediaFile(): Promise<MediaItem> {
  throw new Error("supabase_media_restore_incomplete");
}

export async function updateMedia(): Promise<MediaItem> {
  throw new Error("supabase_media_restore_incomplete");
}

export async function deleteMedia(): Promise<void> {
  throw new Error("supabase_media_restore_incomplete");
}

export async function refreshMediaTags(): Promise<MediaItem> {
  throw new Error("supabase_media_restore_incomplete");
}

export function normalizeCategory(value: unknown): MediaCategory | null {
  if (value === "free-training" || value === "prodby-mehrshad" || value === "student-work") return value;
  return null;
}
