import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hasSupabase, uploadStandaloneAsset } from "@/lib/supabase-media";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_VIDEO_SIZE = 1024 * 1024 * 1024;
const MAX_THUMBNAIL_SIZE = 10 * 1024 * 1024;

const videoExtToMime: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  qt: "video/quicktime",
  mkv: "video/x-matroska",
  m4v: "video/mp4",
};

const imageExtToMime: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

const videoTypes = new Set(Object.values(videoExtToMime));
const imageTypes = new Set(Object.values(imageExtToMime));

function extOf(name: string): string {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() || "" : "";
}

function resolveMime(file: File, kind: "video" | "thumbnail"): string | null {
  const reported = (file.type || "").trim().toLowerCase();
  const ext = extOf(file.name);
  if (kind === "video") {
    if (reported && videoTypes.has(reported)) return reported;
    if (ext && videoExtToMime[ext]) return videoExtToMime[ext];
    if (reported === "application/octet-stream" && videoExtToMime[ext]) return videoExtToMime[ext];
    return null;
  }
  if (reported && imageTypes.has(reported)) return reported;
  if (ext && imageExtToMime[ext]) return imageExtToMime[ext];
  if (reported === "application/octet-stream" && imageExtToMime[ext]) return imageExtToMime[ext];
  return null;
}

async function authorized() {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  return Boolean(verifyAdminSession(session));
}

export async function POST(request: Request) {
  if (!(await authorized())) {
    return NextResponse.json({ ok: false, error: "دسترسی مدیریت معتبر نیست. دوباره وارد حساب ادمین شو." }, { status: 401 });
  }
  if (!hasSupabase()) {
    return NextResponse.json(
      { ok: false, error: "اتصال Supabase هنوز تنظیم نشده است. SUPABASE_URL و SUPABASE_SECRET_KEY را روی سرور ست کن." },
      { status: 503 },
    );
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const kindRaw = String(form.get("kind") || "").trim();
    const kind = kindRaw === "video" || kindRaw === "thumbnail" ? kindRaw : null;

    if (!(file instanceof File) || !kind) {
      return NextResponse.json({ ok: false, error: "فایل و نوع فایل (video یا thumbnail) را انتخاب کنید." }, { status: 400 });
    }

    const mime = resolveMime(file, kind);
    if (!mime) {
      return NextResponse.json(
        {
          ok: false,
          error:
            kind === "video"
              ? "فرمت ویدیو باید MP4، WebM، MOV یا MKV باشد."
              : "فرمت thumbnail باید JPG، PNG، WebP یا AVIF باشد.",
        },
        { status: 400 },
      );
    }

    const max = kind === "video" ? MAX_VIDEO_SIZE : MAX_THUMBNAIL_SIZE;
    if (file.size <= 0 || file.size > max) {
      return NextResponse.json(
        {
          ok: false,
          error:
            kind === "video"
              ? "حجم ویدیو نمی‌تواند بیشتر از ۱ گیگابایت باشد."
              : "حجم thumbnail نمی‌تواند بیشتر از ۱۰ مگابایت باشد.",
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const item = await uploadStandaloneAsset({
      buffer,
      filename: file.name || `upload.${kind === "video" ? "mp4" : "jpg"}`,
      mimeType: mime,
      kind,
    });

    return NextResponse.json({
      ok: true,
      item,
      message: "فایل با موفقیت در Storage آپلود شد.",
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 280) : "آپلود ناموفق بود.";
    console.error("free training asset upload failed", error);
    const isSize = /too large|entity too large|payload|413|maximum allowed size/i.test(detail);
    return NextResponse.json(
      {
        ok: false,
        error: isSize
          ? "حجم فایل از محدودیت سرور یا Storage بیشتر است. فایل کوچک‌تری امتحان کن."
          : detail,
      },
      { status: isSize ? 413 : 502 },
    );
  }
}
