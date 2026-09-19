import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";
import { normalizeCategory, type MediaCategory } from "@/lib/supabase-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ALLOWED_EXT = new Set([
  "mp3", "wav", "flac", "m4a", "aac", "ogg", "opus",
  "mp4", "webm", "mov", "mkv", "m4v",
  "jpg", "jpeg", "png", "webp", "avif", "gif",
  "pdf",
]);

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
  m4v: "video/mp4",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  pdf: "application/pdf",
};

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180) || "upload.bin";
}

function folderForCategory(category: MediaCategory): string {
  if (category === "prodby-mehrshad") return "ProdBy Mehrshad";
  return category;
}

export async function POST(request: Request) {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifyAdminSession(session)) {
    return NextResponse.json({ ok: false, error: "نشست ادمین معتبر نیست." }, { status: 401 });
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const bucket = process.env.SUPABASE_BUCKET || "artistyar-media";
  if (!url || !secret) {
    return NextResponse.json({ ok: false, error: "Supabase تنظیم نشده است." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const filename = String(body.filename || "").trim();
    const mimeTypeRaw = String(body.mimeType || "").trim().toLowerCase();
    const size = Number(body.size || 0);
    const category = normalizeCategory(body.category);

    if (!filename) {
      return NextResponse.json({ ok: false, error: "نام فایل معتبر نیست." }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ ok: false, error: "دسته‌بندی معتبر نیست." }, { status: 400 });
    }
    if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: "حجم فایل باید بین ۱ بایت و ۵۰ مگابایت باشد." },
        { status: 413 },
      );
    }

    const safeName = sanitizeFilename(filename);
    const ext = (safeName.toLowerCase().split(".").pop() || "").replace(/[^a-z0-9]/g, "");
    if (!ext || !ALLOWED_EXT.has(ext)) {
      return NextResponse.json(
        { ok: false, error: "فرمت فایل پشتیبانی نمی‌شود." },
        { status: 400 },
      );
    }

    const mimeType =
      (mimeTypeRaw && mimeTypeRaw !== "application/octet-stream"
        ? mimeTypeRaw
        : mimeByExt[ext]) || "application/octet-stream";
    const expectedMime = mimeByExt[ext];
    if (expectedMime && mimeType !== expectedMime && !(ext === "m4a" && mimeType === "audio/x-m4a")) {
      return NextResponse.json({ ok: false, error: "نوع فایل با پسوند آن همخوانی ندارد." }, { status: 400 });
    }

    const folder = folderForCategory(category);
    // Unpredictable path — UUID prevents enumeration
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;

    const supabase = createClient(url, secret, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const signed = await supabase.storage.from(bucket).createSignedUploadUrl(path, { upsert: false });
    if (signed.error) {
      console.error("media signed upload url failed", signed.error);
      return NextResponse.json(
        { ok: false, error: "ساخت لینک آپلود ناموفق بود. اتصال Storage را بررسی کن." },
        { status: 502 },
      );
    }

    const publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

    return NextResponse.json({
      ok: true,
      path,
      signedUrl: signed.data.signedUrl,
      publicUrl,
      mimeType,
      maxSize: MAX_FILE_SIZE,
    });
  } catch (error) {
    console.error("media upload-url error", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "ساخت لینک آپلود ناموفق بود." },
      { status: 502 },
    );
  }
}
