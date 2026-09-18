import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { autoChat } from "@/lib/ai-providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** سهمیه روزانه */
const FREE_LIMIT = 1;
const COURSE_LIMIT = 5; // هنرجوی فعال آموزش
const PRO_LIMIT = 9999; // تا پایان اشتراک Pro
const ADMIN_LIMIT = 9999;
const MAX_BYTES = 50 * 1024 * 1024;

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const db = url && secret ? createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

function backendBase() {
  return (process.env.RAHYAR_API_URL || "https://rahyar-academy-management-system-v14.onrender.com").replace(/\/$/, "");
}

function startOfDay() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

async function isPro(ids: string[]) {
  if (!db || !ids.length) return false;
  const q = await db
    .from("practice_subscriptions")
    .select("id")
    .in("user_id", ids)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .limit(1);
  return Boolean(q.data && q.data.length);
}

/** هنرجوی فعال آموزش (ثبت‌نام active در راه‌یار) */
async function hasActiveCourse(ids: string[]): Promise<boolean> {
  if (!ids.length) return false;
  const key = (process.env.WEB_ADMIN_API_KEY || "").trim();
  if (!key) return false;
  try {
    for (const id of ids) {
      const qs = new URLSearchParams({ q: id, limit: "30" });
      const res = await fetch(`${backendBase()}/api/v1/admin/students?${qs}`, {
        headers: { "X-Admin-Key": key },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      const rows: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.students)
            ? data.students
            : [];
      const hit = rows.find(
        (r) =>
          String(r.telegram_id || "") === id ||
          String(r.id || "") === id ||
          String(r.phone || "").replace(/\D/g, "").endsWith(id.replace(/\D/g, "")),
      );
      if (!hit?.id) continue;

      const er = await fetch(`${backendBase()}/api/v1/admin/students/${hit.id}/enrollments`, {
        headers: { "X-Admin-Key": key },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      if (!er.ok) {
        // دانش‌آموز در سیستم هست ولی enrollment خوانده نشد → به‌عنوان هنرجو حساب کن
        return true;
      }
      const en = await er.json().catch(() => null);
      const list: any[] = Array.isArray(en) ? en : Array.isArray(en?.items) ? en.items : [];
      if (list.some((e) => String(e.status || "").toLowerCase() === "active")) return true;
      if (list.length > 0) return true;
    }
  } catch {
    /* ignore network */
  }
  return false;
}

async function countUsed(ids: string[]) {
  if (!db || !ids.length) return 0;
  const q = await db
    .from("practice_records")
    .select("id")
    .in("user_id", ids)
    .eq("game_id", "music-analyzer")
    .gte("played_at", startOfDay());
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

function strictScore(m: any, genre: string) {
  let score = 78;
  // هدرووم و پیک
  if (m.peakDbfs > -0.3) score -= 18;
  else if (m.peakDbfs > -1) score -= 10;
  else if (m.peakDbfs > -1.5) score -= 5;
  // داینامیک
  if (m.crestFactorDb < 5) score -= 14;
  else if (m.crestFactorDb < 7) score -= 8;
  else if (m.crestFactorDb > 16) score -= 4;
  // تعادل تونال
  const low = m.lowEnergyPct ?? 33;
  const mid = m.midEnergyPct ?? 34;
  const high = m.highEnergyPct ?? 33;
  if (low > 48 || low < 18) score -= 10;
  else if (low > 42 || low < 22) score -= 6;
  if (mid > 50) score -= 10;
  else if (mid > 45) score -= 6;
  if (high > 45 || high < 12) score -= 8;
  // استریو
  if (m.stereoCorrelation != null) {
    if (m.stereoCorrelation < 0.15) score -= 8;
    else if (m.stereoCorrelation > 0.95) score -= 5;
  }
  // بلندی نسبت به ژانر
  const isEdm = /edm|electro|dance|house/i.test(genre);
  if (isEdm && m.rmsDbfs < -14) score -= 4;
  if (!isEdm && m.rmsDbfs > -8) score -= 6;
  return Math.max(28, Math.min(92, Math.round(score)));
}

function fallback(m: any, genre: string, focus: string, notes: string) {
  const low = m.lowEnergyPct ?? 33;
  const mid = m.midEnergyPct ?? 34;
  const high = m.highEnergyPct ?? 33;
  const corr = m.stereoCorrelation;
  const eq: string[] = [];

  if (low > 45)
    eq.push(
      "بیس و ساب خیلی سنگین است. حدود ۴۰ تا ۱۲۰ هرتز را ۱٫۵ تا ۳ دسی‌بل کم کن و باس را در حالت مونو چک کن تا میکس تمیزتر شود.",
    );
  else if (low > 40)
    eq.push("بیس کمی زیاد است. کمی از محدوده ۸۰ تا ۱۵۰ هرتز کم کن تا جا برای وکال باز شود.");
  else if (low < 20)
    eq.push("بیس ضعیف است. کیک یا باس را حدود ۵۰ تا ۹۰ هرتز کمی بلندتر کن (۱ تا ۲ دسی‌بل)، ولی مراقب گل‌آلودگی باش.");
  else eq.push("بیس در محدوده قابل‌قبول است؛ فقط تداخل کیک و باس را با EQ جدا کن.");

  if (mid > 48)
    eq.push(
      "میانی خیلی شلوغ است (حدود ۲۰۰ تا ۵۰۰ هرتز). این بخش را کم کن تا وکال و لید واضح‌تر شنیده شوند.",
    );
  else if (mid > 42) eq.push("میانی کمی پر است. کمی از ۲۵۰ تا ۴۰۰ هرتز کم کن تا فضا باز شود.");
  else eq.push("میانی متعادل است؛ حضور وکال را با دقت در محدوده ۲ تا ۵ کیلوهرتز تنظیم کن.");

  if (high > 42)
    eq.push("بالا تیز یا خش‌دار است. حدود ۵ تا ۸ کیلوهرتز را کنترل کن و فقط در صورت نیاز کمی هوا (۱۰ تا ۱۴ کیلوهرتز) اضافه کن.");
  else if (high < 16)
    eq.push("بالا کم‌انرژی است. کمی هوا در ۱۰ تا ۱۴ کیلوهرتز اضافه کن تا میکس بازتر شود، ولی تیز نشود.");
  else eq.push("بالا متعادل است؛ فقط در صورت خش وکال، de-ess ملایم بزن.");

  if (notes) {
    if (/وکال|vocal/i.test(notes)) eq.push("طبق توضیح خودت: وکال را در حضور جلو بیاور، ولی از تیز شدن ۳ تا ۵ کیلوهرتز جلوگیری کن.");
    if (/گل|mud|کدر/i.test(notes)) eq.push("اولویت فوری: کم کردن گل‌آلودگی ۲۰۰ تا ۴۰۰ هرتز قبل از هر تقویت دیگری.");
  }

  return {
    fileSummary: `تحلیل سخت‌گیرانه برای «${genre}» با تمرکز «${focus}». Peak ${m.peakDbfs.toFixed(1)} dBFS · RMS ${m.rmsDbfs.toFixed(1)} dBFS · Crest ${m.crestFactorDb.toFixed(1)} dB. امتیاز بر اساس فاصله از استاندارد حرفه‌ای همان سبک محاسبه شده است.`,
    matchScore: strictScore(m, genre),
    descriptors: {
      tonal: low > 42 ? "بیس‌محور" : high > 38 ? "روشن / تیز" : "نسبتاً متعادل",
      stereo:
        corr == null
          ? "نامشخص"
          : corr < 0.25
            ? "خیلی عریض"
            : corr < 0.55
              ? "عریض"
              : corr > 0.88
                ? "تقریباً مونو"
                : "عرض متعادل",
      dynamics: m.crestFactorDb < 6 ? "فشرده / کم‌نفس" : m.crestFactorDb > 14 ? "باز / پرتأثیر" : "متعادل",
      loudness: m.rmsDbfs > -9 ? "بلند" : m.rmsDbfs > -15 ? "متوسط" : "آرام",
    },
    loudness: {
      peak: `${m.peakDbfs.toFixed(1)} dBFS`,
      rms: `${m.rmsDbfs.toFixed(1)} dBFS`,
      crest: `${m.crestFactorDb.toFixed(1)} dB`,
      targetLufs: /edm|electro/i.test(genre)
        ? "حدود ۷- تا ۶- LUFS (استریم: ۱۴-)"
        : "حدود ۹- تا ۸- LUFS (استریم: ۱۴-)",
      truePeak: "حداکثر ۱٫۰- dBTP",
    },
    tonal: {
      summary: `پایین ${low.toFixed(0)}٪ · میانی ${mid.toFixed(0)}٪ · بالا ${high.toFixed(0)}٪` +
        (m.spectralCentroidHz ? ` · مرکز طیفی حدود ${Math.round(m.spectralCentroidHz)} هرتز` : ""),
      low,
      mid,
      high,
      centroid: m.spectralCentroidHz,
    },
    stereo: {
      correlation: corr,
      advice:
        corr == null
          ? "اطلاعات استریو در دسترس نیست."
          : corr < 0.3
            ? "عرض زیاد است؛ بیس را مونو کن و سازگاری مونو را حتماً چک کن."
            : corr > 0.9
              ? "تقریباً مونو است؛ عرض را فقط روی میانی و بالا باز کن."
              : "عرض پایدار است؛ widening را فقط بالای حدود ۱۲۰ هرتز استفاده کن.",
    },
    dynamics:
      m.crestFactorDb < 6
        ? "داینامیک خیلی فشرده است. قبل از لیمیتر بیشتر، تعادل و ضربهٔ سازها را درست کن؛ وگرنه میکس خفه می‌ماند."
        : m.crestFactorDb > 14
          ? "فضای داینامیک زیاد است. یک کمپرس ملایم روی باسِ میکس می‌تواند میکس را یکدست‌تر کند."
          : "داینامیک در محدوده قابل‌قبول است.",
    clipping:
      m.peakDbfs >= -0.3
        ? "پیک روی سقف یا نزدیک آن است — فوری گین و True Peak را اصلاح کن."
        : m.peakDbfs >= -1
          ? "پیک نزدیک ۱- دسی‌بل است؛ هدرووم کم است."
          : "پیک زیر ۱- دسی‌بل و نسبتاً امن است.",
    compression: {
      summary: "کمپرس را بعد از تعادل سطح‌ها بزن؛ هدف کنترل قله‌هاست، نه فقط بلندتر شدن.",
      attack: "روی باس متوسط تا سریع؛ روی کیک کمی آهسته‌تر تا ضربه حفظ شود",
      release: "هماهنگ با تمپو و ریتم",
      ratio: "۳:۱ تا ۴:۱ روی باس میکس",
      thresholdHint: "۱ تا ۳ دسی‌بل کاهش روی باس؛ ۳ تا ۵ دسی‌بل روی قله‌های وکال",
    },
    eq,
    mixBalance: [
      { element: "وکال / لید", advice: "باید جلو باشد بدون تیز شدن؛ اول گل‌آلودگی را کم کن بعد حضور را اضافه کن." },
      { element: "درامز / کیک", advice: "وزن + کلیک واضح؛ تداخل با باس را با EQ یا سایدچین حل کن." },
      { element: "باس", advice: "محکم و کنترل‌شده؛ ساب تمیز و مونو." },
      { element: "هارمونی / موسیقی", advice: "فضا بدهد؛ میانی شلوغ نشود تا وکال خفه نشود." },
    ],
    roadmap: [
      "اول با یک رفرنس هم‌سبک سطح را یکی کن (level-match)، بعد قضاوت کن.",
      "پیک و هدرووم را امن کن (True Peak زیر ۱-).",
      "پایین / میانی / بالا را با A/B و اسپکتروم چک کن.",
      "بیس را مونو کن و correlation استریو را بررسی کن.",
      "کمپرس هدفمند، بعد لیمیتر نهایی — لیمیتر جای EQ را نمی‌گیرد.",
      "دوباره با رفرنس A/B کن و فقط اختلاف‌های واضح را اصلاح کن.",
    ],
    quickFixes: [
      "قبل از تقویت حضور، گل‌آلودگی را کم کن",
      "ساب را مونو نگه دار",
      "لیمیتر فقط سقف بدهد، نه اصلاح تونال",
      "هر ۳۰ تا ۶۰ ثانیه با رفرنس A/B کن",
    ],
    referenceTips:
      "مثل Reference: خط تعادل را دنبال کن (بالای صفر = تقویت، زیر صفر = کاهش). هدف نزدیک شدن حدود ±۳ دسی‌بل در تونال است. امتیاز پایین یعنی هنوز فاصلهٔ جدی با استاندارد حرفه‌ای داری.",
    source: "metrics-fallback-strict",
  };
}

function parseJson(text: string) {
  const s = text.trim();
  try {
    return JSON.parse(s);
  } catch {}
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a >= 0 && b > a) {
    try {
      return JSON.parse(s.slice(a, b + 1));
    } catch {}
  }
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
  const p = new URL(request.url).searchParams;
  const ids = Array.from(new Set([p.get("userId") || "", p.get("telegramId") || ""].filter(Boolean)));
  const isAdmin = p.get("role") === "admin";
  if (isAdmin) {
    return NextResponse.json({
      ok: true,
      limit: ADMIN_LIMIT,
      used: 0,
      remaining: ADMIN_LIMIT,
      pro: true,
      course: true,
      admin: true,
      tier: "admin",
    });
  }
  if (!ids.length || !db) {
    return NextResponse.json({
      ok: true,
      limit: FREE_LIMIT,
      used: 0,
      remaining: FREE_LIMIT,
      pro: false,
      course: false,
      admin: false,
      tier: "free",
    });
  }
  const [used, pro, course] = await Promise.all([countUsed(ids), isPro(ids), hasActiveCourse(ids)]);
  const limit = resolveLimit(false, pro, course);
  return NextResponse.json({
    ok: true,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    pro,
    course,
    admin: false,
    tier: tierLabel(false, pro, course),
  });
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
  try {
    m = metricsOf(JSON.parse(String(form.get("metrics") || "{}")));
  } catch {}

  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "audio_file_required" }, { status: 400 });
  if (!m) return NextResponse.json({ ok: false, error: "audio_metrics_required" }, { status: 400 });
  if (!userId && !telegramId && !isAdmin) return NextResponse.json({ ok: false, error: "login_required" }, { status: 401 });
  if (file.size <= 0 || file.size > MAX_BYTES)
    return NextResponse.json({ ok: false, error: "file_too_large_or_empty" }, { status: 413 });

  const ids = Array.from(new Set([userId, telegramId].filter(Boolean)));
  const pro = isAdmin ? true : await isPro(ids);
  const course = isAdmin || pro ? true : await hasActiveCourse(ids);
  const limit = resolveLimit(isAdmin, pro, course);
  const used = isAdmin ? 0 : await countUsed(ids);
  if (!isAdmin && used >= limit) {
    return NextResponse.json(
      {
        ok: false,
        code: "daily_limit_reached",
        limit,
        used,
        remaining: 0,
        pro,
        course,
        admin: false,
        tier: tierLabel(false, pro, course),
      },
      { status: 429 },
    );
  }

  const enriched = { ...m };
  let analysis = fallback(enriched, genre, focus, notes);

  try {
    const system = `تو مهندس میکس و مسترینگ سخت‌گیر هستی. مثل پلاگین Reference تحلیل می‌کنی، اما برای هنرجو حرف می‌زنی.

قوانین مهم:
1) اعداد متریک واقعی‌اند — جعل نکن.
2) سخت‌گیر باش: اگر میکس ضعیف است، matchScore را پایین بده (معمولاً زیر ۷۰). فقط میکس‌های واقعاً تمیز و نزدیک رفرنس بالای ۸۰ بگیرند.
3) متن‌ها فارسی ساده و قابل‌اجرا باشند. از واژه‌های خیلی تخصصی بدون توضیح پرهیز کن. می‌توانی اصطلاح رایج مثل EQ، کمپرس، لیمیتر، مونو، رفرنس را نگه داری.
4) هر پیشنهاد باید «چی کار کند + کجا (هرتز/دسی‌بل تقریبی) + چرا» داشته باشد.
5) اگر کاربر مشکل نوشته، همان را اولویت بده.
6) roadmap قدم‌به‌قدم و عملی باشد (حداکثر ۶ قدم).

فقط JSON معتبر با این کلیدها برگردان:
fileSummary, matchScore(0-100),
descriptors{tonal,stereo,dynamics,loudness},
loudness{peak,rms,crest,targetLufs,truePeak},
tonal{summary,low,mid,high,centroid},
stereo{correlation,advice},
dynamics, clipping,
compression{summary,attack,release,ratio,thresholdHint},
eq[string], mixBalance[{element,advice}],
roadmap[string], quickFixes[string], referenceTips, source.`;

    const prompt = `نام فایل: ${(file as File).name}
متریک واقعی: ${JSON.stringify(enriched)}
ژانر هدف: ${genre}
تمرکز: ${focus}
توضیح/مشکل کاربر: ${notes || "—"}

تحلیل سخت‌گیرانه بده. امتیاز را بر اساس فاصله از استاندارد حرفه‌ای همان ژانر بده، نه برای دلگرم کردن.`;

    const result = await autoChat(
      [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      undefined,
      undefined,
      "artistyar-music-analyzer",
    );
    const parsed = parseJson(result.reply);
    if (parsed && typeof parsed === "object") {
      const merged = { ...analysis, ...parsed, source: `ai:${result.provider}/${result.model}` };
      // اگر AI امتیاز خیلی بالا داد ولی متریک ضعیف است، سقف بگذار
      const floor = strictScore(enriched, genre);
      if (typeof merged.matchScore === "number" && merged.matchScore > floor + 12) {
        merged.matchScore = Math.min(merged.matchScore, floor + 8);
      }
      analysis = merged;
    }
  } catch {
    /* keep fallback */
  }

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
      metadata: {
        genre,
        focus,
        fileName: (file as File).name.slice(0, 120),
        durationSec: enriched.durationSec,
        metrics: enriched,
        source: analysis.source,
        admin: isAdmin,
        tier: tierLabel(isAdmin, pro, course),
      },
    });
  }

  return NextResponse.json({
    ok: true,
    analysis,
    metrics: enriched,
    quota: {
      limit,
      used: isAdmin ? 0 : used + 1,
      remaining: isAdmin ? ADMIN_LIMIT : Math.max(0, limit - used - 1),
      pro,
      course,
      admin: isAdmin,
      tier: tierLabel(isAdmin, pro, course),
    },
  });
}
