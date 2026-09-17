import { NextResponse } from "next/server";

function backendBase(): string {
  return (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(/\/$/, "");
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const incoming = await request.formData();
    const phone = incoming.get("phone");
    const receipt = incoming.get("receipt");
    const paymentId = new URL(request.url).searchParams.get("payment_id");

    if (typeof phone !== "string" || !phone.trim() || !(receipt instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "شماره موبایل و فایل رسید الزامی است." },
        { status: 400 },
      );
    }

    if (!paymentId || !/^\d+$/.test(paymentId)) {
      return NextResponse.json(
        { ok: false, error: "شماره پرداخت معتبر نیست." },
        { status: 400 },
      );
    }

    if (receipt.size <= 0 || receipt.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: "حجم فایل رسید باید حداکثر ۱۰ مگابایت باشد." },
        { status: 400 },
      );
    }

    const form = new FormData();
    form.set("phone", phone.trim());
    form.set("receipt", receipt, receipt.name || `receipt-${paymentId}`);

    const response = await fetch(`${backendBase()}/api/v1/orders/${paymentId}/receipt`, {
      method: "POST",
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });

    const data = await response.json().catch(() => ({ detail: "پاسخ نامعتبر از سرور پرداخت" }));
    if (!response.ok) {
      const detail = typeof data?.detail === "string" ? data.detail : "ارسال رسید ناموفق بود.";
      return NextResponse.json({ ok: false, error: detail }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("receipt proxy failed", error);
    return NextResponse.json(
      { ok: false, error: "ارتباط با سرور پرداخت برقرار نشد. لطفاً دوباره تلاش کنید." },
      { status: 502 },
    );
  }
}
