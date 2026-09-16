import { NextResponse } from "next/server";

export async function GET() {
  const backend = (process.env.RAHYAR_API_URL || "").replace(/\/$/, "");
  let backendOk = false;
  let backendDetail = "RAHYAR_API_URL not set";

  if (backend) {
    try {
      const res = await fetch(`${backend}/api/v1/health`, {
        next: { revalidate: 30 },
      });
      backendOk = res.ok;
      backendDetail = backendOk ? backend : `unreachable (${res.status})`;
    } catch {
      backendDetail = "unreachable";
    }
  }

  return NextResponse.json({
    status: "ok",
    service: "artistyar-website",
    phase: backendOk ? "live-api" : backend ? "api-configured-unreachable" : "demo",
    backend: backendDetail,
    wired: backendOk,
  });
}
