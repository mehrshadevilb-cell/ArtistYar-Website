import { NextResponse } from "next/server";

const MAX_INQUIRY_BODY_BYTES = 32 * 1024;
import { createClassInquiry, hasBackend } from "@/lib/rahyar-api";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_INQUIRY_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "درخواست بیش از حد بزرگ است." }, { status: 413 });
  }
  if (!hasBackend()) {
    return NextResponse.json(
      { ok: false, error: "RAHYAR_API_URL تنظیم نشده." },
      { status: 503 },
    );
  }
  try {
    const body = await request.json();
    const result = await createClassInquiry(body);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { ok: false, error: "ثبت درخواست ناموفق بود. لطفاً دوباره تلاش کنید." },
      { status: 502 },
    );
  }
}
