import { NextResponse } from "next/server";
import { fallbackFreeLessons } from "@/lib/free-lessons-fallback";
import { listPublishedMedia } from "@/lib/supabase-media";

const backend = (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(/\/$/, "");

export const dynamic = "force-dynamic";

async function fetchBackendLessons() {
  try {
    const response = await fetch(`${backend}/api/v1/free-lessons`, { cache: "no-store" });
    if (!response.ok) return [];
    const lessons = await response.json();
    return Array.isArray(lessons) ? lessons : [];
  } catch {
    return [];
  }
}

async function fetchMediaLessons() {
  try {
    const media = await listPublishedMedia();
    return media
      .filter((item) => item.category === "free-training" && item.kind === "video")
      .map((item, index) => ({
        // Negative IDs keep Storage-backed lessons separate from RahYar DB lesson IDs.
        id: -(index + 1),
        slug: `media-${encodeURIComponent(item.publicId).replace(/%/g, "-")}`,
        title: item.title,
        description: item.description || "آموزش رایگان ArtistYar.",
        duration_label: item.duration ? `${Math.floor(item.duration / 60)}:${String(Math.floor(item.duration % 60)).padStart(2, "0")}` : "ویدیو",
        video_url: item.url,
        thumbnail_url: item.coverUrl,
        chapters: [],
        sort_order: 100000 + index,
        is_active: true,
        created_at: item.createdAt,
        updated_at: item.createdAt,
      }));
  } catch (error) {
    console.warn("free training media lookup failed", error);
    return [];
  }
}

export async function GET() {
  const [backendLessons, mediaLessons] = await Promise.all([fetchBackendLessons(), fetchMediaLessons()]);
  const lessons = [...backendLessons, ...mediaLessons];

  if (lessons.length > 0) {
    return NextResponse.json(lessons, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }

  return NextResponse.json(fallbackFreeLessons, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Free-Lessons-Source": "fallback",
    },
  });
}
