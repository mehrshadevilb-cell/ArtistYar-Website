import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

const configured = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

if (configured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export type PublishedMedia = {
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
  tags: string[];
};

export function hasCloudinary(): boolean {
  return configured;
}

function safeValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim().slice(0, 500) : fallback;
}

export async function uploadMedia(input: {
  buffer: Buffer;
  filename: string;
  title: string;
  description: string;
  category: "student-work" | "free-training";
  consent: boolean;
  mimeType: string;
}): Promise<PublishedMedia> {
  if (!configured) throw new Error("cloudinary_not_configured");
  if (!input.consent && input.category === "student-work") throw new Error("student_consent_required");
  const folder = input.category === "student-work" ? "artistyar/student-work" : "artistyar/free-training";
  const extension = input.filename.toLowerCase().split(".").pop() || "";
  const imageExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);
  const mediaExtensions = new Set(["mp3", "wav", "m4a", "ogg", "flac", "aac", "mp4", "mov", "webm", "mkv"]);
  const resourceType = input.mimeType.startsWith("image/") || imageExtensions.has(extension) ? "image" : input.mimeType.startsWith("audio/") || input.mimeType.startsWith("video/") || mediaExtensions.has(extension) ? "video" : "raw";
  const context = {
    title: safeValue(input.title),
    description: safeValue(input.description),
    category: input.category,
    status: "published",
    consent: input.consent ? "true" : "false",
    original_filename: input.filename.slice(0, 180),
  };
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType, context, use_filename: true, unique_filename: true, overwrite: false },
      (error, response) => error || !response ? reject(error || new Error("cloudinary_upload_failed")) : resolve(response),
    );
    stream.end(input.buffer);
  });
  return toPublishedMedia(result);
}

function toPublishedMedia(resource: Record<string, unknown>): PublishedMedia {
  const context = (resource.context || {}) as Record<string, string>;
  const category = context.category === "free-training" ? "free-training" : "student-work";
  const kind = resource.resource_type === "image" ? "image" : ["mp3", "wav", "m4a", "ogg", "flac", "aac"].includes(String(resource.format).toLowerCase()) ? "audio" : resource.resource_type === "video" ? "video" : "raw";
  return {
    id: String(resource.asset_id || resource.public_id),
    publicId: String(resource.public_id),
    title: safeValue(context.title, String(resource.public_id).split("/").pop() || "محتوا"),
    description: safeValue(context.description),
    category,
    kind,
    format: String(resource.format || ""),
    resourceType: resource.resource_type === "video" ? "video" : resource.resource_type === "image" ? "image" : "raw",
    url: String(resource.secure_url || resource.url),
    createdAt: String(resource.created_at || ""),
    tags: category === "student-work" ? ["نمونه‌کار هنرجو"] : ["آموزش رایگان"],
  };
}

export async function listPublishedMedia(): Promise<PublishedMedia[]> {
  if (!configured) return [];
  const requests = (["image", "video", "raw"] as const).flatMap((resourceType) => ["artistyar/student-work", "artistyar/free-training"].map((prefix) => cloudinary.api.resources({ type: "upload", resource_type: resourceType, prefix, context: true, max_results: 100 })));
  const results = await Promise.all(requests);
  return results.flatMap((result) => (result.resources || []).filter((resource: Record<string, unknown>) => (resource.context as Record<string, string> | undefined)?.status === "published").map((resource: Record<string, unknown>) => toPublishedMedia(resource))).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateMedia(input: { publicId: string; resourceType: "image" | "video" | "raw"; title: string; description: string }) {
  if (!configured) throw new Error("cloudinary_not_configured");
  const result = await cloudinary.api.update(input.publicId, {
    resource_type: input.resourceType,
    context: { title: safeValue(input.title), description: safeValue(input.description), status: "published" },
  });
  return toPublishedMedia(result as Record<string, unknown>);
}

export async function deleteMedia(input: { publicId: string; resourceType: "image" | "video" | "raw" }) {
  if (!configured) throw new Error("cloudinary_not_configured");
  return cloudinary.uploader.destroy(input.publicId, { resource_type: input.resourceType, invalidate: true });
}
