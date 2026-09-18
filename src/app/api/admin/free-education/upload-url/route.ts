import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createStandaloneUploadTicket, hasSupabase } from "@/lib/supabase-media";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/server-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v", "mkv", "avi", "mpeg", "mpg", "ogv", "3gp", "ts", "m2ts"]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif"]);

export async function POST(request: Request) {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifyAdminSession(session)) {
    return NextResponse.json({ ok: false, error: "نشست ادمین معتبر نیست." }, { status: 401 });
  }
  if (!hasSupabase()) {
    return NextResponse.json({ ok: false, error: "Supabase تنظیم نشده است." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const filename = String(body.filename || "").trim();
    const mimeType = String(body.mimeType || "").trim().toLowerCase();
    const kind = body.kind === "thumbnail" ? "thumbnail" : "video";
    const ext = filename.toLowerCase().split(".").pop() || "";

    if (!filename || !ext) {
      return NextResponse.json({ ok: false, error: "نام فایل معتبر نیست." }, { status: 400 });
    }
    if (kind === "video" && !VIDEO_EXTENSIONS.has(ext)) {
      return NextResponse.json({ ok: false, error: "فرمت ویدیو پشتیبانی نمی‌شود." }, { status: 400 });
    }
    if (kind === "thumbnail" && !IMAGE_EXTENSIONS.has(ext)) {
      return NextResponse.json({ ok: false, error: "فرمت کاور پشتیبانی نمی‌شود." }, { status: 400 });
    }

    const ticket = await createStandaloneUploadTicket({ filename, mimeType, kind });
    return NextResponse.json({ ok: true, ...ticket });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "ساخت لینک آپلود ناموفق بود." },
      { status: 502 },
    );
  }
}
