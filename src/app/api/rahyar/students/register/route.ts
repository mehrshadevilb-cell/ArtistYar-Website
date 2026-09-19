import { NextResponse } from "next/server";

const backend = (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(/\/$/, "");
const MAX_REGISTRATION_BODY_BYTES = 64 * 1024;

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_REGISTRATION_BODY_BYTES) {
      return NextResponse.json({ error: "درخواست ثبت‌نام بیش از حد بزرگ است." }, { status: 413 });
    }

    const response = await fetch(`${backend}/api/v1/students/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store",
    });
    const text = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: "backend_invalid_response" };
    }
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "registration_backend_unavailable" }, { status: 503 });
  }
}
