import { NextResponse } from "next/server";

const backend = (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(/\/$/, "");

export async function GET() {
  try {
    const response = await fetch(`${backend}/api/v1/free-lessons`, { next: { revalidate: 60 } });
    if (!response.ok) return NextResponse.json({ error: "free_lessons_unavailable" }, { status: response.status });
    return NextResponse.json(await response.json(), { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch {
    return NextResponse.json({ error: "free_lessons_unavailable" }, { status: 503 });
  }
}
