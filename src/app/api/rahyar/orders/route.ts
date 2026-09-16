import { NextResponse } from "next/server";
import { createOrder, hasBackend } from "@/lib/rahyar-api";

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
    const body = await request.json();
    const result = await createOrder(body);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 400 });
  }
}
