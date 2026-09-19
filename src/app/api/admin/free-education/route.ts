import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  hasSupabase,
  listFreeLessonsAdmin,
  listFreeTrainingStorageFiles,
  registerFreeLessonFromStorage,
  updateFreeLesson,
  deleteFreeLesson,
  uploadStandaloneAsset,
} from "@/lib/supabase-media";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function authorized() {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  return Boolean(verifyAdminSession(session));
}

function jsonError(error: unknown, status = 502) {
  return NextResponse.json(
    { ok: false, error: error instanceof Error ? error.message : "عملیات ناموفق بود." },
    { status },
  );
}

export async function GET(request: Request) {
  if (!(await authorized())) return jsonError(new Error("نشست ادمین معتبر نیست."), 401);
  if (!hasSupabase()) return jsonError(new Error("Supabase تنظیم نشده است."), 503);
  try {
    const url = new URL(request.url);
    const storage = url.searchParams.get("source") === "storage";
    return NextResponse.json(storage ? await listFreeTrainingStorageFiles() : await listFreeLessonsAdmin());
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  if (!(await authorized())) return jsonError(new Error("نشست ادمین معتبر نیست."), 401);
  if (!hasSupabase()) return jsonError(new Error("Supabase تنظیم نشده است."), 503);

  try {
    const form = await request.formData();
    const mode = String(form.get("mode") || "upload");
    const title = String(form.get("title") || "").trim();
    if (title.length < 3) return jsonError(new Error("عنوان آموزش حداقل ۳ کاراکتر باشد."), 400);

    let videoPath = String(form.get("videoPath") || "").trim();
    let thumbnailUrl = String(form.get("thumbnailUrl") || "").trim() || null;

    // Client may already have uploaded via signed URL (direct-to-storage).
    // Prefer that path; only stream through the server when a File is present.
    if (mode === "upload" && !videoPath) {
      const video = form.get("video");
      if (!(video instanceof File) || video.size <= 0) {
        return jsonError(new Error("فایل ویدیو را انتخاب کنید."), 400);
      }
      const videoAsset = await uploadStandaloneAsset({
        buffer: Buffer.from(await video.arrayBuffer()),
        filename: video.name || "lesson.mp4",
        mimeType: video.type || "video/mp4",
        kind: "video",
      });
      videoPath = videoAsset.path;

      const thumbnail = form.get("thumbnail");
      if (thumbnail instanceof File && thumbnail.size > 0) {
        const imageAsset = await uploadStandaloneAsset({
          buffer: Buffer.from(await thumbnail.arrayBuffer()),
          filename: thumbnail.name || "thumbnail.jpg",
          mimeType: thumbnail.type || "image/jpeg",
          kind: "thumbnail",
        });
        thumbnailUrl = imageAsset.url;
      }
    } else if (mode === "upload" && videoPath) {
      // Optional server-side thumbnail if client only pre-uploaded the video.
      const thumbnail = form.get("thumbnail");
      if (thumbnail instanceof File && thumbnail.size > 0 && !thumbnailUrl) {
        const imageAsset = await uploadStandaloneAsset({
          buffer: Buffer.from(await thumbnail.arrayBuffer()),
          filename: thumbnail.name || "thumbnail.jpg",
          mimeType: thumbnail.type || "image/jpeg",
          kind: "thumbnail",
        });
        thumbnailUrl = imageAsset.url;
      }
    }

    if (mode === "storage" && !videoPath) {
      return jsonError(new Error("ویدیویی از Storage انتخاب نشده است."), 400);
    }

    if (!videoPath) return jsonError(new Error("ویدیوی آموزش انتخاب نشده است."), 400);

    const item = await registerFreeLessonFromStorage({
      publicId: videoPath,
      title,
      description: String(form.get("description") || ""),
      thumbnailUrl,
      sortOrder: Number(form.get("sortOrder") || 0),
    });
    return NextResponse.json({ ok: true, item, message: "آموزش رایگان با موفقیت ثبت شد." });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  if (!(await authorized())) return jsonError(new Error("نشست ادمین معتبر نیست."), 401);
  try {
    const body = await request.json();
    const item = await updateFreeLesson({
      publicId: String(body.publicId || ""),
      title: String(body.title || ""),
      description: String(body.description || ""),
      thumbnailUrl: body.thumbnailUrl ? String(body.thumbnailUrl) : null,
      chapters: Array.isArray(body.chapters) ? body.chapters : [],
      sortOrder: Number(body.sortOrder || 0),
      isActive: body.isActive !== false,
    });
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  if (!(await authorized())) return jsonError(new Error("نشست ادمین معتبر نیست."), 401);
  try {
    const body = await request.json();
    await deleteFreeLesson(String(body.publicId || ""), Boolean(body.removeFile));
    return NextResponse.json({ ok: true, message: "آموزش حذف شد." });
  } catch (error) {
    return jsonError(error);
  }
}
