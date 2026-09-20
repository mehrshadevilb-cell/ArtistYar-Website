import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  deleteMedia,
  hasSupabase,
  listPublishedMedia,
  listStorageFiles,
  normalizeCategory,
  registerExistingMedia,
  refreshMediaTags,
  updateMedia,
  replaceMediaFile,
  uploadMedia,
  type MediaCategory,
} from "@/lib/supabase-media";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import { supabaseErrorHttpStatus, supabaseErrorPayload } from "@/lib/supabase-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const allowedCategories = new Set<MediaCategory>(["student-work", "free-training", "prodby-mehrshad"]);

const mimeByExt: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  opus: "audio/opus",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  pdf: "application/pdf",
};

function resolveMime(file: File): string {
  const reported = (file.type || "").trim();
  if (reported && reported !== "application/octet-stream") return reported;
  const ext = file.name.toLowerCase().split(".").pop() || "";
  return mimeByExt[ext] || reported || "application/octet-stream";
}

function folderForCategory(category: MediaCategory): string {
  return category === "prodby-mehrshad" ? "ProdBy Mehrshad" : category;
}

/**
 * Storage paths used by the media uploader over time. Keep this allowlist
 * narrow: the admin may register an existing object, but never an arbitrary
 * path from another bucket folder.
 */
function storagePrefixesForCategory(category: MediaCategory): string[] {
  if (category === "free-training") {
    return ["free-training/", "free-training-assets/", "free-training-assets/video/"];
  }
  if (category === "prodby-mehrshad") {
    return ["ProdBy Mehrshad/", "prodby-mehrshad/"];
  }
  return ["student-work/"];
}

function isAllowedStoragePath(publicId: string, category: MediaCategory): boolean {
  if (publicId.startsWith("/") || publicId.includes("..") || publicId.includes("\\") || publicId.endsWith("/")) return false;
  return storagePrefixesForCategory(category).some((prefix) => publicId.startsWith(prefix));
}

async function authorized(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return Boolean(verifyAdminSession(session));
}

function errorResponse(error: unknown, fallback: string, operation: string): NextResponse {
  console.error(`supabase media ${operation} failed`, error);
  return NextResponse.json(supabaseErrorPayload(error, fallback), { status: supabaseErrorHttpStatus(error) });
}

export async function GET(request: Request) {
  if (!hasSupabase()) return NextResponse.json({ configured: false, items: [] });
  try {
    const source = new URL(request.url).searchParams.get("source");
    if (source === "storage") {
      if (!(await authorized()))
        return NextResponse.json({ configured: true, items: [], error: "دسترسی مدیریت معتبر نیست." }, { status: 401 });
      return NextResponse.json({ configured: true, items: await listStorageFiles() });
    }
    return NextResponse.json(
      { configured: true, items: await listPublishedMedia() },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    const payload = supabaseErrorPayload(error, "دریافت محتوای منتشرشده ناموفق بود.");
    return NextResponse.json({ configured: true, items: [], ...payload }, { status: supabaseErrorHttpStatus(error) });
  }
}

export async function POST(request: Request) {
  if (!(await authorized())) return NextResponse.json({ ok: false, error: "دسترسی مدیریت معتبر نیست. دوباره وارد حساب ادمین شو." }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ ok: false, error: "اتصال Supabase هنوز تنظیم نشده است." }, { status: 503 });
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_FILE_SIZE + 2 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "حجم درخواست از سقف ۵۰ مگابایت بیشتر است." }, { status: 413 });
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json(
        { ok: false, error: "خواندن فایل ناموفق بود. حجم فایل را کمتر از ۵۰ مگابایت نگه دار و دوباره تلاش کن." },
        { status: 400 },
      );
    }

    const file = form.get("file");
    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "").trim();
    const category = normalizeCategory(form.get("category"));
    const consent = form.get("consent") === "true" || category === "prodby-mehrshad" || category === "free-training";

    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "فایل را انتخاب کنید." }, { status: 400 });
    if (!title || title.length < 3) return NextResponse.json({ ok: false, error: "عنوان محتوا را کامل وارد کنید." }, { status: 400 });
    if (!category || !allowedCategories.has(category)) return NextResponse.json({ ok: false, error: "دسته‌بندی معتبر نیست." }, { status: 400 });
    if (category === "student-work" && !consent)
      return NextResponse.json({ ok: false, error: "برای انتشار نمونه‌کار هنرجو، تأیید رضایت لازم است." }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_FILE_SIZE)
      return NextResponse.json({ ok: false, error: "حجم فایل باید بین ۱ بایت و ۵۰ مگابایت باشد." }, { status: 400 });

    const mimeType = resolveMime(file);
    const item = await uploadMedia({
      buffer: Buffer.from(await file.arrayBuffer()),
      filename: file.name || `upload.${mimeType.split("/")[1] || "bin"}`,
      mimeType,
      title,
      description,
      category,
      consent,
    });
    return NextResponse.json({
      ok: true,
      item,
      message: "محتوا با موفقیت در Supabase آپلود و منتشر شد.",
    });
  } catch (error) {
    return errorResponse(error, "آپلود در Supabase ناموفق بود.", "upload");
  }
}

export async function PUT(request: Request) {
  if (!(await authorized())) return NextResponse.json({ ok: false, error: "دسترسی مدیریت معتبر نیست." }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ ok: false, error: "اتصال Supabase هنوز تنظیم نشده است." }, { status: 503 });
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const action = String(form.get("action") || "");
      const publicId = String(form.get("publicId") || "").trim();
      const file = form.get("file");
      if (action !== "replace-file" || !publicId || !(file instanceof File)) {
        return NextResponse.json({ ok: false, error: "فایل و شناسه معتبر لازم است." }, { status: 400 });
      }
      if (file.size <= 0 || file.size > MAX_FILE_SIZE) return NextResponse.json({ ok: false, error: "حجم فایل باید حداکثر ۵۰ مگابایت باشد." }, { status: 400 });
      const item = await replaceMediaFile({
        publicId,
        buffer: Buffer.from(await file.arrayBuffer()),
        filename: file.name || "replacement",
        mimeType: resolveMime(file),
      });
      return NextResponse.json({ ok: true, item, message: "فایل با موفقیت جایگزین شد." });
    }

    const body = await request.json();
    const publicId = String(body.publicId || "").trim();
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const category = normalizeCategory(body.category);
    const consent = body.consent === true || category === "prodby-mehrshad" || category === "free-training";

    if (!publicId) return NextResponse.json({ ok: false, error: "شناسه فایل لازم است." }, { status: 400 });
    if (body.action === "refresh-tags") {
      const item = await refreshMediaTags(publicId);
      return NextResponse.json({ ok: true, item, message: "تگ‌های MP3 و کاور دوباره استخراج و ذخیره شدند." });
    }
    if (body.action === "register") {
      if (title.length < 3) return NextResponse.json({ ok: false, error: "عنوان معتبر لازم است." }, { status: 400 });
      if (!category) return NextResponse.json({ ok: false, error: "دسته‌بندی معتبر نیست." }, { status: 400 });
      if (category === "student-work" && !consent)
        return NextResponse.json({ ok: false, error: "برای نمونه‌کار هنرجو، تأیید رضایت لازم است." }, { status: 400 });
      if (!isAllowedStoragePath(publicId, category)) {
        return NextResponse.json({ ok: false, error: "مسیر Storage برای این دسته‌بندی معتبر نیست." }, { status: 400 });
      }
      const item = await registerExistingMedia({
        publicId,
        title,
        description,
        category,
        consent,
        mimeType: String(body.mimeType || "application/octet-stream"),
      });
      return NextResponse.json({ ok: true, item, message: "فایل موجود در گالری ثبت شد. تگ‌ها استخراج شدند." });
    }
    if (title.length < 3) return NextResponse.json({ ok: false, error: "شناسه و عنوان معتبر لازم است." }, { status: 400 });
    const item = await updateMedia({ publicId, title, description, category: category || undefined, isActive: typeof body.isActive === "boolean" ? body.isActive : undefined });
    return NextResponse.json({ ok: true, item, message: "اطلاعات محتوا به‌روزرسانی شد." });
  } catch (error) {
    return errorResponse(error, "عملیات رسانه در Supabase ناموفق بود.", "update");
  }
}

export async function DELETE(request: Request) {
  if (!(await authorized())) return NextResponse.json({ ok: false, error: "دسترسی مدیریت معتبر نیست." }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ ok: false, error: "اتصال Supabase هنوز تنظیم نشده است." }, { status: 503 });
  try {
    const body = await request.json();
    const publicId = String(body.publicId || "").trim();
    if (!publicId) return NextResponse.json({ ok: false, error: "شناسه فایل لازم است." }, { status: 400 });
    await deleteMedia(publicId);
    return NextResponse.json({ ok: true, message: "فایل حذف شد." });
  } catch (error) {
    return errorResponse(error, "حذف رسانه از Supabase ناموفق بود.", "delete");
  }
}
