import { NextResponse } from "next/server";

function base() {
  return (process.env.RAHYAR_API_URL || "").replace(/\/$/, "");
}

export async function POST(request: Request) {
  const backend = base();
  if (!backend) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "RAHYAR_API_URL تنظیم نشده. دستیار پس از اتصال به ربات فعال می‌شود.",
      },
      { status: 503 },
    );
  }
  try {
    const body = await request.json();
    const res = await fetch(`${backend}/api/v1/assistant/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        data.reply ||
        data.error ||
        data.detail ||
        (res.status === 429
          ? "محدودیت نرخ پاسخ. کمی بعد دوباره تلاش کنید."
          : res.status >= 500
            ? "مدل/سرویس موقتاً در دسترس نیست؛ failover در حال تلاش است."
            : `خطا (${res.status})`);
      return NextResponse.json(
        { ok: false, error: msg, reply: msg },
        { status: res.status },
      );
    }
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "اتصال به backend برقرار نشد. RAHYAR_API_URL و وضعیت Render را چک کنید.",
      },
      { status: 502 },
    );
  }
}
