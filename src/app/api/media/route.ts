import { NextResponse } from "next/server";
import { deleteMedia, hasSupabase, listPublishedMedia, updateMedia, uploadMedia } from "@/lib/supabase-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const allowedCategories = new Set(["student-work", "free-training"]);

function authorized(request: Request): boolean {
  const expected = process.env.ARTISTYAR_UPLOAD_ADMIN_TOKEN;
  return Boolean(expected && request.headers.get("x-artistyar-admin-token") === expected);
}
function errorMessage(error: unknown, fallback: string): string { return error instanceof Error && error.message ? error.message.slice(0, 240) : fallback; }

export async function GET() {
  if (!hasSupabase()) return NextResponse.json({ configured: false, items: [] });
  try { return NextResponse.json({ configured: true, items: await listPublishedMedia() }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }); }
  catch (error) { console.error("supabase media list failed", error); return NextResponse.json({ configured: true, items: [], error: "دریافت محتوای منتشرشده ناموفق بود." }, { status: 502 }); }
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "دسترسی مدیریت معتبر نیست." }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ ok: false, error: "اتصال Supabase هنوز تنظیم نشده است." }, { status: 503 });
  try {
    const form = await request.formData(); const file = form.get("file"); const title = String(form.get("title") || "").trim(); const description = String(form.get("description") || "").trim(); const category = String(form.get("category") || ""); const consent = form.get("consent") === "true";
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "فایل را انتخاب کنید." }, { status: 400 });
    if (!title || title.length < 3) return NextResponse.json({ ok: false, error: "عنوان محتوا را کامل وارد کنید." }, { status: 400 });
    if (!allowedCategories.has(category)) return NextResponse.json({ ok: false, error: "دسته‌بندی معتبر نیست." }, { status: 400 });
    if (category === "student-work" && !consent) return NextResponse.json({ ok: false, error: "برای انتشار نمونه‌کار هنرجو، تأیید رضایت لازم است." }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) return NextResponse.json({ ok: false, error: "حجم فایل باید بین ۱ بایت و ۵۰ مگابایت باشد." }, { status: 400 });
    const item = await uploadMedia({ buffer: Buffer.from(await file.arrayBuffer()), filename: file.name, mimeType: file.type || "application/octet-stream", title, description, category: category as "student-work" | "free-training", consent });
    return NextResponse.json({ ok: true, item, message: "محتوا با موفقیت در Supabase آپلود و منتشر شد." });
  } catch (error) { console.error("supabase media upload failed", error); return NextResponse.json({ ok: false, error: `Supabase: ${errorMessage(error, "آپلود ناموفق بود.")}` }, { status: 502 }); }
}

export async function PUT(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "دسترسی مدیریت معتبر نیست." }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ ok: false, error: "اتصال Supabase هنوز تنظیم نشده است." }, { status: 503 });
  try { const body = await request.json(); const publicId = String(body.publicId || "").trim(); const title = String(body.title || "").trim(); const description = String(body.description || "").trim(); if (!publicId || title.length < 3) return NextResponse.json({ ok: false, error: "شناسه و عنوان معتبر لازم است." }, { status: 400 }); const item = await updateMedia({ publicId, title, description }); return NextResponse.json({ ok: true, item, message: "اطلاعات محتوا به‌روزرسانی شد." }); }
  catch (error) { return NextResponse.json({ ok: false, error: `Supabase: ${errorMessage(error, "ویرایش ناموفق بود.")}` }, { status: 502 }); }
}

export async function DELETE(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "دسترسی مدیریت معتبر نیست." }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ ok: false, error: "اتصال Supabase هنوز تنظیم نشده است." }, { status: 503 });
  try { const body = await request.json(); const publicId = String(body.publicId || "").trim(); if (!publicId) return NextResponse.json({ ok: false, error: "شناسه فایل لازم است." }, { status: 400 }); await deleteMedia(publicId); return NextResponse.json({ ok: true, message: "فایل حذف شد." }); }
  catch (error) { return NextResponse.json({ ok: false, error: `Supabase: ${errorMessage(error, "حذف ناموفق بود.")}` }, { status: 502 }); }
}
