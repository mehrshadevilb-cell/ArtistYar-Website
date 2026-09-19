import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, USER_SESSION_COOKIE, verifyAdminSession, verifyUserSession } from "@/lib/server-admin-auth";
import { createClient } from "@supabase/supabase-js";
import { autoChat } from "@/lib/ai-providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_LIMIT = 1;
const COURSE_LIMIT = 5;
const PRO_LIMIT = 9999;
const ADMIN_LIMIT = 9999;
const MAX_BYTES = 50 * 1024 * 1024;

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const db = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

function startOfDay() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

async function currentIdentity(): Promise<{ id: string; telegramId?: string; admin: boolean } | null> {
  const jar = await cookies();
  const admin = verifyAdminSession(jar.get(ADMIN_SESSION_COOKIE)?.value);
  if (admin) return { id: "admin", admin: true };
  const user = verifyUserSession(jar.get(USER_SESSION_COOKIE)?.value);
  return user ? { id: user.id, telegramId: user.telegramId, admin: false } : null;
}

async function isPro(ids: string[]) {
  if (!db || !ids.length) return false;
  const q = await db.from("practice_subscriptions").select("id").in("user_id", ids).eq("status", "active").gt("expires_at", new Date().toISOString()).limit(1);
  return Boolean(q.data && q.data.length);
}

async function hasActiveCourse(ids: string[]): Promise<boolean> {
  if (!ids.length) return false;
  const key = (process.env.WEB_ADMIN_API_KEY || "").trim();
  if (!key) return false;
  try {
    const base = (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(/\/$/, "");
    for (const id of ids) {
      const qs = new URLSearchParams({ q: id, limit: "30" });
      const res = await fetch(`${base}/api/v1/admin/students?${qs}`, {
        headers: { "X-Admin-Key": key }, cache: "no-store", signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      const rows = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.students) ? data.students : [];
      const hit = rows.find((x: any) => String(x.telegram_id || "") === id || String(x.id || "") === id);
      if (hit?.id) return true;
    }
  } catch { /* ignore */ }
  return false;
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
  const be = input.bandEnergy && typeof input.bandEnergy === "object" ? input.bandEnergy : null;
  return {
    durationSec: clamp(n("durationSec"), 0, 3600),
    sampleRate: clamp(n("sampleRate"), 8000, 384000),
    channels: clamp(Math.round(n("channels", 2)), 1, 8),
    peakDbfs: clamp(n("peakDbfs"), -120, 6),
    truePeakDbfs: input.truePeakDbfs == null ? null : clamp(n("truePeakDbfs"), -120, 6),
    rmsDbfs: clamp(n("rmsDbfs"), -120, 6),
    crestFactorDb: clamp(n("crestFactorDb"), 0, 60),
    stereoCorrelation: input.stereoCorrelation == null ? null : clamp(n("stereoCorrelation"), -1, 1),
    stereoWidth: input.stereoWidth == null ? null : clamp(n("stereoWidth"), 0, 1),
    spectralCentroidHz: input.spectralCentroidHz == null ? null : clamp(n("spectralCentroidHz"), 20, 22000),
    lowEnergyPct: input.lowEnergyPct == null ? null : clamp(n("lowEnergyPct"), 0, 100),
    midEnergyPct: input.midEnergyPct == null ? null : clamp(n("midEnergyPct"), 0, 100),
    highEnergyPct: input.highEnergyPct == null ? null : clamp(n("highEnergyPct"), 0, 100),
    clipPct: input.clipPct == null ? null : clamp(n("clipPct"), 0, 100),
    bandEnergy: be ? {
      sub: clamp(Number(be.sub) || 0, 0, 100),
      low: clamp(Number(be.low) || 0, 0, 100),
      lowMid: clamp(Number(be.lowMid) || 0, 0, 100),
      mid: clamp(Number(be.mid) || 0, 0, 100),
      presence: clamp(Number(be.presence) || 0, 0, 100),
      high: clamp(Number(be.high) || 0, 0, 100),
      air: clamp(Number(be.air) || 0, 0, 100),
    } : null,
    approxLufs: input.approxLufs == null ? null : clamp(n("approxLufs"), -60, 0),
    loudnessRangeProxy: input.loudnessRangeProxy == null ? null : clamp(n("loudnessRangeProxy"), 0, 40),
  };
}

function strictScore(m: any, genre: string, ref: any | null) {
  if (ref) {
    let score = 88;
    const dPeak = Math.abs((m.peakDbfs ?? 0) - (ref.peakDbfs ?? 0));
    const dRms = Math.abs((m.rmsDbfs ?? 0) - (ref.rmsDbfs ?? 0));
    const dCrest = Math.abs((m.crestFactorDb ?? 0) - (ref.crestFactorDb ?? 0));
    const dLow = Math.abs((m.lowEnergyPct ?? 33) - (ref.lowEnergyPct ?? 33));
    const dHigh = Math.abs((m.highEnergyPct ?? 33) - (ref.highEnergyPct ?? 33));
    if (dPeak > 3) score -= 14; else if (dPeak > 1.5) score -= 7;
    if (dRms > 4) score -= 16; else if (dRms > 2) score -= 8;
    if (dCrest > 4) score -= 10; else if (dCrest > 2) score -= 5;
    if (dLow > 15) score -= 12; else if (dLow > 8) score -= 6;
    if (dHigh > 15) score -= 10; else if (dHigh > 8) score -= 5;
    if (m.peakDbfs > -0.3) score -= 10;
    if (m.clipPct && m.clipPct > 0.3) score -= 8;
    return Math.max(22, Math.min(96, Math.round(score)));
  }
  let score = 82;
  if (m.peakDbfs > -0.3) score -= 20;
  else if (m.peakDbfs > -1) score -= 12;
  else if (m.peakDbfs > -1.5) score -= 5;
  if (m.crestFactorDb < 5) score -= 16;
  else if (m.crestFactorDb < 7) score -= 9;
  else if (m.crestFactorDb > 16) score -= 4;
  const low = m.lowEnergyPct ?? 33;
  if (low > 48 || low < 18) score -= 12;
  else if (low > 42 || low < 22) score -= 6;
  if (m.clipPct && m.clipPct > 0.5) score -= 15;
  else if (m.clipPct && m.clipPct > 0.1) score -= 6;
  if (m.stereoCorrelation != null && m.stereoCorrelation < 0.15) score -= 5;
  if (/edm|trap|hip/i.test(genre) && m.crestFactorDb > 12) score -= 4;
  return Math.max(25, Math.min(94, Math.round(score)));
}

function fallback(m: any, genre: string, focus: string, ref: any | null) {
  const low = m.lowEnergyPct ?? 33;
  const mid = m.midEnergyPct ?? 34;
  const high = m.highEnergyPct ?? 33;
  const corr = m.stereoCorrelation;
  const eq: string[] = [];
  if (ref) {
    const dRms = (m.rmsDbfs ?? 0) - (ref.rmsDbfs ?? 0);
    const dLow = (m.lowEnergyPct ?? 33) - (ref.lowEnergyPct ?? 33);
    const dHigh = (m.highEnergyPct ?? 33) - (ref.highEnergyPct ?? 33);
    const dCrest = (m.crestFactorDb ?? 0) - (ref.crestFactorDb ?? 0);
    if (dRms > 2) eq.push(`بلندی از رفرنس بیشتر است (RMS حدود ${dRms.toFixed(1)} dB بالاتر) — گین کلی را کم کن.`);
    else if (dRms < -2) eq.push(`بلندی از رفرنس کمتر است (RMS حدود ${Math.abs(dRms).toFixed(1)} dB پایین‌تر) — سطح را نزدیک رفرنس کن.`);
    if (dLow > 8) eq.push("بیس نسبت به رفرنس سنگین‌تر است — پایین را کم کن و با رفرنس A/B کن.");
    else if (dLow < -8) eq.push("بیس نسبت به رفرنس ضعیف‌تر است — کیک/باس را کمی پر کن.");
    if (dHigh > 8) eq.push("بالا نسبت به رفرنس تیزتر است — ۵ تا ۱۰ کیلوهرتز را کنترل کن.");
    else if (dHigh < -8) eq.push("بالا نسبت به رفرنس کم‌انرژی است — کمی هوا اضافه کن.");
    if (dCrest < -3) eq.push("داینامیک از رفرنس فشرده‌تر است — کمپرس/لیمیتر را ملایم‌تر کن.");
    else if (dCrest > 3) eq.push("داینامیک از رفرنس بازتر است — کمپرس ملایم برای نزدیک شدن به رفرنس مفید است.");
    if (!eq.length) eq.push("تعادل کلی به رفرنس نزدیک است؛ جزئیات وکال و عرض استریو را با A/B چک کن.");
  } else {
    if (low > 42) eq.push("بیس سنگین است — حدود ۴۰ تا ۲۵۰ هرتز را ۱٫۵ تا ۳ دسی‌بل کم کن و باس را مونو چک کن.");
    else if (low < 22) eq.push("بیس ضعیف است — کیک/باس را حدود ۵۰ تا ۱۰۰ هرتز کمی بلندتر کن.");
    else eq.push("بیس قابل‌قبول است؛ فقط تداخل کیک و باس را جدا کن.");
    if (mid > 45) eq.push("میانی شلوغ است — حدود ۲۰۰ تا ۵۰۰ هرتز را کم کن تا فضا باز شود.");
    else eq.push("میانی متعادل است؛ حضور وکال را با دقت جلو بیاور.");
    if (high > 40) eq.push("بالا تیز است — حدود ۵ تا ۸ کیلوهرتز را کنترل کن.");
    else if (high < 18) eq.push("بالا کم‌انرژی است — کمی هوا در ۱۰ تا ۱۴ کیلوهرتز اضافه کن.");
    else eq.push("بالا متعادل است.");
  }

  const score = strictScore(m, genre, ref);
  const summaryBase = ref
    ? `مقایسه سخت‌گیرانه با رفرنس کاربر. Peak ${m.peakDbfs.toFixed(1)} در برابر ${(ref.peakDbfs ?? 0).toFixed(1)} · RMS ${m.rmsDbfs.toFixed(1)} در برابر ${(ref.rmsDbfs ?? 0).toFixed(1)} · Crest ${m.crestFactorDb.toFixed(1)} در برابر ${(ref.crestFactorDb ?? 0).toFixed(1)}.`
    : `تحلیل سخت‌گیرانه برای «${genre}» با تمرکز «${focus}». Peak ${m.peakDbfs.toFixed(1)} dBFS · RMS ${m.rmsDbfs.toFixed(1)} dBFS · Crest ${m.crestFactorDb.toFixed(1)} dB.` + (m.approxLufs != null ? ` · ≈${m.approxLufs.toFixed(1)} LUFS` : "");

  return {
    fileSummary: summaryBase,
    matchScore: score,
    descriptors: {
      tonal: low > 40 ? "بیس‌محور" : high > 38 ? "روشن" : "متعادل",
      stereo: corr == null ? "نامشخص" : corr < 0.25 ? "خیلی عریض" : corr > 0.85 ? "تقریباً مونو" : "متعادل",
      dynamics: m.crestFactorDb < 6 ? "فشرده" : m.crestFactorDb > 14 ? "باز" : "متعادل",
      loudness: m.rmsDbfs > -10 ? "بلند" : m.rmsDbfs > -16 ? "متوسط" : "آرام",
    },
    loudness: {
      peak: `${m.peakDbfs.toFixed(1)} dBFS`,
      rms: `${m.rmsDbfs.toFixed(1)} dBFS`,
      crest: `${m.crestFactorDb.toFixed(1)} dB`,
      targetLufs: ref?.approxLufs != null ? `نزدیک رفرنس ≈${ref.approxLufs.toFixed(1)}` : (/edm|electro/i.test(genre) ? "حدود ۷- تا ۶- LUFS" : "حدود ۹- تا ۸- LUFS"),
      truePeak: m.truePeakDbfs != null ? `${m.truePeakDbfs.toFixed(1)} dBTP` : "≤ -1.0 dBTP",
    },
    tonal: {
      summary: `پایین ${low.toFixed(0)}٪ · میانی ${mid.toFixed(0)}٪ · بالا ${high.toFixed(0)}٪` + (m.spectralCentroidHz ? ` · مرکز حدود ${Math.round(m.spectralCentroidHz)}Hz` : "") + (ref ? ` | رفرنس: پایین ${(ref.lowEnergyPct ?? 0).toFixed(0)}٪ · بالا ${(ref.highEnergyPct ?? 0).toFixed(0)}٪` : ""),
      low, mid, high, centroid: m.spectralCentroidHz,
    },
    stereo: {
      correlation: corr,
      advice: corr == null ? "اطلاعات استریو نیست." : corr < 0.3 ? "عرض زیاد است؛ بیس را مونو کن." : corr > 0.9 ? "تقریباً مونو است؛ عرض را روی میانی/بالا باز کن." : "عرض پایدار است.",
    },
    dynamics: m.crestFactorDb < 6 ? "داینامیک فشرده است — قبل از لیمیتر تعادل را درست کن." : m.crestFactorDb > 14 ? "فضای داینامیک زیاد است — کمپرس ملایم مفید است." : "داینامیک متعادل است.",
    clipping: m.peakDbfs >= -0.3 || (m.clipPct && m.clipPct > 0.2) ? "پیک نزدیک سقف یا کلیپ دارد — فوری گین را اصلاح کن." : m.peakDbfs >= -1 ? "پیک نزدیک ۱- است؛ هدرووم کم." : "پیک نسبتاً امن است.",
    compression: {
      summary: ref ? "کمپرس را طوری تنظیم کن که Crest و RMS به رفرنس نزدیک شود." : "کمپرس را بعد از تعادل بزن؛ هدف کنترل قله‌هاست.",
      attack: "روی باس متوسط تا سریع",
      release: "هماهنگ با تمپو",
      ratio: "۳:۱ تا ۴:۱",
      thresholdHint: "۱ تا ۳ دسی‌بل کاهش روی باس",
    },
    eq,
    arrangement: [
      "تراکم سازها را در ورس کم‌تر نگه دار تا کورس بازتر شنیده شود.",
      "بین ورس و کورس کنتراست تنظیم بساز (ساز کمتر در ورس، پرتر در کورس).",
      "یک المان امضا (hook صوتی) در تنظیم تکرار شود تا هویت ترک قوی‌تر شود.",
      "سکوت و فضای خالی عمدی بگذار؛ شلوغی دائمی تنظیم را خسته می‌کند.",
      "نقش وکال در تنظیم مشخص باشد — یا جلو، یا با لایه‌های حمایتی کنترل‌شده.",
    ],
    mixBalance: [
      { element: "وکال", advice: ref ? "حضور وکال را با رفرنس A/B کن." : "جلو باشد بدون تیز شدن." },
      { element: "درامز", advice: "وزن + کلیک واضح." },
      { element: "باس", advice: "محکم، ساب مونو." },
      { element: "هارمونی", advice: "فضا بدهد؛ میانی شلوغ نشود." },
    ],
    roadmap: ref ? [
      "سطح کلی (RMS/≈LUFS) را به رفرنس نزدیک کن.",
      "پیک و True Peak را امن نگه دار.",
      "تعادل پایین/میانی/بالا را با رفرنس A/B کن.",
      "عرض استریو و مونو بودن بیس را چک کن.",
      "کمپرس و لیمیتر را فقط برای نزدیک شدن به رفرنس تنظیم کن.",
      "دوباره کل ترک را با رفرنس A/B کن.",
    ] : [
      "با رفرنس هم‌سبک سطح را یکی کن.",
      "پیک و True Peak را امن کن (زیر ۱-).",
      "پایین / میانی / بالا را با A/B چک کن.",
      "بیس را مونو کن.",
      "کمپرس هدفمند، بعد لیمیتر.",
      "دوباره با رفرنس A/B کن.",
    ],
    quickFixes: ref
      ? ["سطح را به رفرنس نزدیک کن", "بیس را با رفرنس A/B کن", "بالا را تیز نکن", "دوباره با رفرنس گوش بده"]
      : ["اول گل‌آلودگی را کم کن", "ساب را مونو نگه دار", "لیمیتر فقط سقف بدهد", "با رفرنس A/B کن"],
    referenceTips: ref
      ? "رفرنس خودت معیار است. امتیاز نشان‌دهنده نزدیکی متریک‌ها به همان رفرنس است، نه تعریف کلی ژانر."
      : "مثل Reference: خط تعادل را دنبال کن. امتیاز پایین یعنی فاصله با استاندارد حرفه‌ای.",
    source: ref ? "metrics-fallback-vs-reference" : "metrics-fallback-strict",
  };
}

function parseJson(text: string) {
  const s = text.trim();
  try { return JSON.parse(s); } catch {}
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch {} }
  return null;
}

function resolveLimit(isAdmin: boolean, pro: boolean, course: boolean) {
  if (isAdmin) return ADMIN_LIMIT;
  if (pro) return PRO_LIMIT;
  if (course) return COURSE_LIMIT;
  return FREE_LIMIT;
}

function tierLabel(isAdmin: boolean, pro: boolean, course: boolean) {
  if (isAdmin) return "admin";
  if (pro) return "pro";
  if (course) return "course";
  return "free";
}

export async function GET(request: Request) {
  const identity = await currentIdentity();
  if (!identity) return NextResponse.json({ ok: false, error: "login_required" }, { status: 401 });
  const ids = identity.admin ? [] : Array.from(new Set([identity.id, identity.telegramId || ""].filter(Boolean)));
  const isAdmin = identity.admin;
  if (isAdmin) {
    return NextResponse.json({ ok: true, limit: ADMIN_LIMIT, used: 0, remaining: ADMIN_LIMIT, pro: true, course: true, admin: true, tier: "admin" });
  }
  if (!ids.length || !db) {
    return NextResponse.json({ ok: true, limit: FREE_LIMIT, used: 0, remaining: FREE_LIMIT, pro: false, course: false, admin: false, tier: "free" });
  }
  const [used, pro, course] = await Promise.all([countUsed(ids), isPro(ids), hasActiveCourse(ids)]);
  const limit = resolveLimit(false, pro, course);
  return NextResponse.json({ ok: true, limit, used, remaining: Math.max(0, limit - used), pro, course, admin: false, tier: tierLabel(false, pro, course) });
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, error: "invalid_form" }, { status: 400 });

  const file = form.get("file");
  const identity = await currentIdentity();
  if (!identity) return NextResponse.json({ ok: false, error: "login_required" }, { status: 401 });
  const userId = identity.admin ? "" : identity.id;
  const telegramId = identity.admin ? "" : (identity.telegramId || "");
  const isAdmin = identity.admin;
  const genre = String(form.get("genre") || "عمومی").slice(0, 80);
  const focus = String(form.get("focus") || "فول میکس").slice(0, 80);
  const notes = String(form.get("notes") || "").slice(0, 800);
  const refName = String(form.get("refName") || "").slice(0, 120);

  let m = null;
  let ref = null;
  try { m = metricsOf(JSON.parse(String(form.get("metrics") || "{}"))); } catch {}
  try { ref = metricsOf(JSON.parse(String(form.get("refMetrics") || "null"))); } catch { ref = null; }

  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "audio_file_required" }, { status: 400 });
  if (!m) return NextResponse.json({ ok: false, error: "audio_metrics_required" }, { status: 400 });
  if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "file_too_large_or_empty" }, { status: 413 });

  const ids = Array.from(new Set([userId, telegramId].filter(Boolean)));
  const pro = isAdmin ? true : await isPro(ids);
  const course = isAdmin || pro ? true : await hasActiveCourse(ids);
  const limit = resolveLimit(isAdmin, pro, course);
  const used = isAdmin ? 0 : await countUsed(ids);
  if (!isAdmin && used >= limit) {
    return NextResponse.json({ ok: false, code: "daily_limit_reached", limit, used, remaining: 0, pro, course, admin: false }, { status: 429 });
  }

  const enriched = { ...m };
  let analysis = fallback(enriched, genre, focus, ref);

  try {
    const system = ref
      ? `تو مهندس میکس سخت‌گیر هستی. کاربر یک رفرنس واقعی آپلود کرده. باید ترک او را فقط با همان رفرنس مقایسه کنی (نه استاندارد کلی ژانر). فارسی ساده و قابل‌اجرا. اعداد متریک واقعی‌اند — جعل نکن. سخت‌گیر باش. فقط JSON معتبر برگردان با کلیدهای: fileSummary, matchScore, descriptors, loudness, tonal, stereo, dynamics, clipping, compression, eq, arrangement, mixBalance, roadmap, quickFixes, referenceTips, source. فیلد arrangement باید پیشنهاد عملی تنظیم باشد (لایه‌بندی، تراکم ساز، سکوت، ساختار ورس/کورس، نقش وکال در تنظیم) نه فقط EQ میکس.`
      : `تو مهندس میکس سخت‌گیر هستی. مثل Reference تحلیل کن. فارسی ساده و قابل‌اجرا. اعداد متریک واقعی‌اند — جعل نکن. سخت‌گیر باش. فقط JSON معتبر برگردان با کلیدهای: fileSummary, matchScore, descriptors, loudness, tonal, stereo, dynamics, clipping, compression, eq, arrangement, mixBalance, roadmap, quickFixes, referenceTips, source. فیلد arrangement باید پیشنهاد عملی تنظیم باشد (لایه‌بندی، تراکم ساز، سکوت، ساختار ورس/کورس، نقش وکال در تنظیم) نه فقط EQ میکس.`;
    const prompt = ref
      ? `فایل کاربر: ${(file as File).name}\nمتریک کاربر: ${JSON.stringify(enriched)}\nرفرنس: ${refName || "reference"}\nمتریک رفرنس: ${JSON.stringify(ref)}\nژانر: ${genre}\nتمرکز: ${focus}\nتوضیح کاربر: ${notes || "—"}\n\nمقایسه سخت‌گیرانه با رفرنس بده (میکس + تنظیم). matchScore = نزدیکی به همین رفرنس. تفاوت Peak/RMS/Crest/انرژی/استریو را صریح بگو. در arrangement بگو تنظیم چطور به رفرنس نزدیک شود. roadmap را برای نزدیک شدن به رفرنس بنویس.`
      : `فایل: ${(file as File).name}\nمتریک واقعی: ${JSON.stringify(enriched)}\nژانر هدف: ${genre}\nتمرکز: ${focus}\nتوضیح/مشکل کاربر: ${notes || "—"}\n\nتحلیل سخت‌گیرانه بده (میکس + تنظیم). در arrangement پیشنهادهای عملی تنظیم بده. امتیاز را بر اساس فاصله از استاندارد حرفه‌ای همان ژانر بده، نه برای دلگرم کردن.`;
    const raw = await autoChat([
      { role: "system", content: system },
      { role: "user", content: prompt },
    ]);
    const parsed = parseJson(typeof raw === "string" ? raw : String(raw ?? ""));
    if (parsed && typeof parsed === "object") {
      analysis = {
        ...analysis,
        ...parsed,
        matchScore: Number.isFinite(Number(parsed.matchScore)) ? Math.round(Number(parsed.matchScore)) : analysis.matchScore,
        arrangement: Array.isArray(parsed.arrangement) && parsed.arrangement.length ? parsed.arrangement : analysis.arrangement,
        eq: Array.isArray(parsed.eq) && parsed.eq.length ? parsed.eq : analysis.eq,
        mixBalance: Array.isArray(parsed.mixBalance) && parsed.mixBalance.length ? parsed.mixBalance : analysis.mixBalance,
        roadmap: Array.isArray(parsed.roadmap) && parsed.roadmap.length ? parsed.roadmap : analysis.roadmap,
        quickFixes: Array.isArray(parsed.quickFixes) && parsed.quickFixes.length ? parsed.quickFixes : analysis.quickFixes,
        source: parsed.source || (ref ? "ai-vs-reference" : "ai-strict"),
      };
    }
  } catch { /* keep fallback */ }

  if (db && ids.length && !isAdmin) {
    try {
      await db.from("practice_records").insert({
        user_id: ids[0],
        game_id: "music-analyzer",
        score: analysis.matchScore ?? 0,
        played_at: new Date().toISOString(),
        meta: { genre, focus, hasRef: Boolean(ref) },
      });
    } catch { /* ignore */ }
  }

  return NextResponse.json({
    ok: true,
    metrics: enriched,
    analysis,
    quota: { limit, used: used + (isAdmin ? 0 : 1), remaining: Math.max(0, limit - used - (isAdmin ? 0 : 1)), pro, course, admin: isAdmin, tier: tierLabel(isAdmin, pro, course) },
  });
}
