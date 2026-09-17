import { NextResponse } from "next/server";
import { hasCloudinary, listPublishedMedia, uploadMedia } from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 250 * 1024 * 1024;
const allowedCategories = new Set(["student-work", "free-training"]);

function authorized(request: Request): boolean {
  const expected = process.env.ARTISTYAR_UPLOAD_ADMIN_TOKEN;
  return Boolean(expected && request.headers.get("x-artistyar-admin-token") === expected);
}

export async function GET() {
  if (!hasCloudinary()) return NextResponse.json({ configured: false, items: [] });
  try {
    return NextResponse.json({ configured: true, items: await listPublishedMedia() }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (error) {
    console.error("cloudinary list failed", error);
    return NextResponse.json({ configured: true, items: [], error: "دریافت محتوای منتشرشده ناموفق بود." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "دسترسی مدیریت معتبر نیست." }, { status: 401 });
  if (!hasCloudinary()) return NextResponse.json({ ok: false, error: "اتصال Cloudinary هنوز تنظیم نشده است." }, { status: 503 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "").trim();
    const category = String(form.get("category") || "");
    const consent = form.get("consent") === "true";
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "فایل را انتخاب کنید." }, { status: 400 });
    if (!title || title.length < 3) return NextResponse.json({ ok: false, error: "عنوان محتوا را کامل وارد کنید." }, { status: 400 });
    if (!allowedCategories.has(category)) return NextResponse.json({ ok: false, error: "دسته‌بندی معتبر نیست." }, { status: 400 });
    if (category === "student-work" && !consent) return NextResponse.json({ ok: false, error: "برای انتشار نمونه‌کار هنرجو، تأیید رضایت لازم است." }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) return NextResponse.json({ ok: false, error: "حجم فایل باید بین ۱ بایت و ۲۵۰ مگابایت باشد." }, { status: 400 });
    const media = await uploadMedia({ buffer: Buffer.from(await file.arrayBuffer()), filename: file.name, title, description, category: category as "student-work" | "free-training", consent });
    return NextResponse.json({ ok: true, item: media, message: "محتوا با موفقیت در Cloudinary آپلود و منتشر شد." });
  } catch (error) {
    console.error("cloudinary upload failed", error);
    return NextResponse.json({ ok: false, error: "آپلود ناموفق بود. تنظیمات Cloudinary و نوع فایل را بررسی کنید." }, { status: 502 });
  }
}
