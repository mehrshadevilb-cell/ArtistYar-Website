import { NextResponse } from "next/server";

/**
 * Placeholder for real RahYar auth.
 * Client currently uses local demo auth; switch to this route when backend is ready.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username || "");
  const password = String(body.password || "");

  if (!username || !password) {
    return NextResponse.json({ error: "credentials required" }, { status: 400 });
  }

  return NextResponse.json({
    ok: false,
    error: "Backend auth not connected. Use demo login on the client for now.",
    next: "Wire to RahYar user service + password_hash / session tokens.",
  });
}
