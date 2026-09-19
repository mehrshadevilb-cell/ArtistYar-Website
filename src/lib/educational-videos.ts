import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
export const EDUCATION_BUCKET = process.env.SUPABASE_EDUCATION_BUCKET || process.env.SUPABASE_BUCKET || "artistyar-media";
const supabase = url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

export type EducationLesson = {
  id: string;
  course_id: number;
  title: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type EducationVideo = {
  id: string;
  course_id: number;
  lesson_id: string;
  title: string;
  description: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  file_size: number | null;
  duration_seconds: number | null;
  thumbnail_path: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function educationConfigured() { return Boolean(supabase); }

function requireClient() {
  if (!supabase) throw new Error("supabase_not_configured");
  return supabase;
}

export async function listEducationLessons(courseId?: number) {
  const db = requireClient();
  let q = db.from("educational_lessons").select("*").order("sort_order").order("created_at");
  if (courseId) q = q.eq("course_id", courseId);
  const result = await q;
  if (result.error) throw new Error(result.error.message);
  return (result.data || []) as EducationLesson[];
}

export async function createEducationLesson(input: { courseId: number; title: string; description?: string; sortOrder?: number }) {
  const db = requireClient();
  const result = await db.from("educational_lessons").insert({
    course_id: input.courseId,
    title: input.title.trim(),
    description: (input.description || "").trim(),
    sort_order: input.sortOrder || 0,
    is_active: true,
  }).select("*").single();
  if (result.error) throw new Error(result.error.message);
  return result.data as EducationLesson;
}

export async function updateEducationLesson(id: string, input: { title: string; description?: string; sortOrder?: number; isActive?: boolean }) {
  const db = requireClient();
  const result = await db.from("educational_lessons").update({
    title: input.title.trim(),
    description: (input.description || "").trim(),
    sort_order: input.sortOrder ?? 0,
    ...(typeof input.isActive === "boolean" ? { is_active: input.isActive } : {}),
    updated_at: new Date().toISOString(),
  }).eq("id", id).select("*").single();
  if (result.error) throw new Error(result.error.message);
  return result.data as EducationLesson;
}

export async function deleteEducationLesson(id: string) {
  const db = requireClient();
  const result = await db.from("educational_lessons").delete().eq("id", id);
  if (result.error) throw new Error(result.error.message);
}

export async function listEducationVideos(courseId?: number, lessonId?: string) {
  const db = requireClient();
  let q = db.from("educational_videos").select("*").order("sort_order").order("created_at");
  if (courseId) q = q.eq("course_id", courseId);
  if (lessonId) q = q.eq("lesson_id", lessonId);
  const result = await q;
  if (result.error) throw new Error(result.error.message);
  return (result.data || []) as EducationVideo[];
}

export async function createEducationVideo(input: Omit<EducationVideo, "id"|"created_at"|"updated_at">) {
  const db = requireClient();
  const result = await db.from("educational_videos").upsert({
    ...input,
    storage_bucket: input.storage_bucket || EDUCATION_BUCKET,
  }, { onConflict: "storage_bucket,storage_path" }).select("*").single();
  if (result.error) throw new Error(result.error.message);
  return result.data as EducationVideo;
}

export async function updateEducationVideo(id: string, input: Partial<Pick<EducationVideo, "title"|"description"|"lesson_id"|"course_id"|"sort_order"|"thumbnail_path"|"is_active"|"duration_seconds">>) {
  const db = requireClient();
  const result = await db.from("educational_videos").update({
    ...input,
    updated_at: new Date().toISOString(),
  }).eq("id", id).select("*").single();
  if (result.error) throw new Error(result.error.message);
  return result.data as EducationVideo;
}

export async function deleteEducationVideo(id: string) {
  const db = requireClient();
  const existing = await db.from("educational_videos").select("*").eq("id", id).single();
  if (existing.error) throw new Error(existing.error.message);
  const result = await db.from("educational_videos").delete().eq("id", id);
  if (result.error) throw new Error(result.error.message);
  // Never delete the Storage object automatically. Existing educational files may
  // be shared with other content and the user explicitly requires data safety.
  return existing.data as EducationVideo;
}

export async function listEducationStorageVideos() {
  const db = requireClient();
  const roots = ["", "free-training", "free-training-assets", "educational-videos", "courses"];
  const found: { path:string; name:string; size:number; mimeType:string; createdAt:string }[] = [];
  async function walk(folder:string, depth:number): Promise<void> {
    if (depth > 4) return;
    const result = await db.storage.from(EDUCATION_BUCKET).list(folder, {
      limit: 1000,
      sortBy: { column: "created_at", order: "desc" },
    });
    if (result.error) return;
    for (const item of result.data || []) {
      if (!item.name || item.name === ".emptyFolderPlaceholder") continue;
      const path = folder ? folder + "/" + item.name : item.name;
      const mime = String(item.metadata?.mimetype || "");
      const lower = item.name.toLowerCase();
      const isVideo = mime.startsWith("video/") || [".mp4",".webm",".mov",".m4v"].some(ext => lower.endsWith(ext));
      if (isVideo && item.metadata) {
        found.push({
          path,
          name: item.name,
          size: Number(item.metadata.size || 0),
          mimeType: mime || "video/mp4",
          createdAt: String(item.created_at || ""),
        });
      } else if (!item.metadata && !item.id?.endsWith("/")) {
        await walk(path, depth + 1);
      }
    }
  }
  await Promise.all(roots.map(root => walk(root, 0)));
  return Array.from(new Map(found.map(item => [item.path, item])).values());
}

