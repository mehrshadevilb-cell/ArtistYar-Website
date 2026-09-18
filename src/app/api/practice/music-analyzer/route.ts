import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { autoChat } from "@/lib/ai-providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_LIMIT = 1;
const PRO_LIMIT = 50;
const ADMIN_LIMIT = 9999;
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
  const n = (k: string, fallback = 0) => (Number.isFinite(Number(input[k])) ? Number(input[k]) : fallback);
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  return {
    durationSec: clamp(n("durationSec"), 0, 3600),
    sampleRate: clamp(n("sampleRate"), 8000, 384000),
    channels: clamp(Math.round(n("channels", 2)), 1, 8),
    peakDbfs: clamp(n("peakDbfs"), -120, 6),
    rmsDbfs: clamp(n("rmsDbfs"), -120, 6),
    crestFactorDb: clamp(n("crestFactorDb"), 0, 60),
    stereoCorrelation: input.stereoCorrelation == null ? null : clamp(n("stereoCorrelation"), -1, 1),
    spectralCentroidHz: input.spectralCentroidHz == null ? null : clamp(n("spectralCentroidHz"), 20, 22000),
    lowEnergyPct: input.lowEnergyPct == null ? null : clamp(n("lowEnergyPct"), 0, 100),
    midEnergyPct: input.midEnergyPct == null ? null : clamp(n("midEnergyPct"), 0, 100),
    highEnergyPct: input.highEnergyPct == null ? null : clamp(n("highEnergyPct"), 0, 100),
  };
}

function fallback(m: any, genre: string, focus: string) {
  const low = m.lowEnergyPct ?? 33;
  const mid = m.midEnergyPct ?? 34;
  const high = m.highEnergyPct ?? 33;
  const corr = m.stereoCorrelation;
  const eq: string[] = [];
  if (low > 42) eq.push("Low سنگین است — sub/low-mid را با mono check کنترل کن (−1.5 تا −3 dB حدود 40–250Hz).");
  else if (low < 22) eq.push("Low ضعیف است — وزن kick/bass را کمی افزایش بده (+1 تا +2 dB حدود 50–100Hz).");
  else eq.push("Low در محدوده قابل‌قبول است؛ فقط تداخل kick/bass را جدا کن.");
  if (mid > 45) eq.push("Mid شلوغ است — mud حدود 200–500Hz را cut کن تا فضا باز شود.");
  else eq.push("Mid متعادل است؛ presence وکال/لید را با دقت جلو بیاور.");
  if (high > 40) eq.push("High زیاد است — harshness حدود 5–8kHz را کنترل کن؛ air را ملایم نگه دار.");
  else if (high < 18) eq.push("High کم‌انرژی است — کمی air (10–14kHz) برای باز شدن بالا اضافه کن.");
  else eq.push("High متعادل است؛ de-ess و taming را فقط در صورت نیاز اعمال کن.");

  return {
    fileSummary: `MUSIC ANALYZER برای «${genre}» با تمرکز «${focus}» — Peak ${m.peakDbfs.toFixed(1)} dBFS · RMS ${m.rmsDbfs.toFixed(1)} dBFS · Crest ${m.crestFactorDb.toFixed(1)} dB.`,
    matchScore: Math.max(35, Math.min(92, Math.round(70 - Math.abs((m.crestFactorDb || 10) - 10) * 2 - (m.peakDbfs > -0.5 ? 8 : 0)))),
    descriptors: {
      tonal: low > 40 ? "Bass-heavy" : high > 38 ? "Bright" : "Balanced EQ",
      stereo: corr == null ? "Unknown" : corr < 0.25 ? "Very Wide" : corr < 0.55 ? "Wide" : corr > 0.85 ? "Narrow / Focused" : "Balanced Width",
      dynamics: m.crestFactorDb < 6 ? "Squashed / Compressed" : m.crestFactorDb > 14 ? "Transient / Open" : "Balanced",
      loudness: m.rmsDbfs > -10 ? "Loud" : m.rmsDbfs > -16 ? "Balanced" : "Quiet",
    },
    loudness: {
      peak: `${m.peakDbfs.toFixed(1)} dBFS`,
      rms: `${m.rmsDbfs.toFixed(1)} dBFS`,
      crest: `${m.crestFactorDb.toFixed(1)} dB`,
      targetLufs: genre.toLowerCase().includes("edm") ? "-7 تا -6 LUFS (stream: -14)" : "-9 تا -8 LUFS (stream: -14)",
      truePeak: "≤ -1.0 dBTP",
    },
    tonal: {
      summary: `Low ${low.toFixed(0)}% · Mid ${mid.toFixed(0)}% · High ${high.toFixed(0)}%` + (m.spectralCentroidHz ? ` · Centroid ≈ ${Math.round(m.spectralCentroidHz)} Hz` : ""),
      low, mid, high, centroid: m.spectralCentroidHz,
    },
    stereo: {
      correlation: corr,
      advice: corr == null ? "Correlation در دسترس نیست." : corr < 0.35 ? "عرض زیاد است؛ mono compatibility لو-اند را چک کن." : corr > 0.9 ? "تقریباً mono است؛ عرض را روی mid/high باز کن." : "Correlation پایدار است؛ widening فقط بالای ~120Hz.",
    },
    dynamics: m.crestFactorDb < 6 ? "داینامیک فشرده است — قبل از لیمیت بیشتر، balance و transient را اصلاح کن." : m.crestFactorDb > 14 ? "فضای داینامیک زیاد است — glue ملایم روی باس میکس مفید است." : "داینامیک متعادل است.",
    clipping: m.peakDbfs >= -0.3 ? "پیک نزدیک/بالای سقف — gain staging و True Peak را فوری بررسی کن." : m.peakDbfs >= -1 ? "پیک نزدیک -1 dBFS — هدرووم کم." : "پیک زیر -1 dBFS و نسبتاً امن.",
    compression: {
      summary: "کمپرس را بعد از balance اعمال کن؛ هدف کنترل قله‌هاست نه فقط بلندتر شدن.",
      attack: "متوسط تا سریع روی باس؛ کمی آهسته‌تر روی kick برای punch",
      release: "هماهنگ با تمپو / groove",
      ratio: "۳:۱ تا ۴:۱ روی باس میکس",
      thresholdHint: "۱–۳ dB GR روی باس؛ ۳–۵ dB روی وکال در قله‌ها",
    },
    eq,
    mixBalance: [
      { element: "وکال / لید", advice: "در presence جلو باشد بدون harsh شدن" },
      { element: "درامز / کیک", advice: "وزن + click؛ تداخل با باس را جدا کن" },
      { element: "باس", advice: "محکم، کنترل‌شده، ساب تمیز و mono" },
      { element: "هارمونی / موسیقی", advice: "فضا بدهد؛ mid شلوغ نشود" },
    ],
    roadmap: [
      "Level-match با رفرنس هم‌سبک قبل از هر قضاوت.",
      "Peak/headroom و True Peak را امن کن.",
      "Low / Mid / High را با A/B و spectrum بررسی کن.",
      "Mono check روی لو-اند و correlation استریو.",
      "Compression هدفمند، بعد limiting نهایی.",
      "دوباره با رفرنس A/B کن.",
    ],
    quickFixes: ["Cut mud قبل از boost حضور", "Sub را mono نگه دار", "Limiter فقط سقف بدهد نه اصلاح EQ", "A/B هر ۳۰–۶۰ ثانیه"],
    referenceTips: "مثل Reference 3: Level Line را دنبال کن (بالای صفر = boost، زیر صفر = cut). هدف نزدیکی ±۳ dB تونال.",
    source: "metrics-fallback",
  };
}

function parseJson(text: string) {
  const s = text.trim();
  try { return JSON.parse(s); } catch {}
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch {} }
  return null;
}

function resolveLimit(isAdmin: boolean, pro: boolean) {
  if (isAdmin) return ADMIN_LIMIT;
  return pro ? PRO_LIMIT : FREE_LIMIT;
}

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const ids = Array.from(new Set([p.get("userId") || "", p.get("telegramId") || ""].filter(Boolean)));
  const isAdmin = p.get("role") === "admin";
  if (isAdmin) {
    return NextResponse.json({ ok: true, limit: ADMIN_LIMIT, used: 0, remaining: ADMIN_LIMIT, pro: true, admin: true });
  }
  if (!ids.length || !db) {
    return NextResponse.json({ ok: true, limit: FREE_LIMIT, used: 0, remaining: FREE_LIMIT, pro: false, admin: false });
  }
  const [used, pro] = await Promise.all([countUsed(ids), isPro(ids)]);
  const limit = resolveLimit(false, pro);
  return NextResponse.json({ ok: true, limit, used, remaining: Math.max(0, limit - used), pro, admin: false });
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, error: "invalid_form" }, { status: 400 });

  const file = form.get("file");
  const userId = String(form.get("userId") || "").trim();
  const telegramId = String(form.get("telegramId") || "").trim();
  const role = String(form.get("role") || "").trim().toLowerCase();
  const isAdmin = role === "admin";
  const genre = String(form.get("genre") || "عمومی").slice(0, 80);
  const focus = String(form.get("focus") || "فول میکس").slice(0, 80);
  const notes = String(form.get("notes") || "").slice(0, 800);

  let m = null;
  try { m = metricsOf(JSON.parse(String(form.get("metrics") || "{}"))); } catch {}

  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "audio_file_required" }, { status: 400 });
  if (!m) return NextResponse.json({ ok: false, error: "audio_metrics_required" }, { status: 400 });
  if (!userId && !telegramId && !isAdmin) return NextResponse.json({ ok: false, error: "login_required" }, { status: 401 });
  if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "file_too_large_or_empty" }, { status: 413 });

  const ids = Array.from(new Set([userId, telegramId].filter(Boolean)));
  const pro = isAdmin ? true : await isPro(ids);
  const limit = resolveLimit(isAdmin, pro);
  const used = isAdmin ? 0 : await countUsed(ids);
  if (!isAdmin && used >= limit) {
    return NextResponse.json({ ok: false, code: "daily_limit_reached", limit, used, remaining: 0, pro, admin: false }, { status: 429 });
  }

  const enriched = { ...m };
  let analysis = fallback(enriched, genre, focus);

  try {
    const system = `تو مهندس حرفه‌ای میکس/مستر هستی و مثل پلاگین Reference 3 تحلیل می‌کنی.
داده‌های متریک از فایل واقعی استخراج شده‌اند. اعداد را جعل نکن.
فقط JSON معتبر برگردان با کلیدها:
fileSummary, matchScore(0-100),
descriptors{tonal,stereo,dynamics,loudness},
loudness{peak,rms,crest,targetLufs,truePeak},
tonal{summary,low,mid,high,centroid},
stereo{correlation,advice},
dynamics, clipping,
compression{summary,attack,release,ratio,thresholdHint},
eq[string], mixBalance[{element,advice}],
roadmap[string], quickFixes[string], referenceTips, source.
متن‌ها فارسی و عملی باشند.`;
    const prompt = `Filename: ${(file as File).name}\nMetrics: ${JSON.stringify(enriched)}\nGenre: ${genre}\nFocus: ${focus}\nNotes: ${notes || "—"}`;
    const result = await autoChat([{ role: "system", content: system }, { role: "user", content: prompt }], undefined, undefined, "artistyar-music-analyzer");
    const parsed = parseJson(result.reply);
    if (parsed && typeof parsed === "object") {
      analysis = { ...analysis, ...parsed, source: `ai:${result.provider}/${result.model}` };
    }
  } catch { /* keep fallback */ }

  if (db && (userId || telegramId)) {
    await db.from("practice_records").insert({
      user_id: userId || telegramId,
      username: userId || telegramId,
      full_name: "",
      game_id: "music-analyzer",
      score: 5,
      accuracy: 100,
      streak: 1,
      best_score: 5,
      metadata: { genre, focus, fileName: (file as File).name.slice(0, 120), durationSec: enriched.durationSec, metrics: enriched, source: analysis.source, admin: isAdmin },
    });
  }

  return NextResponse.json({
    ok: true,
    analysis,
    metrics: enriched,
    quota: { limit, used: isAdmin ? 0 : used + 1, remaining: isAdmin ? ADMIN_LIMIT : Math.max(0, limit - used - 1), pro, admin: isAdmin },
  });
}
