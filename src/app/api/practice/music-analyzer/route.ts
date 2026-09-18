import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { autoChat } from "@/lib/ai-providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_LIMIT = 1;
const PRO_LIMIT = 40;
const MAX_BYTES = 50 * 1024 * 1024;
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const db = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

function startOfDay() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}
async function isPro(ids: string[]) {
  if (!db || !ids.length) return false;
  const q = await db.from("practice_subscriptions").select("id").in("user_id", ids).eq("status", "active").gt("expires_at", new Date().toISOString()).limit(1);
  return Boolean(q.data && q.data.length);
}
async function countUsed(ids: string[]) {
  if (!db || !ids.length) return 0;
  const q = await db.from("practice_records").select("id").in("user_id", ids).eq("game_id", "music-analyzer").gte("played_at", startOfDay());
  return q.data ? q.data.length : 0;
}
function metricsOf(input: any) {
  if (!input || typeof input !== "object") return null;
  const n = (k: string, fallback = 0) => Number.isFinite(Number(input[k])) ? Number(input[k]) : fallback;
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  return {
    durationSec: clamp(n("durationSec"), 0, 3600), sampleRate: clamp(n("sampleRate"), 8000, 384000),
    channels: clamp(Math.round(n("channels", 2)), 1, 8), peakDbfs: clamp(n("peakDbfs"), -120, 6),
    rmsDbfs: clamp(n("rmsDbfs"), -120, 6), crestFactorDb: clamp(n("crestFactorDb"), 0, 60),
    stereoCorrelation: input.stereoCorrelation == null ? null : clamp(n("stereoCorrelation"), -1, 1),
    spectralCentroidHz: input.spectralCentroidHz == null ? null : clamp(n("spectralCentroidHz"), 20, 22000),
    lowEnergyPct: input.lowEnergyPct == null ? null : clamp(n("lowEnergyPct"), 0, 100),
    midEnergyPct: input.midEnergyPct == null ? null : clamp(n("midEnergyPct"), 0, 100),
    highEnergyPct: input.highEnergyPct == null ? null : clamp(n("highEnergyPct"), 0, 100)
  };
}
function fallback(m: any, genre: string, focus: string) {
  return {
    fileSummary: "تحلیل اندازه‌گیری‌محور برای " + genre + " با تمرکز " + focus + ".",
    loudness: { peak: m.peakDbfs.toFixed(1) + " dBFS", rms: m.rmsDbfs.toFixed(1) + " dBFS", crest: m.crestFactorDb.toFixed(1) + " dB" },
    tonal: { summary: "پروفایل طیفی بر اساس centroid و انرژی سه ناحیه تخمین زده شده است.", low: m.lowEnergyPct, mid: m.midEnergyPct, high: m.highEnergyPct, centroid: m.spectralCentroidHz },
    stereo: { correlation: m.stereoCorrelation, advice: m.stereoCorrelation == null ? "Correlation در دسترس نیست." : m.stereoCorrelation < 0.35 ? "عرض استریو زیاد است؛ mono compatibility را چک کن." : "Correlation نسبتاً پایدار است." },
    dynamics: m.crestFactorDb < 6 ? "داینامیک نسبتاً فشرده است؛ gain reduction واقعی را با meter چک کن." : "فضای داینامیک بیشتری دیده می‌شود؛ compression را بر اساس transient تنظیم کن.",
    clipping: m.peakDbfs < -1 ? "پیک زیر -1 dBFS است." : "پیک به سقف نزدیک است؛ gain staging را بررسی کن.",
    eq: ["Low-end را با spectrum و mono check بررسی کن.", "Low-mid را قبل از boostهای زیاد کنترل کن.", "High-end را بر اساس harshness واقعی تنظیم کن."],
    roadmap: ["Level-match با reference.", "Peak و headroom را بررسی کن.", "Low / Mid / High را A/B کن.", "Mono و stereo correlation را چک کن.", "Compression و limiting را بعد از balance تنظیم کن."],
    source: "metrics-fallback"
  };
}
function parseJson(text: string) {
  const s = text.trim();
  try { return JSON.parse(s); } catch {}
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch {} }
  return null;
}

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const ids = Array.from(new Set([p.get("userId") || "", p.get("telegramId") || ""].filter(Boolean)));
  if (!ids.length || !db) return NextResponse.json({ ok: true, limit: FREE_LIMIT, used: 0, remaining: FREE_LIMIT, pro: false });
  const [used, pro] = await Promise.all([countUsed(ids), isPro(ids)]);
  const limit = pro ? PRO_LIMIT : FREE_LIMIT;
  return NextResponse.json({ ok: true, limit, used, remaining: Math.max(0, limit - used), pro });
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, error: "invalid_form" }, { status: 400 });
  const file = form.get("file");
  const userId = String(form.get("userId") || "").trim();
  const telegramId = String(form.get("telegramId") || "").trim();
  const genre = String(form.get("genre") || "عمومی").slice(0, 80);
  const focus = String(form.get("focus") || "فول میکس").slice(0, 80);
  const notes = String(form.get("notes") || "").slice(0, 800);
  let m = null;
  try { m = metricsOf(JSON.parse(String(form.get("metrics") || "{}"))); } catch {}
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "audio_file_required" }, { status: 400 });
  if (!m) return NextResponse.json({ ok: false, error: "audio_metrics_required" }, { status: 400 });
  if (!userId && !telegramId) return NextResponse.json({ ok: false, error: "login_required" }, { status: 401 });
  if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "file_too_large_or_empty" }, { status: 413 });

  const ids = Array.from(new Set([userId, telegramId].filter(Boolean)));
  const pro = await isPro(ids);
  const limit = pro ? PRO_LIMIT : FREE_LIMIT;
  const used = await countUsed(ids);
  if (used >= limit) return NextResponse.json({ ok: false, code: "daily_limit_reached", limit, used, remaining: 0, pro }, { status: 429 });

  const enriched = Object.assign({}, m);
  let analysis = fallback(enriched, genre, focus);

  try {
    const system = "تو یک مهندس حرفه‌ای میکس و مستر هستی. داده‌های زیر از فایل واقعی استخراج شده‌اند. فقط JSON معتبر با کلیدهای fileSummary,loudness,tonal,stereo,dynamics,clipping,eq,roadmap,source برگردان. هیچ عددی را بدون اتکا به داده جعل نکن. LUFS واقعی یا phase دقیق را بدون اندازه‌گیری ادعا نکن.";
    const prompt = "Filename: " + file.name + "\nMetrics: " + JSON.stringify(enriched) + "\nGenre: " + genre + "\nFocus: " + focus + "\nNotes: " + (notes || "—");
    const result = await autoChat([{ role: "system", content: system }, { role: "user", content: prompt }], undefined, undefined, "artistyar-music-analyzer");
    const parsed = parseJson(result.reply);
    if (parsed && typeof parsed === "object") analysis = Object.assign({}, analysis, parsed, { source: "ai:" + result.provider + "/" + result.model });
  } catch {}

  if (db) await db.from("practice_records").insert({
    user_id: userId || telegramId, username: userId || telegramId, full_name: "", game_id: "music-analyzer",
    score: 5, accuracy: 100, streak: 1, best_score: 5,
    metadata: { genre, focus, fileName: file.name.slice(0, 120), durationSec: duration, metrics: enriched, source: analysis.source }
  });
  return NextResponse.json({ ok: true, analysis, metrics: enriched, quota: { limit, used: used + 1, remaining: Math.max(0, limit - used - 1), pro } });
}
