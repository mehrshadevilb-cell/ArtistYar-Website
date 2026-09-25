import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { RECENT_TOP_100 } from "@/lib/hitnevis/kb/recent-hit-corpus";
import { extractLyricFeatures } from "@/lib/hitnevis/kb/lyric-features";
import { hashLicensedLyrics } from "@/lib/hitnevis/copyright-similarity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "");
const feedUrl = String(process.env.HITNEVIS_AUTHORIZED_LYRIC_FEED_URL || "").trim();
const cronSecret = String(process.env.HITNEVIS_TRAIN_SECRET || "").trim();
const supabase = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

type FeedSong = { title?: unknown; artist?: unknown; lyrics?: unknown; sourceUrl?: unknown; license?: unknown; updatedAt?: unknown };

function authorizedLicense(value: unknown) {
  if (typeof value !== "string") return false;
  return ["authorized", "licensed", "public-domain", "public_domain", "permission-granted"].includes(value.trim().toLowerCase());
}
function songKey(title: string, artist: string) {
  return (artist + "::" + title).normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}
function checkSecret(request: Request) {
  if (!cronSecret) return false;
  const auth = request.headers.get("authorization") || "";
  const supplied = auth.startsWith("Bearer ") ? auth.slice(7).trim() : request.headers.get("x-hitnevis-cron-secret") || "";
  return supplied === cronSecret;
}
async function updateProfile(rows: Array<{ title: string; artist: string; feature_snapshot: Record<string, unknown> }>) {
  if (!supabase || !rows.length) return;
  const avg = (name: string) => {
    const values = rows.map((r) => Number(r.feature_snapshot[name])).filter(Number.isFinite);
    return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length * 100) / 100 : null;
  };
  const artists = new Map<string, number>();
  for (const row of rows) artists.set(row.artist, (artists.get(row.artist) || 0) + 1);
  await supabase.from("hitnevis_adaptive_profile").upsert({
    id: true,
    profile: {
      version: "daily-v1",
      generatedAt: new Date().toISOString(),
      licensedSongCount: rows.length,
      topArtists: [...artists.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12),
      averages: {
        lineCount: avg("lineCount"), wordCount: avg("wordCount"),
        repeatedLineRate: avg("repeatedLineRate"), repeatedEndWordRate: avg("repeatedEndWordRate"),
        averageSyllables: avg("averageSyllables"), syllableSpread: avg("syllableSpread"),
        clicheRiskCount: avg("clicheRiskCount"),
      },
      songs: rows.slice(0, 100).map((r) => ({ title: r.title, artist: r.artist })),
    },
    sample_count: rows.length,
    generated_at: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  if (!checkSecret(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!supabase) return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 503 });
  if (!feedUrl) return NextResponse.json({ ok: false, error: "authorized_lyric_feed_not_configured" }, { status: 503 });

  const run = await supabase.from("hitnevis_training_runs").insert({
    status: "running", started_at: new Date().toISOString(),
    summary: { targetSongCount: RECENT_TOP_100.length, source: feedUrl },
  }).select("id").single();
  const runId = run.data?.id;

  try {
    const response = await fetch(feedUrl, { cache: "no-store", signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error("feed_http_" + response.status);
    const payload = await response.json() as unknown;
    const rawSongs = Array.isArray(payload) ? payload : (payload && typeof payload === "object" && Array.isArray((payload as { songs?: unknown }).songs) ? (payload as { songs: unknown[] }).songs : []);
    const targetKeys = new Set(RECENT_TOP_100.map((s) => songKey(s.title, s.artist)));
    const songs = rawSongs
      .filter((x): x is FeedSong => !!x && typeof x === "object")
      .filter((x) => authorizedLicense(x.license))
      .filter((x) => typeof x.title === "string" && typeof x.artist === "string" && typeof x.lyrics === "string")
      .filter((x) => typeof x.sourceUrl === "string" && /^https?:\/\//i.test(x.sourceUrl))
      .filter((x) => targetKeys.has(songKey(x.title as string, x.artist as string)))
      .slice(0, 100);

    let ingested = 0;
    for (const song of songs) {
      const lyrics = (song.lyrics as string).trim().slice(0, 50000);
      if (!lyrics) continue;
      const features = extractLyricFeatures(lyrics);
      const featureSnapshot = {
        lineCount: features.lineCount, wordCount: features.wordCount, sectionCount: features.sectionCount,
        chorusLikeSections: features.chorusLikeSections, repeatedLineRate: features.repeatedLineRate,
        repeatedEndWordRate: features.repeatedEndWordRate, clicheRiskCount: features.clicheRiskHits.length,
        averageSyllables: features.prosody.averageSyllables, syllableSpread: features.prosody.syllableSpread,
      };
      const result = await supabase.from("hitnevis_licensed_lyrics").upsert({
        song_key: songKey(song.title as string, song.artist as string),
        title: (song.title as string).trim().slice(0, 300),
        artist: (song.artist as string).trim().slice(0, 300),
        lyrics, source_url: (song.sourceUrl as string).trim().slice(0, 1000),
        license: String(song.license).trim().slice(0, 120),
        source_updated_at: typeof song.updatedAt === "string" ? song.updatedAt : null,
        feature_version: features.featureVersion, feature_snapshot: featureSnapshot,
        content_sha256: hashLicensedLyrics(lyrics),
        ingested_at: new Date().toISOString(), analyzed_at: new Date().toISOString(),
      }, { onConflict: "song_key" });
      if (result.error) throw result.error;
      ingested += 1;
    }

    const all = await supabase.from("hitnevis_licensed_lyrics").select("title,artist,feature_snapshot").order("analyzed_at", { ascending: false }).limit(100);
    if (all.error) throw all.error;
    await updateProfile((all.data || []) as Array<{ title: string; artist: string; feature_snapshot: Record<string, unknown> }>);

    if (runId) await supabase.from("hitnevis_training_runs").update({
      status: "completed", finished_at: new Date().toISOString(),
      discovered_count: songs.length, ingested_count: ingested, analyzed_count: ingested, error_count: 0,
      summary: { targetSongCount: RECENT_TOP_100.length, licensedMatches: songs.length },
      error_message: null,
    }).eq("id", runId);

    return NextResponse.json({ ok: true, targetSongCount: RECENT_TOP_100.length, licensedMatches: songs.length, ingested, analyzed: ingested, trainedAt: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "training_failed";
    if (runId) await supabase.from("hitnevis_training_runs").update({ status: "failed", finished_at: new Date().toISOString(), error_count: 1, error_message: message }).eq("id", runId);
    console.error("[hitnevis/cron/train]", message);
    return NextResponse.json({ ok: false, error: "training_failed" }, { status: 500 });
  }
}
