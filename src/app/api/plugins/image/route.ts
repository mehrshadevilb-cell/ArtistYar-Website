import { NextResponse } from "next/server";
import { getPluginsDb } from "@/lib/plugins-db";
import { pluginImageResponse } from "@/lib/telegram-plugin-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Trusted stored covers only (Supabase / ArtistYar).
 * Telegram public CDN (telesco.pe) is the channel logo — never use it.
 */
function escapeXml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function fallbackCover(title: string) {
  const safeTitle = escapeXml(title || "Audio Plugin");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#111827"/><stop offset="100%" stop-color="#312e81"/></linearGradient>
    <linearGradient id="a" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#a78bfa"/><stop offset="100%" stop-color="#22d3ee"/></linearGradient>
  </defs>
  <rect width="1200" height="630" rx="36" fill="url(#bg)"/>
  <circle cx="1040" cy="100" r="210" fill="#7c3aed" opacity=".18"/>
  <circle cx="120" cy="560" r="260" fill="#06b6d4" opacity=".12"/>
  <rect x="72" y="72" width="1056" height="8" rx="4" fill="url(#a)"/>
  <text x="72" y="150" fill="#c4b5fd" font-family="Arial,sans-serif" font-size="28" font-weight="700">ARTISTYAR • PLUGIN</text>
  <text x="72" y="290" fill="#fff" font-family="Arial,sans-serif" font-size="58" font-weight="800">${safeTitle}</text>
  <text x="72" y="350" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="30">Audio Plugin</text>
  <text x="72" y="515" fill="#94a3b8" font-family="Arial,sans-serif" font-size="24">ArtistYar</text>
</svg>`;
  return Buffer.from(svg, "utf8");
}

function isTrustedStoredCover(url: string | null | undefined) {
  const value = String(url || "").trim().toLowerCase();
  if (!value) return false;
  if (value.includes("telesco.pe")) return false;
  if (value.includes("telegram.org")) return false;
  if (value.includes("telegram-cdn.org")) return false;
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
    .select("id,cover_public_url,cover_storage_path,title")
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

  // 1) Prefer real stored plugin cover (Supabase)
  if (isTrustedStoredCover(coverPublicUrl)) {
    try {
      const upstream = await fetch(coverPublicUrl!, {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
        headers: { accept: "image/*" },
      });
      if (upstream.ok) {
        const bytes = Buffer.from(await upstream.arrayBuffer());
        if (bytes.length >= 4000) {
          return new NextResponse(bytes, {
            status: 200,
            headers: {
              "content-type": upstream.headers.get("content-type") || "image/jpeg",
              "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
            },
          });
        }
      }
    } catch {
      // fall through to Telegram bot download
    }
  }

  // 2) Real Telegram post photo via bot (server-side only — no secrets to client)
  try {
    const upstream = await pluginImageResponse(fileId);
    const contentType =
      typeof upstream.headers?.get === "function"
        ? upstream.headers.get("content-type") || "image/jpeg"
        : "image/jpeg";
    const body = upstream.body as Buffer;

    // Best-effort: persist to storage for next time (latest-3 covers)
    if (Buffer.isBuffer(body) && body.length >= 8000 && known.data.id) {
      try {
        const { syncPublishedPluginCover } = await import("@/lib/telegram-plugin-covers");
        void syncPublishedPluginCover({
          postId: String(known.data.id),
          photoFileId: fileId,
        }).catch(() => undefined);
      } catch {
        // non-fatal
      }
    }

    return new NextResponse(body as BodyInit, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=600, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("plugin_image_bot_failed", detail.slice(0, 300));
    if (/telegram_bot_token_missing/i.test(detail)) {
      return NextResponse.json(
        { error: "image_unavailable", detail: "telegram_bot_token_missing" },
        { status: 503 },
      );
    }
    // getFile Not Found: either this file_id was issued for a different bot
    // (historical rows), or the runtime token is not the channel webhook bot.
    // Do not assume misconfiguration — ops must compare getMe identity vs a NEW post.
    if (/not found|404/i.test(detail)) {
      // Historical Telegram file_ids can be permanently unresolvable. Never
      // leave the catalog visually broken: return a deterministic branded cover
      // immediately while the background storage recovery retries.
      try {
        const body = fallbackCover(String(known.data.title || "Audio Plugin"));
        if (known.data.id) {
          const { syncPublishedPluginCover } = await import("@/lib/telegram-plugin-covers");
          void syncPublishedPluginCover({
            postId: String(known.data.id),
            photoFileId: fileId,
          }).catch(() => undefined);
        }
        return new NextResponse(body, {
          status: 200,
          headers: {
            "content-type": "image/svg+xml",
            "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
          },
        });
      } catch {
        // Fall through to the operator diagnostic below.
      }
      const { pluginBotTokenSource } = await import("@/lib/telegram-plugin-bot");
      return NextResponse.json(
        {
          error: "image_unavailable",
          detail:
            "telegram_file_not_found_for_configured_bot — file_id is not resolvable by the runtime bot (historical ID from another bot, or runtime token ≠ channel bot)",
          token_source: pluginBotTokenSource(),
          hint:
            "Probe /api/telegram/plugins/diagnostics?key=...&probe=1 and test a NEW channel post file_id; old DB rows may never resolve",
        },
        { status: 404 },
      );
    }
    const status = /unauthorized|401/i.test(detail) ? 503 : 404;
    return NextResponse.json(
      { error: "image_unavailable", detail: detail.slice(0, 180) },
      { status },
    );
  }
}
