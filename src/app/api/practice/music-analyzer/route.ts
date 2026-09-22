import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, USER_SESSION_COOKIE, verifyAdminSession, verifyUserSession } from "@/lib/server-admin-auth";
import { createClient } from "@supabase/supabase-js";
import { autoChat } from "@/lib/ai-providers";
import { ecosystemDb, ownedProject, logProjectActivity } from "@/lib/user-ecosystem";
import { recordSkillEvent } from "@/lib/practice-skill-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_LIMIT = 1;
const COURSE_LIMIT = 5;
const UNLIMITED = 9999;
const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED_AUDIO = /\.(mp3|wav|m4a|flac|ogg|opus|aac)$/i;

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const db = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

type Identity = { id: string; telegramId?: string; admin: boolean };

function dayStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

async function identity(): Promise<Identity | null> {
  const jar = await cookies();
  if (verifyAdminSession(jar.get(ADMIN_SESSION_COOKIE)?.value)) return { id: "admin", admin: true };
  const user = verifyUserSession(jar.get(USER_SESSION_COOKIE)?.value);
  return user ? { id: user.id, telegramId: user.telegramId, admin: false } : null;
}

function idsOf(user: Identity) {
  return Array.from(new Set([user.id, user.telegramId].filter(Boolean))) as string[];
}

async function countUsed(ids: string[]) {
  if (!db || !ids.length) return 0;
  const result = await db.from("practice_records").select("id").in("user_id", ids).eq("game_id", "music-analyzer").gte("played_at", dayStart());
  return result.data?.length || 0;
}

async function hasActiveCourse(ids: string[]) {
  const key = (process.env.WEB_ADMIN_API_KEY || "").trim();
  if (!key || !ids.length) return false;
  const base = (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(/\/$/, "");
  try {
    for (const id of ids) {
      const response = await fetch(`${base}/api/v1/admin/students?${new URLSearchParams({ q: id, limit: "30" })}`, { headers: { "X-Admin-Key": key }, cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (!response.ok) continue;
      const payload = await response.json().catch(() => null);
      const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : Array.isArray(payload?.students) ? payload.students : [];
      if (rows.some((row: any) => String(row?.id || "") === id || String(row?.telegram_id || "") === id)) return true;
    }
  } catch { /* fall back to free tier when entitlement service is unavailable */ }
  return false;
}

async function isPro(ids: string[]) {
  if (!db || !ids.length) return false;
  const result = await db.from("practice_subscriptions").select("id").in("user_id", ids).eq("status", "active").gt("expires_at", new Date().toISOString()).limit(1);
  return Boolean(result.data?.length);
}

function limits(admin: boolean, pro: boolean, course: boolean) {
  if (admin || pro) return UNLIMITED;
  return course ? COURSE_LIMIT : FREE_LIMIT;
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }

function metricsOf(input: any) {
  if (!input || typeof input !== "object") return null;
  const bands = input.bandEnergy && typeof input.bandEnergy === "object" ? input.bandEnergy : null;
  return {
    durationSec: clamp(number(input.durationSec), 0, 3600),
    sampleRate: clamp(number(input.sampleRate, 44100), 8000, 384000),
    channels: clamp(Math.round(number(input.channels, 2)), 1, 8),
    peakDbfs: clamp(number(input.peakDbfs, -120), -120, 6),
    truePeakDbfs: input.truePeakDbfs == null ? null : clamp(number(input.truePeakDbfs), -120, 6),
    rmsDbfs: clamp(number(input.rmsDbfs, -120), -120, 6),
    crestFactorDb: clamp(number(input.crestFactorDb), 0, 60),
    stereoCorrelation: input.stereoCorrelation == null ? null : clamp(number(input.stereoCorrelation), -1, 1),
    stereoWidth: input.stereoWidth == null ? null : clamp(number(input.stereoWidth), 0, 1),
    spectralCentroidHz: input.spectralCentroidHz == null ? null : clamp(number(input.spectralCentroidHz), 20, 22000),
    lowEnergyPct: input.lowEnergyPct == null ? null : clamp(number(input.lowEnergyPct), 0, 100),
    midEnergyPct: input.midEnergyPct == null ? null : clamp(number(input.midEnergyPct), 0, 100),
    highEnergyPct: input.highEnergyPct == null ? null : clamp(number(input.highEnergyPct), 0, 100),
    clipPct: input.clipPct == null ? null : clamp(number(input.clipPct), 0, 100),
    bandEnergy: bands ? Object.fromEntries(["sub", "low", "lowMid", "mid", "presence", "high", "air"].map((key) => [key, clamp(number(bands[key]), 0, 100)])) : null,
    approxLufs: input.approxLufs == null ? null : clamp(number(input.approxLufs), -60, 0),
    loudnessRangeProxy: input.loudnessRangeProxy == null ? null : clamp(number(input.loudnessRangeProxy), 0, 40),
  };
}

function score(m: any, genre: string, ref: any) {
  const differences = ref ? [[m.peakDbfs, ref.peakDbfs, 14, 1.5, 3], [m.rmsDbfs, ref.rmsDbfs, 16, 2, 4], [m.crestFactorDb, ref.crestFactorDb, 10, 2, 4], [m.lowEnergyPct ?? 33, ref.lowEnergyPct ?? 33, 12, 8, 15], [m.highEnergyPct ?? 33, ref.highEnergyPct ?? 33, 10, 8, 15]] : [];
  let result = ref ? 88 : 82;
  for (const [a, b, penalty, soft, hard] of differences) { const delta = Math.abs(number(a) - number(b)); if (delta > hard) result -= penalty; else if (delta > soft) result -= penalty / 2; }
  if (!ref) { if (m.peakDbfs > -0.3) result -= 20; else if (m.peakDbfs > -1) result -= 12; else if (m.peakDbfs > -1.5) result -= 5; if (m.crestFactorDb < 5) result -= 16; else if (m.crestFactorDb < 7) result -= 9; if ((m.lowEnergyPct ?? 33) > 48 || (m.lowEnergyPct ?? 33) < 18) result -= 12; if (/edm|trap|hip/i.test(genre) && m.crestFactorDb > 12) result -= 4; }
  if (m.clipPct != null && m.clipPct > 0.1) result -= m.clipPct > 0.5 ? 15 : 6;
  if (m.stereoCorrelation != null && m.stereoCorrelation < 0.15) result -= 5;
  return clamp(Math.round(result), ref ? 22 : 25, ref ? 96 : 94);
}

function deterministicAnalysis(m: any, genre: string, focus: string, ref: any) {
  const low = m.lowEnergyPct ?? 33, mid = m.midEnergyPct ?? 34, high = m.highEnergyPct ?? 33, corr = m.stereoCorrelation;
  const eq: string[] = [];
  if (ref) {
    const dRms = m.rmsDbfs - ref.rmsDbfs, dLow = low - (ref.lowEnergyPct ?? 33), dHigh = high - (ref.highEnergyPct ?? 33);
    if (Math.abs(dRms) > 2) eq.push(`${dRms > 0 ? "بلندی" : "آرامی"} ترک نسبت به رفرنس حدود ${Math.abs(dRms).toFixed(1)} dB متفاوت است؛ گین را با loudness matching مقایسه کن.`);
    if (Math.abs(dLow) > 8) eq.push(`${dLow > 0 ? "پایین بیش‌ازحد سنگین است" : "پایین کم‌انرژی است"}؛ کیک و باس را جدا و سپس با رفرنس A/B کن.`);
    if (Math.abs(dHigh) > 8) eq.push(`${dHigh > 0 ? "بالا تیزتر است" : "بالا کم‌انرژی است"}؛ ناحیه حضور را بدون تغییر کورکورانه‌ی ولوم کنترل کن.`);
    if (!eq.length) eq.push("فاصله‌ی متریک‌ها با رفرنس کم است؛ حالا وکال، عمق و ترنزینت‌ها را با A/B بررسی کن.");
  } else {
    eq.push(low > 42 ? "پایین سنگین است؛ ناحیه ۴۰ تا ۲۵۰ هرتز و تداخل کیک/باس را کنترل کن." : low < 22 ? "پایین کم‌انرژی است؛ کیک و باس را در ۵۰ تا ۱۰۰ هرتز با مرجع شنیداری چک کن." : "تعادل پایین قابل‌قبول است؛ تداخل کیک و باس را با سایدچین یا انتخاب صدا حل کن.");
    eq.push(mid > 45 ? "میانی شلوغ است؛ ۲۰۰ تا ۵۰۰ هرتز را با حرکت‌های کوچک و هدفمند باز کن." : "میانی قابل‌قبول است؛ فضای وکال را با arrangement و پنینگ حفظ کن.");
    eq.push(high > 40 ? "بالا تیز است؛ ۵ تا ۸ کیلوهرتز را قبل از افزودن هوا کنترل کن." : high < 18 ? "بالا کم‌انرژی است؛ ابتدا حضور وکال را بررسی کن، سپس هوا اضافه کن." : "بالا متعادل است؛ از بالا بردن غیرضروری برای جبران کمبود وضوح پرهیز کن.");
  }
  const scoreValue = score(m, genre, ref);
  return { fileSummary: ref ? `مقایسه‌ی متریک‌محور با رفرنس. Peak ${m.peakDbfs.toFixed(1)} در برابر ${ref.peakDbfs.toFixed(1)} · RMS ${m.rmsDbfs.toFixed(1)} در برابر ${ref.rmsDbfs.toFixed(1)} · Crest ${m.crestFactorDb.toFixed(1)} در برابر ${ref.crestFactorDb.toFixed(1)}.` : `تحلیل ${genre} با تمرکز ${focus}. Peak ${m.peakDbfs.toFixed(1)} dBFS · RMS ${m.rmsDbfs.toFixed(1)} dBFS · Crest ${m.crestFactorDb.toFixed(1)} dB${m.approxLufs == null ? "" : ` · ≈${m.approxLufs.toFixed(1)} LUFS`}.`, matchScore: scoreValue, descriptors: { tonal: low > 40 ? "بیس‌محور" : high > 38 ? "روشن" : "متعادل", stereo: corr == null ? "نامشخص" : corr < 0.25 ? "خیلی عریض" : corr > 0.85 ? "تقریباً مونو" : "متعادل", dynamics: m.crestFactorDb < 6 ? "فشرده" : m.crestFactorDb > 14 ? "باز" : "متعادل", loudness: m.rmsDbfs > -10 ? "بلند" : m.rmsDbfs > -16 ? "متوسط" : "آرام" }, loudness: { peak: `${m.peakDbfs.toFixed(1)} dBFS`, rms: `${m.rmsDbfs.toFixed(1)} dBFS`, crest: `${m.crestFactorDb.toFixed(1)} dB`, targetLufs: ref?.approxLufs != null ? `نزدیک رفرنس ≈${ref.approxLufs.toFixed(1)}` : "با loudness matching قضاوت کن", truePeak: m.truePeakDbfs == null ? "≤ -1.0 dBTP" : `${m.truePeakDbfs.toFixed(1)} dBTP` }, tonal: { summary: `پایین ${low.toFixed(0)}٪ · میانی ${mid.toFixed(0)}٪ · بالا ${high.toFixed(0)}٪${m.spectralCentroidHz ? ` · مرکز ${Math.round(m.spectralCentroidHz)}Hz` : ""}`, low, mid, high, centroid: m.spectralCentroidHz }, stereo: { correlation: corr, advice: corr == null ? "اطلاعات استریو موجود نیست." : corr < 0.3 ? "عرض زیاد است؛ ساب و باس را مونو چک کن." : corr > 0.9 ? "تقریباً مونو است؛ فقط میانی/بالا را با احتیاط باز کن." : "عرض استریو پایدار است." }, dynamics: m.crestFactorDb < 6 ? "داینامیک فشرده است؛ قبل از لیمیتر تعادل و ترنزینت را اصلاح کن." : m.crestFactorDb > 14 ? "داینامیک باز است؛ کمپرس ملایم و وابسته به تمپو را تست کن." : "داینامیک متعادل است.", clipping: m.peakDbfs >= -0.3 || (m.clipPct ?? 0) > 0.2 ? "پیک نزدیک سقف یا کلیپ وجود دارد؛ گین را اصلاح کن." : m.peakDbfs >= -1 ? "هدرووم کم است؛ قبل از مستر نهایی دوباره چک کن." : "پیک فعلاً در محدوده‌ی امن‌تری است.", compression: { summary: ref ? "کمپرس را فقط برای نزدیک‌کردن Crest و RMS به رفرنس تنظیم کن." : "کمپرس بعد از تعادل؛ هدف کنترل قله‌هاست، نه بلندترکردن کور.", attack: "متوسط تا سریع روی باس", release: "هماهنگ با تمپو", ratio: "۳:۱ تا ۴:۱", thresholdHint: "حدود ۱ تا ۳ dB کاهش" }, eq, arrangement: ["ورس را خلوت‌تر و کورس را متراکم‌تر نگه دار تا کنتراست شنیداری ایجاد شود.", "یک hook مشخص را حفظ کن و لایه‌های هم‌نقش را حذف یا ادغام کن.", "برای وکال فضای خالی فرکانسی و زمانی بساز؛ همه‌چیز نباید هم‌زمان پر باشد.", "ترنزیشن‌ها را با حذف/اضافه‌کردن هدفمند سازها بساز، نه فقط با افکت.", "بعد از هر تغییر arrangement، میکس را در ولوم کم و مونو دوباره ارزیابی کن."], mixBalance: [{ element: "وکال", advice: ref ? "حضور وکال را با رفرنس loudness-match کن." : "جلو باشد بدون تیزی اضافه." }, { element: "درامز", advice: "ترنزینت و وزن را جداگانه چک کن." }, { element: "باس", advice: "ساب مونو و تداخل کیک/باس کنترل شود." }, { element: "هارمونی", advice: "فضا بدهد و میانی را اشباع نکند." }], roadmap: ["ابتدا گین و هدرووم را اصلاح کن.", "سپس تداخل پایین و فضای وکال را حل کن.", "بعد کنتراست ورس/کورس و نقش لایه‌ها را اصلاح کن.", "استریو را در مونو و چند ولوم بررسی کن.", "در پایان کمپرس و لیمیتر را با A/B تنظیم کن."], quickFixes: ["loudness-match با رفرنس", "چک مونو برای باس", "کنترل ۲۰۰ تا ۵۰۰ هرتز", "مقایسه در ولوم کم"], referenceTips: ref ? "امتیاز فقط نزدیکی متریک‌ها به رفرنس آپلودشده است؛ کیفیت موسیقایی را جایگزین گوش‌دادن نمی‌کند." : "امتیاز یک راهنمای متریک‌محور است، نه داوری قطعی کیفیت موسیقی.", source: ref ? "deterministic-v2-vs-reference" : "deterministic-v2" };
}

function parseJson(value: string) { try { return JSON.parse(value); } catch { const start = value.indexOf("{"); const end = value.lastIndexOf("}"); if (start >= 0 && end > start) { try { return JSON.parse(value.slice(start, end + 1)); } catch { return null; } } return null; } }

async function entitlement(user: Identity) { if (user.admin) return { limit: UNLIMITED, used: 0, pro: true, course: true, admin: true }; const ids = idsOf(user); const [used, pro, course] = await Promise.all([countUsed(ids), isPro(ids), hasActiveCourse(ids)]); return { limit: limits(false, pro, course), used, pro, course, admin: false }; }

export async function GET() { const user = await identity(); if (!user) return NextResponse.json({ ok: false, error: "login_required" }, { status: 401 }); const access = await entitlement(user); return NextResponse.json({ ok: true, ...access, remaining: Math.max(0, access.limit - access.used), tier: access.admin ? "admin" : access.pro ? "pro" : access.course ? "course" : "free" }); }

export async function POST(request: Request) {
  const user = await identity(); if (!user) return NextResponse.json({ ok: false, error: "login_required" }, { status: 401 });
  const form = await request.formData().catch(() => null); if (!form) return NextResponse.json({ ok: false, error: "invalid_form" }, { status: 400 });
  const mode = String(form.get("mode") || "mix") === "arrangement" ? "arrangement" : "mix";
  const file = form.get("file"); if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "audio_file_required" }, { status: 400 });
  if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "file_too_large_or_empty" }, { status: 413 });
  if (!ALLOWED_AUDIO.test(file.name)) return NextResponse.json({ ok: false, error: "unsupported_audio_format" }, { status: 415 });
  const metrics = metricsOf(parseJson(String(form.get("metrics") || "{}"))); const reference = metricsOf(parseJson(String(form.get("refMetrics") || "null"))); if (!metrics) return NextResponse.json({ ok: false, error: "audio_metrics_required" }, { status: 400 });
  const genre = String(form.get("genre") || "عمومی").slice(0, 80); const focus = String(form.get("focus") || "فول میکس").slice(0, 80); const notes = String(form.get("notes") || "").slice(0, 800); const refName = String(form.get("refName") || "reference").slice(0, 120); const projectId = String(form.get("projectId") || "").trim().slice(0, 80);
  const access = await entitlement(user); if (!access.admin && access.used >= access.limit) return NextResponse.json({ ok: false, code: "daily_limit_reached", ...access, remaining: 0 }, { status: 429 });
  let analysis: any = deterministicAnalysis(metrics, genre, focus, reference);
  try {
    const system = "تو مهندس میکس و تنظیم سخت‌گیر هستی. فارسی ساده و عملی بنویس. اعداد ورودی واقعی‌اند و نباید جعل شوند. فقط JSON معتبر با کلیدهای fileSummary, matchScore, descriptors, loudness, tonal, stereo, dynamics, clipping, compression, eq, arrangement, mixBalance, roadmap, quickFixes, referenceTips, source برگردان. arrangement باید پیشنهاد تنظیم باشد، نه فقط EQ.";
    const prompt = reference ? `ترک ${file.name} را فقط با رفرنس ${refName} مقایسه کن. متریک ترک: ${JSON.stringify(metrics)}. متریک رفرنس: ${JSON.stringify(reference)}. ژانر: ${genre}. تمرکز: ${focus}. یادداشت: ${notes || "—"}. تفاوت‌های Peak/RMS/Crest/طیف/استریو و پیشنهاد تنظیم را دقیق بگو.` : `ترک ${file.name} را برای ژانر ${genre} و تمرکز ${focus} تحلیل کن. متریک واقعی: ${JSON.stringify(metrics)}. یادداشت: ${notes || "—"}. پیشنهاد میکس و تنظیم باید مرحله‌ای و قابل اجرا باشد.`;
    const raw = await autoChat([{ role: "system", content: system }, { role: "user", content: prompt }]);
    const parsed = parseJson(typeof raw === "string" ? raw : String(raw ?? ""));
    if (parsed && typeof parsed === "object") analysis = { ...analysis, ...parsed, matchScore: Number.isFinite(Number(parsed.matchScore)) ? clamp(Math.round(Number(parsed.matchScore)), 0, 100) : analysis.matchScore, eq: Array.isArray(parsed.eq) && parsed.eq.length ? parsed.eq : analysis.eq, arrangement: Array.isArray(parsed.arrangement) && parsed.arrangement.length ? parsed.arrangement : analysis.arrangement, roadmap: Array.isArray(parsed.roadmap) && parsed.roadmap.length ? parsed.roadmap : analysis.roadmap, source: parsed.source || "ai-assisted-v2" };
  } catch { /* deterministic analysis remains available when AI is unavailable */ }
  if (db && !user.admin) { try { await db.from("practice_records").insert({ user_id: user.id, game_id: "music-analyzer", score: analysis.matchScore ?? 0, played_at: new Date().toISOString(), meta: { genre, focus, hasRef: Boolean(reference), analyzerVersion: "v2", projectId: projectId || null } }); } catch { /* result remains valid */ } }
  if (!user.admin) {
    try {
      const gameId = mode === "mix" ? "eq" : "personal";
      const accuracy = Number(analysis.matchScore ?? 0);
      await recordSkillEvent({ userId: user.id, gameId, xp: Math.round(accuracy / 5), accuracy, difficulty: 250, correct: accuracy >= 75, metadata: { source: "music_analyzer", mode, projectId: projectId || null, responseTimeMs: 0 } });
    } catch { /* analyzer result must not fail if skill storage is unavailable */ }
  }
  if (projectId && ecosystemDb && !user.admin) {
    try {
      const project = await ownedProject(user.id, projectId);
      if (project) {
        const inserted = await ecosystemDb.from("artistyar_project_analyses").insert({
          project_id: projectId, user_id: user.id, analysis_type: mode,
          payload: { fileName: file.name, genre, focus, metrics, reference: Boolean(reference), analysis },
        }).select("id").single();
        if (!inserted.error) await logProjectActivity({ userId: user.id, projectId, eventType: "analysis_created", entityType: "analysis", entityId: inserted.data?.id, payload: { mode, fileName: file.name } });
      }
    } catch { /* project persistence is additive; never hide a valid analysis */ }
  }
  const used = access.used + (user.admin ? 0 : 1);
  return NextResponse.json({ ok: true, metrics, analysis, quota: { ...access, used, remaining: Math.max(0, access.limit - used), tier: access.admin ? "admin" : access.pro ? "pro" : access.course ? "course" : "free" } });
}
