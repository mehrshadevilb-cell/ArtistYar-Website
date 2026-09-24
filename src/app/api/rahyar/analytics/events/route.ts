import { NextResponse } from "next/server";

const backend = (
  process.env.RAHYAR_API_URL ||
  "https://rahyar-academy-management-system-v14.onrender.com"
).replace(/\/$/, "");

const MAX_BODY = 16 * 1024;

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) {
      return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 413 });
    }

    const response = await fetch(`${backend}/api/v1/analytics/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": request.headers.get("user-agent") || "",
      },
      body: raw || "{}",
      cache: "no-store",
    });

    const text = await response.text();
    let payload: unknown = { ok: response.ok };
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { ok: response.ok, raw: text.slice(0, 200) };
      }
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error(
      "analytics_events_proxy_failed",
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
