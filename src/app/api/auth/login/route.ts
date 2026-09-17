import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function sessionToken(username: string): string {
  const secret = process.env.ARTISTYAR_ADMIN_PASSWORD || process.env.ARTISTYAR_UPLOAD_ADMIN_TOKEN || "artistyar";
  const payload = `${username}:${Date.now()}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex").slice(0, 32);
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!username || !password) {
    return NextResponse.json({ ok: false, error: "نام کاربری و رمز عبور لازم است." }, { status: 400 });
  }

  const adminUser = (process.env.ARTISTYAR_ADMIN_USERNAME || "").trim();
  const adminPass = process.env.ARTISTYAR_ADMIN_PASSWORD || "";

  if (!adminUser || !adminPass) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "ورود ادمین هنوز روی سرور پیکربندی نشده. متغیرهای ARTISTYAR_ADMIN_USERNAME و ARTISTYAR_ADMIN_PASSWORD را در Render تنظیم کن.",
      },
      { status: 503 },
    );
  }

  if (safeEqual(username, adminUser) && safeEqual(password, adminPass)) {
    return NextResponse.json({
      ok: true,
      user: {
        id: "admin",
        username: adminUser,
        fullName: "مدیر آکادمی",
        role: "admin" as const,
        telegramLinked: true,
        telegramId: "owner",
      },
      token: sessionToken(adminUser),
    });
  }

  return NextResponse.json({ ok: false, error: "نام کاربری یا رمز عبور نادرست است." }, { status: 401 });
}
