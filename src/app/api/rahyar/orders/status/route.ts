import { NextResponse } from "next/server";
import { fetchOrderStatus, hasBackend } from "@/lib/rahyar-api";

export async function GET(request: Request) {
  if (!hasBackend()) {
    return NextResponse.json(
      { ok: false, error: "پیگیری سفارش پس از اتصال به backend فعال می‌شود." },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const paymentId = Number(url.searchParams.get("payment_id"));
  const phone = (url.searchParams.get("phone") || "").trim();
  if (!Number.isInteger(paymentId) || paymentId < 1 || !phone) {
    return NextResponse.json(
      { ok: false, error: "شماره پرداخت و موبایل را وارد کنید." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await fetchOrderStatus(paymentId, phone));
  } catch {
    return NextResponse.json(
      { ok: false, error: "سفارش پیدا نشد یا اطلاعات واردشده نادرست است." },
      { status: 404 },
    );
  }
}

