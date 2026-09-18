import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hasSupabase, uploadStandaloneAsset } from "@/lib/supabase-media";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_VIDEO_SIZE = 1024 * 1024 * 1024;
const MAX_THUMBNAIL_SIZE = 10 * 1024 * 1024;
const videoTypes = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"]);
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

async function authorized() {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  return Boolean(verifyAdminSession(session));
}

export async function POST(request: Request) {
  if (!(await authorized())) return NextResponse.json({ ok: false, error: "دسترسی مدیریت معتبر نیست." }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ ok: false, error: "اتصال Supabase هنوز تنظیم نشده است." }, { status: 503 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") || "");
    if (!(file instanceof File) || !["video", "thumbnail"].includes(kind)) return NextResponse.json({ ok: false, error: "فایل و نوع فایل را انتخاب کنید." }, { status: 400 });
    const allowed = kind === "video" ? videoTypes : imageTypes;
    const max = kind === "video" ? MAX_VIDEO_SIZE : MAX_THUMBNAIL_SIZE;
    if (!allowed.has(file.type)) return NextResponse.json({ ok: false, error: kind === "video" ? "فرمت ویدیو باید MP4، WebM، MOV یا MKV باشد." : "فرمت thumbnail باید JPG، PNG، WebP یا AVIF باشد." }, { status: 400 });
    if (file.size <= 0 || file.size > max) return NextResponse.json({ ok: false, error: kind === "video" ? "حجم ویدیو نمی‌تواند بیشتر از ۱ گیگابایت باشد." : "حجم thumbnail نمی‌تواند بیشتر از ۱۰ مگابایت باشد." }, { status: 400 });
    const item = await uploadStandaloneAsset({ buffer: Buffer.from(await file.arrayBuffer()), filename: file.name, mimeType: file.type, kind: kind as "video" | "thumbnail" });
    return NextResponse.json({ ok: true, item, message: "فایل با موفقیت در Storage آپلود شد." });
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 240) : "آپلود ناموفق بود.";
    console.error("free training asset upload failed", error);
    return NextResponse.json({ ok: false, error: detail }, { status: 502 });
  }
}
