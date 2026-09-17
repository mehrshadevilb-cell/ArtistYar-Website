import { NextResponse } from "next/server";

const backend = (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(/\/$/, "");

export async function POST(request: Request) {
  try {
    const response = await fetch(`${backend}/api/v1/analytics/events`, { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": request.headers.get("user-agent") || "" }, body: await request.text(), cache: "no-store" });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch { return NextResponse.json({ ok: false }, { status: 503 }); }
}
