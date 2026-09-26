import { NextResponse } from "next/server";
import { getPluginsDb } from "@/lib/plugins-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Plugin covers must be real plugin artwork stored by ArtistYar (Supabase storage).
 * Do NOT serve Telegram channel logos from public embeds or unverified bot thumbs.
 */
function isTrustedPluginCoverUrl(url: string | null | undefined) {
  const value = String(url || "").trim().toLowerCase();
  if (!value) return false;
  if (value.includes("telesco.pe")) return false;
  if (value.includes("telegram.org")) return false;
  if (value.includes("telegram-cdn.org")) return false;
  // Accept Supabase storage / our site / known media host
  if (value.includes("supabase.co")) return true;
  if (value.includes("artistyaar.ir")) return true;
  if (value.includes("artistyar")) return true;
  return false;
}

export async function GET(request: Request) {
  const fileId = new URL(request.url).searchParams.get("file_id");
  if (!fileId) return NextResponse.json({ error: "file_id_required" }, { status: 400 });

  const db = getPluginsDb();
  if (!db) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });

  const known = await db
    .from("telegram_plugin_posts")
    .select("id,cover_public_url,cover_storage_path")
    .eq("status", "published")
    .eq("telegram_photo_file_id", fileId)
    .limit(1)
    .maybeSingle();

  if (known.error) {
    console.error("plugin_image_lookup_failed", known.error.message);
    return NextResponse.json({ error: "image_lookup_failed" }, { status: 503 });
  }
  if (!known.data) {
    return NextResponse.json({ error: "image_not_found" }, { status: 404 });
  }

  const coverPublicUrl = known.data.cover_public_url
    ? String(known.data.cover_public_url)
    : null;

  if (!isTrustedPluginCoverUrl(coverPublicUrl)) {
    return NextResponse.json(
      {
        error: "plugin_cover_not_ready",
        detail: "Real plugin cover not stored yet. Channel logos are not used.",
      },
      { status: 404 },
    );
  }

  try {
    const upstream = await fetch(coverPublicUrl!, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: { accept: "image/*" },
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: "cover_fetch_failed" }, { status: 502 });
    }
    const bytes = Buffer.from(await upstream.arrayBuffer());
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "content-type": upstream.headers.get("content-type") || "image/jpeg",
        "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "cover_fetch_failed", detail: detail.slice(0, 180) },
      { status: 502 },
    );
  }
}
