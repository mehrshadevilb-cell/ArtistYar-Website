import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = url && secret
  ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export type HitSimilarity = {
  title: string;
  artist: string;
  score: number;
  matchedNgrams: number;
};

function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/ي/g, "ی").replace(/ك/g, "ک")
    .replace(/[\u200c\u200d]/g, " ")
    .replace(/[«»“”"'.,،!?؟:;()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function ngrams(text: string, size = 5): Set<string> {
  const words = normalize(text).split(" ").filter(Boolean);
  const result = new Set<string>();
  for (let i = 0; i + size <= words.length; i += 1) {
    result.add(words.slice(i, i + size).join(" "));
  }
  return result;
}

export function hashLicensedLyrics(lyrics: string): string {
  return createHash("sha256").update(normalize(lyrics), "utf8").digest("hex");
}

export async function findHitNevisSimilarity(text: string, limit = 3): Promise<HitSimilarity[]> {
  if (!supabase || !text.trim()) return [];
  const input = ngrams(text);
  if (input.size < 2) return [];

  const result = await supabase
    .from("hitnevis_licensed_lyrics")
    .select("title,artist,lyrics")
    .limit(120);

  if (result.error || !result.data?.length) return [];

  const matches: HitSimilarity[] = [];
  for (const row of result.data as Array<{ title: string; artist: string; lyrics: string }>) {
    const candidate = ngrams(row.lyrics);
    let overlap = 0;
    for (const gram of input) if (candidate.has(gram)) overlap += 1;
    if (!overlap) continue;
    const union = input.size + candidate.size - overlap;
    const score = union ? overlap / union : 0;
    if (score >= 0.08 || overlap >= 2) {
      matches.push({
        title: row.title,
        artist: row.artist,
        score: Math.round(score * 1000) / 1000,
        matchedNgrams: overlap,
      });
    }
  }

  return matches
    .sort((a, b) => (b.score - a.score) || (b.matchedNgrams - a.matchedNgrams))
    .slice(0, limit);
}
