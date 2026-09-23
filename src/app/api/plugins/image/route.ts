
import { NextResponse } from "next/server";
import { pluginImageResponse } from "@/lib/telegram-plugin-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("file_id");
  if (!id) return NextResponse.json({ error: "file_id_required" }, { status: 400 });
  try {
    const upstream = await pluginImageResponse(id);
    return new NextResponse(upstream.body, { status: 200, headers: {
      "content-type": upstream.headers.get("content-type") || "image/jpeg",
      "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
    }});
  } catch {
    return NextResponse.json({ error: "image_unavailable" }, { status: 404 });
  }
}
