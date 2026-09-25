/**
 * HitNevis adaptive learning.
 * Persists only derived signals and aggregate patterns.
 * Never stores lyric text, prompts, or copyrighted song lyrics.
 */
import { createClient } from "@supabase/supabase-js";
import type { LyricCorpusFeatures } from "./kb/lyric-features";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = url && secret
  ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export type AdaptiveSignal = "positive" | "negative" | "used" | "rejected";

export type AdaptiveFeedback = {
  mode: string;
  signal: AdaptiveSignal;
  features?: Pick<
    LyricCorpusFeatures,
    "lineCount" | "wordCount" | "sectionCount" | "chorusLikeSections" |
    "repeatedLineRate" | "repeatedEndWordRate" | "clicheRiskHits" | "prosody"
  >;
};

function compactFeatures(features?: AdaptiveFeedback["features"]) {
  if (!features) return {};
  return {
    lineCount: Math.min(200, Math.max(0, features.lineCount)),
    wordCount: Math.min(3000, Math.max(0, features.wordCount)),
    sectionCount: Math.min(30, Math.max(0, features.sectionCount)),
    chorusLikeSections: Math.min(10, Math.max(0, features.chorusLikeSections)),
    repeatedLineRate: Math.round(features.repeatedLineRate * 1000) / 1000,
    repeatedEndWordRate: Math.round(features.repeatedEndWordRate * 1000) / 1000,
    clicheRiskCount: features.clicheRiskHits.length,
    averageSyllables: features.prosody.averageSyllables,
    syllableSpread: features.prosody.syllableSpread,
  };
}

export async function recordHitNevisFeedback(input: AdaptiveFeedback): Promise<void> {
  if (!supabase) return;
  await supabase.from("hitnevis_feedback").insert({
    mode: input.mode.slice(0, 64),
    signal: input.signal,
    feature_version: "1.0",
    feature_snapshot: compactFeatures(input.features),
  });
}

type FeedbackRow = {
  mode: string;
  signal: AdaptiveSignal;
  feature_snapshot: Record<string, number>;
  created_at: string;
};

let adaptiveCache: { expiresAt: number; value: string } | null = null;
const ADAPTIVE_CACHE_MS = 60_000;

export async function getAdaptiveHitNevisContext(maxChars = 3200): Promise<string> {
  if (!supabase) return "";
  if (adaptiveCache && adaptiveCache.expiresAt > Date.now()) return adaptiveCache.value.slice(0, maxChars);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [profileResult, result] = await Promise.all([
    supabase.from("hitnevis_adaptive_profile").select("profile,sample_count,generated_at").eq("id", true).maybeSingle(),
    supabase.from("hitnevis_feedback").select("mode,signal,feature_snapshot,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(1500),
  ]);
  if (result.error && !profileResult.data) return "";

  const rows = (result.data || []) as FeedbackRow[];
  const byMode = new Map<string, { positive: number; negative: number; used: number; rejected: number }>();
  let positive = 0, negative = 0, used = 0, rejected = 0;
  for (const row of rows) {
    const item = byMode.get(row.mode) || { positive: 0, negative: 0, used: 0, rejected: 0 };
    item[row.signal] += 1;
    byMode.set(row.mode, item);
    if (row.signal === "positive") positive += 1;
    if (row.signal === "negative") negative += 1;
    if (row.signal === "used") used += 1;
    if (row.signal === "rejected") rejected += 1;
  }

  const modeLines = [...byMode.entries()]
    .map(([mode, stats]) => {
      const rated = stats.positive + stats.negative;
      return { mode, stats, rate: rated ? Math.round((stats.positive / rated) * 100) : null };
    })
    .filter((item) => item.rate !== null)
    .sort((a, b) => (b.stats.positive + b.stats.negative) - (a.stats.positive + a.stats.negative))
    .slice(0, 8)
    .map((item) => "- " + item.mode + ": بازخورد مثبت " + item.rate + "% از " +
      (item.stats.positive + item.stats.negative) + " رأی؛ استفاده " + item.stats.used + "؛ رد " + item.stats.rejected);

  const featureRows = rows.filter((r) => r.signal === "positive" || r.signal === "used");
  const avg = (key: string) => {
    const vals = featureRows.map((r) => Number(r.feature_snapshot?.[key])).filter(Number.isFinite);
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  };
  const profile = profileResult.data?.profile as Record<string, unknown> | undefined;
  const averages = profile?.averages as Record<string, unknown> | undefined;
  const profileLine = averages
    ? "پروفایل corpus مجاز: " + String(profileResult.data?.sample_count || 0) +
      " آهنگ؛ میانگین هجا " + String(averages.averageSyllables ?? "—") +
      "؛ دامنه هجا " + String(averages.syllableSpread ?? "—") +
      "؛ تکرار خط " + String(averages.repeatedLineRate ?? "—") + "."
    : "";

  const lines = [
    profileLine,
    "یادگیری تطبیقی ۳۰ روز اخیر: " + rows.length + " سیگنال ناشناس از رفتار کاربر.",
    "مثبت=" + positive + "، منفی=" + negative + "، استفاده‌شده=" + used + "، ردشده=" + rejected + ".",
  ];
  if (modeLines.length) lines.push("روندهای قابل اتکا بر اساس mode:", ...modeLines);
  const avgSpread = avg("syllableSpread");
  const avgRepeat = avg("repeatedLineRate");
  const avgEndRepeat = avg("repeatedEndWordRate");
  if (avgSpread !== null || avgRepeat !== null || avgEndRepeat !== null) {
    lines.push("ویژگی متن در نمونه‌های بازخورد مثبت/استفاده‌شده: دامنه هجا " +
      (avgSpread ?? "—") + "؛ تکرار خط " + (avgRepeat ?? "—") +
      "؛ تکرار پایان‌واژه " + (avgEndRepeat ?? "—") + ".");
  }
  lines.push("از این داده فقط برای تنظیم کیفیت و اولویت پیشنهادها استفاده کن؛ نتیجه‌گیری قطعی یا تقلید از فرد/ترانه انجام نده.");
  const value = lines.filter(Boolean).join("\n");
  adaptiveCache = { expiresAt: Date.now() + ADAPTIVE_CACHE_MS, value };
  return value.slice(0, maxChars);
}
