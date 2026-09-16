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
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}
