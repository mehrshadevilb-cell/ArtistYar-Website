import { NextResponse } from "next/server";
import { getPluginsDb } from "@/lib/plugins-db";
import { pluginImageResponse } from "@/lib/telegram-plugin-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_PUBLIC_BYTES = 1500;

async function fetchPublicTelegramCover(postUrl: string | null, photoMessageId: number | null) {
  const candidates: string[] = [];
  const channelMatch = String(postUrl || "").match(/t\.me\/([^/]+)\/(\d+)/i);
  if (channelMatch) {
    const channel = channelMatch[1];
    const docId = channelMatch[2];
    candidates.push(`https://t.me/${channel}/${docId}?embed=1&mode=tme`);
    if (photoMessageId) {
      candidates.push(`https://t.me/${channel}/${photoMessageId}?embed=1&mode=tme`);
      candidates.push(`https://t.me/${channel}/${photoMessageId}`);
    }
    candidates.push(`https://t.me/${channel}/${docId}`);
  }

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          accept: "text/html",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      const matches = [
        ...html.matchAll(/https:\/\/cdn\d*\.telesco\.pe\/file\/[A-Za-z0-9_-]+\.jpg/g),
        ...html.matchAll(/url\('(https:\/\/cdn\d*\.telesco\.pe\/file\/[^']+)'\)/g),
      ]
        .map((m) => (m[1] ? m[1] : m[0]))
        .filter(Boolean);
      for (const imgUrl of matches) {
        try {
          const img = await fetch(imgUrl, {
            headers: { accept: "image/*", "user-agent": "ArtistYar-Plugin-Cover/1.0" },
            cache: "no-store",
            signal: AbortSignal.timeout(15000),
          });
          if (!img.ok) continue;
          const bytes = Buffer.from(await img.arrayBuffer());
          if (bytes.length < MIN_PUBLIC_BYTES) continue;
          const contentType = img.headers.get("content-type") || "image/jpeg";
          return { bytes, contentType, sourceUrl: imgUrl };
        } catch {
          // try next
        }
      }
    } catch {
      // try next candidate page
    }
  }
  return null;
}

export async function GET(request: Request) {
  const fileId = new URL(request.url).searchParams.get("file_id");
  if (!fileId) return NextResponse.json({ error: "file_id_required" }, { status: 400 });

  const db = getPluginsDb();
  let postMeta: {
    id: string;
    telegram_post_url: string | null;
    photo_message_id: number | null;
    cover_public_url: string | null;
  } | null = null;

  if (db) {
    const known = await db
      .from("telegram_plugin_posts")
      .select("id,telegram_post_url,photo_message_id,cover_public_url")
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
    postMeta = known.data as unknown as NonNullable<typeof postMeta>;
  }

  // Prefer already-known public cover URL when present
  if (postMeta?.cover_public_url) {
    try {
      const upstream = await fetch(postMeta.cover_public_url, {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
        headers: { accept: "image/*" },
      });
      if (upstream.ok) {
        const bytes = Buffer.from(await upstream.arrayBuffer());
        if (bytes.length >= MIN_PUBLIC_BYTES) {
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
      // fall through
    }
  }

  // Primary: Telegram Bot API (requires correct bot token for file_id)
  try {
    const upstream = await pluginImageResponse(fileId);
    const contentType =
      typeof upstream.headers?.get === "function"
        ? upstream.headers.get("content-type") || "image/jpeg"
        : "image/jpeg";
    return new NextResponse(upstream.body as BodyInit, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("plugin_image_bot_failed", detail.slice(0, 300));
  }

  // Fallback: public Telegram web preview for the photo message
  if (postMeta) {
    const pub = await fetchPublicTelegramCover(
      postMeta.telegram_post_url,
      postMeta.photo_message_id,
    );
    if (pub) {
      // Persist so next page load uses cover_public_url directly
      if (db && postMeta.id && pub.sourceUrl) {
        try {
          await db
            .from("telegram_plugin_posts")
            .update({
              cover_public_url: pub.sourceUrl,
              updated_at: new Date().toISOString(),
            })
            .eq("id", postMeta.id);
        } catch {
          // non-fatal
        }
      }
      return new NextResponse(pub.bytes, {
        status: 200,
        headers: {
          "content-type": pub.contentType,
          "cache-control": "public, max-age=1800, stale-while-revalidate=86400",
        },
      });
    }
  }

  return NextResponse.json(
    { error: "image_unavailable", detail: "telegram_cover_not_accessible" },
    { status: 404 },
  );
}
