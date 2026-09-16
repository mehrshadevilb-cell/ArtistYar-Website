import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "artistyar-website",
    phase: "ui-complete-demo-auth",
    backend:
      "RahYar bot API not wired yet — set RAHYAR_API_URL when backend endpoints are ready.",
  });
}
