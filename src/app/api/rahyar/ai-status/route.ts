import { NextResponse } from "next/server";

function base() {
  return (process.env.RAHYAR_API_URL || "").replace(/\/$/, "");
}

export async function GET() {
  const backend = base();
  if (!backend) {
    return NextResponse.json({
      ok: false,
      source: "demo",
      note: "RAHYAR_API_URL not set",
      chat_assistant_enabled: false,
      self_check: "Backend connected نیست.",
      agent_status: "n/a",
    });
  }
  try {
    const headers: Record<string, string> = {};
    const secret = process.env.RAHYAR_WEB_API_SECRET || "";
    if (secret) headers["X-Rahyar-Key"] = secret;
    const res = await fetch(`${backend}/api/v1/ai/status`, {
      headers,
      next: { revalidate: 15 },
    });
    const data = await res.json();
    return NextResponse.json({ ...data, source: "rahyar" }, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { ok: false, source: "error", error: String(e) },
      { status: 502 },
    );
  }
}
