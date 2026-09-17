import { NextResponse } from "next/server";
import { fallbackFreeLessons } from "@/lib/free-lessons-fallback";

const backend = (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(/\/$/, "");

export async function GET() {
  try {
    const response = await fetch(`${backend}/api/v1/free-lessons`, { next: { revalidate: 60 } });
    if (!response.ok) {
      return NextResponse.json(fallbackFreeLessons, {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          "X-Free-Lessons-Source": "fallback",
        },
      });
    }
    const lessons = await response.json();
    const hasLessons = Array.isArray(lessons) && lessons.length > 0;
    return NextResponse.json(hasLessons ? lessons : fallbackFreeLessons, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        ...(hasLessons ? {} : { "X-Free-Lessons-Source": "fallback" }),
      },
    });
  } catch {
    return NextResponse.json(fallbackFreeLessons, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "X-Free-Lessons-Source": "fallback",
      },
    });
  }
}
