import { NextResponse } from "next/server";
import { createOrder, hasBackend } from "@/lib/rahyar-api";

const MAX_ORDER_BODY_BYTES = 64 * 1024;

export async function POST(request: Request) {
  if (!hasBackend()) {
    return NextResponse.json(
      {
        ok: false,
        error: "RAHYAR_API_URL تنظیم نشده. سفارش دمو ذخیره نمی‌شود.",
      },
      { status: 503 },
    );
  }
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_ORDER_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "درخواست سفارش بیش از حد بزرگ است." }, { status: 413 });
    }

    const body = await request.json();
    const result = await createOrder(body);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { ok: false, error: "ثبت سفارش ناموفق بود. لطفاً دوباره تلاش کنید." },
      { status: 502 },
    );
  }
}
