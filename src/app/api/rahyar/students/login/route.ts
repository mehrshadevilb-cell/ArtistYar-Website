import { NextResponse } from "next/server";

const backend = (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(/\/$/, "");
const MAX_LOGIN_BODY_BYTES = 16 * 1024;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_LOGIN_BODY_BYTES) {
    return NextResponse.json({ error: "درخواست ورود بیش از حد بزرگ است." }, { status: 413 });
  }
  try {
    const response = await fetch(`${backend}/api/v1/students/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store",
    });
    const text = await response.text();
    try {
      return NextResponse.json(JSON.parse(text), { status: response.status });
    } catch {
      return NextResponse.json({ error: "backend_invalid_response" }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: "student_login_backend_unavailable" }, { status: 503 });
  }
}
