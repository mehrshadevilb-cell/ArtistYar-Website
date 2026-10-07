import { NextResponse } from "next/server";
import { getPluginsDb } from "@/lib/plugins-db";
import { pluginImageResponse } from "@/lib/telegram-plugin-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deterministic branded SVG cover used when Telegram media is missing, expired,
 * empty, or the bot cannot resolve the file_id. Keeps cards and homepage
 * preloads from rendering broken images.
 */
function brandedCoverSvg(title?: string | null): Buffer {
  const safeTitle = (title || "Plugin")
    .replace(/[<>&'"]/g, "")
    .slice(0, 48);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" role="img">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#g)"/>
  <rect x="24" y="24" width="592" height="312" rx="18" fill="none" stroke="#334155" stroke-width="2"/>
  <text x="320" y="160" text-anchor="middle" font-family="system-ui,sans-serif" font-size="28" fill="#e2e8f0" font-weight="600">ArtistYar</text>
  <text x="320" y="210" text-anchor="middle" font-family="system-ui,sans-serif" font-size="18" fill="#94a3b8">${safeTitle}</text>
  <text x="320" y="250" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#64748b">Plugin Cover</text>
</svg>`;
  return Buffer.from(svg, "utf8");
}

function svgResponse(title?: string | null): NextResponse {
  return new NextResponse(brandedCoverSvg(title) as BodyInit, {
    status: 200,
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=120, stale-while-revalidate=600",
    },
  });
}

/**
 * Telegram is the canonical source for plugin covers.
 * Supabase Storage is deliberately not used for plugin media.
 * On any unresolvable/empty/bot failure we serve a branded SVG fallback
 * and log the real cause server-side (never leak internals to clients).
 */
export async function GET(request: Request) {
  const fileId = String(new URL(request.url).searchParams.get("file_id") || "").trim();
  if (!fileId) return NextResponse.json({ error: "file_id_required" }, { status: 400 });

  const db = getPluginsDb();
  if (!db) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });

  const known = await db
    .from("telegram_plugin_posts")
    .select("id,title")
    .eq("status", "published")
    .eq("telegram_photo_file_id", fileId)
    .limit(1)
    .maybeSingle();

  if (known.error) {
    console.error("plugin_image_lookup_failed", known.error.message);
    return NextResponse.json({ error: "image_lookup_failed" }, { status: 503 });
  }
  if (!known.data) {
    // Unknown file_id — keep 404 so scrapers cannot enumerate random IDs as covers.
    return NextResponse.json({ error: "image_not_found" }, { status: 404 });
  }

  try {
    const upstream = await pluginImageResponse(fileId);
    const contentType =
      typeof upstream.headers?.get === "function"
        ? upstream.headers.get("content-type") || "image/jpeg"
        : "image/jpeg";
    const body = upstream.body as Buffer;

    if (!Buffer.isBuffer(body) || body.length < 256) {
      console.warn("plugin_image_empty", { post_id: known.data.id, fileId: fileId.slice(0, 24) });
      return svgResponse(known.data.title);
    }

    return new NextResponse(body as BodyInit, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=300, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    // Deleted/expired Telegram media is a normal state — serve branded fallback.
    if (/not found|404|file_id/i.test(detail)) {
      console.warn("plugin_image_telegram_unavailable", {
        post_id: known.data.id,
        detail: detail.slice(0, 200),
      });
      return svgResponse(known.data.title);
    }
    if (/telegram_bot_token_missing|unauthorized|401/i.test(detail)) {
      console.error("plugin_image_bot_config", detail.slice(0, 200));
      return NextResponse.json({ error: "telegram_cover_configuration_error" }, { status: 503 });
    }
    console.error("plugin_image_bot_failed", detail.slice(0, 300));
    return svgResponse(known.data.title);
  }
}
