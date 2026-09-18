import { NextResponse } from "next/server";
import { autoChat, type ChatMessage } from "@/lib/ai-providers";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const dbUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const dbSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const db = dbUrl && dbSecret ? createClient(dbUrl, dbSecret, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
const MIX_FREE_DAILY_LIMIT = 1;
const MIX_PRO_DAILY_LIMIT = 40;

function mixDayStart() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

async function mixQuota(userId: string) {
  if (!db || !userId) return { limit: MIX_FREE_DAILY_LIMIT, used: 0, pro: false };
  const [sub, rows] = await Promise.all([
    db.from("practice_subscriptions").select("id").eq("user_id", userId).eq("status", "active").gt("expires_at", new Date().toISOString()).limit(1),
    db.from("practice_records").select("id").eq("user_id", userId).eq("game_id", "mix-analyzer").gte("played_at", mixDayStart()),
  ]);
  const pro = Boolean(sub.data && sub.data.length);
  return { limit: pro ? MIX_PRO_DAILY_LIMIT : MIX_FREE_DAILY_LIMIT, used: rows.data ? rows.data.length : 0, pro };
}

type AnalyzeBody = {
  genre?: string;
  focus?: string;
  problems?: string;
  stage?: string;
  targetLufs?: string;
  notes?: string;
  userId?: string;
};

type BandAdvice = {
  band: string;
  action: "boost" | "cut" | "hold";
  db: number;
  reason: string;
};

type MixAnalysis = {
  styleSummary: string;
  descriptors: {
    tonal: string;
    stereo: string;
    dynamics: string;
    loudness: string;
  };
  matchScore: number;
  eqCurve: BandAdvice[];
  compression: {
    summary: string;
    attack: string;
    release: string;
    ratio: string;
    thresholdHint: string;
  };
  limiting: {
    targetLufs: string;
    truePeak: string;
    notes: string;
  };
  stereo: string;
  phase: string;
  mixBalance: Array<{ element: string; advice: string }>;
  roadmap: string[];
  quickFixes: string[];
  referenceTips: string;
  source: string;
};

const GENRE_PRESETS: Record<
  string,
  {
    tonal: string;
    stereo: string;
    dynamics: string;
    loudness: string;
    lufs: string;
    eq: BandAdvice[];
    compress: MixAnalysis["compression"];
  }
> = {
  pop: {
    tonal: "Balanced EQ · کمی Bright",
    stereo: "Balanced Width",
    dynamics: "Compressed",
    loudness: "Loud",
    lufs: "-9 تا -8 LUFS (stream: -14)",
    eq: [
      { band: "Sub 20–60Hz", action: "cut", db: 2, reason: "کنترل رُمبل و تمیزی kick/bass" },
      { band: "Low 60–200Hz", action: "hold", db: 0, reason: "بدنهٔ kick و bass را حفظ کن" },
      { band: "Low-mid 200–500Hz", action: "cut", db: 1.5, reason: "کاهش mud برای وضوح وکال" },
      { band: "Presence 2–5kHz", action: "boost", db: 1.5, reason: "وضوح وکال و حضور" },
      { band: "Air 8–16kHz", action: "boost", db: 1, reason: "درخشش بدون تیزی" },
    ],
    compress: {
      summary: "کمپرس متعادل روی باس و وکال؛ glue ملایم روی باس میکس",
      attack: "متوسط (۱۰–۳۰ms روی وکال)",
      release: "متوسط تا سریع",
      ratio: "۳:۱ تا ۴:۱",
      thresholdHint: "۲–۴dB GR روی وکال، ۱–۲dB روی باس میکس",
    },
  },
  "hip-hop": {
    tonal: "Bass-heavy · Full-bodied",
    stereo: "Focused Width (low mono)",
    dynamics: "Transient + Compressed",
    loudness: "Loud تا Super Loud",
    lufs: "-8 تا -7 LUFS (stream: -14)",
    eq: [
      { band: "Sub 30–80Hz", action: "boost", db: 2, reason: "وزن ۸۰۸/باس" },
      { band: "Low-mid 200–400Hz", action: "cut", db: 2, reason: "جلوگیری از گل‌آلودگی" },
      { band: "Kick click 2–4kHz", action: "boost", db: 1.5, reason: "ضربهٔ kick روی اسپیکر کوچک" },
      { band: "Vocal presence 3–5kHz", action: "boost", db: 2, reason: "وکال جلو باشد" },
      { band: "Air 10kHz+", action: "hold", db: 0, reason: "از خش زیاد پرهیز کن" },
    ],
    compress: {
      summary: "باس و ۸۰۸ کنترل‌شده؛ kick punchy؛ وکال محکم",
      attack: "سریع روی باس، کمی آهسته‌تر روی kick برای punch",
      release: "هماهنگ با تمپو",
      ratio: "۴:۱ تا ۸:۱ روی باس",
      thresholdHint: "۳–۶dB GR روی ۸۰۸ در قله‌ها",
    },
  },
  edm: {
    tonal: "Full-bodied · Bright",
    stereo: "Wide (بالا) · Mono (زیر ۱۲۰Hz)",
    dynamics: "Squashed تا Compressed",
    loudness: "Super Loud",
    lufs: "-7 تا -6 LUFS (stream: -14)",
    eq: [
      { band: "Sub 20–50Hz", action: "cut", db: 1, reason: "هدرووم برای لیمیت" },
      { band: "Bass 50–120Hz", action: "boost", db: 1.5, reason: "انرژی باش" },
      { band: "Mud 250–400Hz", action: "cut", db: 2, reason: "فضا برای lead/synth" },
      { band: "Sparkle 5–10kHz", action: "boost", db: 2, reason: "درخشش lead و FX" },
      { band: "Air 12kHz+", action: "boost", db: 1, reason: "باز بودن بالا" },
    ],
    compress: {
      summary: "سایدچین قوی kick→bass؛ باس میکس فشرده برای بلندی",
      attack: "سریع روی باس میکس",
      release: "سریع تا متوسط",
      ratio: "۴:۱+",
      thresholdHint: "۲–۴dB GR مداوم روی باس برای چگالی",
    },
  },
  rock: {
    tonal: "Full-bodied · Warm تا Balanced",
    stereo: "Balanced Width",
    dynamics: "Transient",
    loudness: "Balanced تا Loud",
    lufs: "-10 تا -9 LUFS",
    eq: [
      { band: "Guitar body 200–400Hz", action: "cut", db: 1.5, reason: "کاهش تداخل با باس" },
      { band: "Snare body 200Hz", action: "hold", db: 0, reason: "وزن اسنر" },
      { band: "Snare crack 3–5kHz", action: "boost", db: 2, reason: "ضربه" },
      { band: "Vocal 2–4kHz", action: "boost", db: 1.5, reason: "حضور وکال بین گیتارها" },
      { band: "Cymbal harsh 6–8kHz", action: "cut", db: 1, reason: "کاهش خستگی گوش" },
    ],
    compress: {
      summary: "درامز با punch؛ گیتارها glue؛ وکال جلو",
      attack: "آهسته روی باس درام برای attack",
      release: "متوسط",
      ratio: "۳:۱ تا ۴:۱",
      thresholdHint: "۲–۳dB روی باس میکس، بیشتر روی تک کانال‌ها",
    },
  },
  "persian-pop": {
    tonal: "Warm · Balanced EQ · کمی Bright روی وکال",
    stereo: "Focused تا Balanced Width",
    dynamics: "Compressed",
    loudness: "Loud",
    lufs: "-9 تا -8 LUFS (stream: -14)",
    eq: [
      { band: "Sub rumble", action: "cut", db: 2, reason: "تمیزی لو-اند" },
      { band: "Low-mid 250–450Hz", action: "cut", db: 2, reason: "وضوح بیشتر برای وکال فارسی" },
      { band: "Vocal body 200–350Hz", action: "hold", db: 0, reason: "گرمای وکال" },
      { band: "Vocal presence 3–5kHz", action: "boost", db: 2, reason: "وضوح کلمات" },
      { band: "Air 10–14kHz", action: "boost", db: 1, reason: "درخشش ملایم" },
    ],
    compress: {
      summary: "وکال محکم و یکدست؛ باس کنترل‌شده؛ ریتم زنده",
      attack: "متوسط روی وکال",
      release: "متوسط",
      ratio: "۳:۱ تا ۴:۱",
      thresholdHint: "۳–۵dB GR روی وکال در قله‌ها",
    },
  },
  default: {
    tonal: "Balanced EQ",
    stereo: "Balanced Width",
    dynamics: "Balanced",
    loudness: "Balanced",
    lufs: "-14 LUFS (streaming) یا -9 تا -8 برای بلندتر",
    eq: [
      { band: "Sub 20–60Hz", action: "cut", db: 1.5, reason: "تمیزی" },
      { band: "Mud 200–400Hz", action: "cut", db: 1.5, reason: "وضوح" },
      { band: "Presence 2–5kHz", action: "boost", db: 1, reason: "حضور" },
      { band: "Air 10kHz+", action: "hold", db: 0, reason: "طبیعی بماند" },
    ],
    compress: {
      summary: "کمپرس ملایم و هدفمند",
      attack: "متوسط",
      release: "متوسط",
      ratio: "۳:۱",
      thresholdHint: "۱–۳dB GR",
    },
  },
};

function pickPreset(genre: string) {
  const g = genre.toLowerCase();
  if (g.includes("hip") || g.includes("trap") || g.includes("rap")) return GENRE_PRESETS["hip-hop"];
  if (g.includes("edm") || g.includes("electro") || g.includes("dance") || g.includes("house")) return GENRE_PRESETS.edm;
  if (g.includes("rock") || g.includes("metal") || g.includes("indie")) return GENRE_PRESETS.rock;
  if (g.includes("persian") || g.includes("ایرانی") || g.includes("فارس") || g.includes("پاپ ایرانی")) return GENRE_PRESETS["persian-pop"];
  if (g.includes("pop") || g.includes("پاپ")) return GENRE_PRESETS.pop;
  return GENRE_PRESETS.default;
}

function fallbackAnalysis(body: AnalyzeBody): MixAnalysis {
  const genre = body.genre || "عمومی";
  const preset = pickPreset(genre);
  const focus = body.focus || "فول میکس";
  const problems = body.problems || "";
  const roadmap = [
    `۱) سبک هدف را روی «${genre}» قفل کن و یک رفرنس نزدیک پخش کن (level-match).`,
    "۲) لو-اند را مونو و تمیز کن؛ رُمبل زیر ۴۰Hz را ببر.",
    "۳) mud محدوده ۲۰۰–۴۰۰Hz را با EQ کاهشی کنترل کن تا فضا باز شود.",
    "۴) وکال/لید را در presence جلو بیاور؛ باس و کیک را از هم جدا فرکانسی کن.",
    "۵) کمپرس هدفمند (نه فقط بلند کردن) و در پایان لیمیتر با True Peak امن.",
    "۶) با رفرنس A/B کن: تونال بالانس، عرض استریو، داینامیک، بلندی.",
  ];
  if (problems.includes("گل") || problems.includes("mud") || problems.includes("کدر")) {
    roadmap.unshift("اولویت فوری: کاهش low-mid (۲۰۰–۴۰۰Hz) و چک فاز باس/کیک.");
  }
  if (problems.includes("وکال") || problems.includes("vocal")) {
    roadmap.unshift("اولویت فوری: presence وکال + de-ess + کمپرس یکدست.");
  }

  return {
    styleSummary: `برای سبک «${genre}» و تمرکز روی «${focus}»، هدف نزدیک شدن به پروفایل حرفه‌ای همان ژانر است (شبیه منطق Reference 3: تونال، استریو، داینامیک، بلندی).`,
    descriptors: {
      tonal: preset.tonal,
      stereo: preset.stereo,
      dynamics: preset.dynamics,
      loudness: preset.loudness,
    },
    matchScore: 62,
    eqCurve: preset.eq,
    compression: preset.compress,
    limiting: {
      targetLufs: body.targetLufs || preset.lufs,
      truePeak: "≤ -1.0 dBTP (امن برای استریم)",
      notes: "اول میکس را درست کن؛ لیمیتر فقط سقف و چگالی نهایی بدهد، نه اصلاح EQ.",
    },
    stereo: "زیر ~۱۲۰Hz مونو؛ عرض را روی مید/های باز کن. از widening روی باس پرهیز کن.",
    phase: "کیک و باس را در مونو چک کن. اگر لو-اند خالی شد، polarity یا تایم‌الاین را اصلاح کن.",
    mixBalance: [
      { element: "وکال / لید", advice: "باید از میکس جلو بایستد بدونHarsh شدن presence" },
      { element: "درامز / کیک", advice: "پUNCH و وزن؛ تداخل با باس را با EQ/سایدچین حل کن" },
      { element: "باس", advice: "محکم و کنترل‌شده؛ ساب تمیز" },
      { element: "موسیقی / هارمونی", advice: "فضا بدهد؛ mid شلوغ نشود" },
    ],
    roadmap,
    quickFixes: [
      "Level-match با رفرنس قبل از هر قضاوت",
      "Cut mud قبل از boost حضور",
      "کمپرس برای کنترل، لیمیت برای سقف",
      "A/B هر ۳۰–۶۰ ثانیه با رفرنس",
    ],
    referenceTips:
      "مثل Reference 3: Level Line را با EQ دنبال کن (بالای صفر = boost، زیر صفر = cut). هدف ±۳dB نزدیکی تونال. Match% را روی تونال/استریو/داینامیک/بلندی جدا ببین.",
    source: "preset-fallback",
  };
}

function extractJson<T>(text: string): T | null {
  if (!text) return null;
  const tryParse = (raw: string): T | null => {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  };
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) {
    const p = tryParse(fenced.trim());
    if (p) return p;
  }
  const start = text.indexOf("{");
  if (start >= 0) {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (escape) escape = false;
        else if (ch === "\\") escape = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          const p = tryParse(text.slice(start, i + 1));
          if (p) return p;
          break;
        }
      }
    }
  }
  return null;
}

function normalizeAi(raw: Partial<MixAnalysis>, body: AnalyzeBody): MixAnalysis {
  const base = fallbackAnalysis(body);
  return {
    styleSummary: typeof raw.styleSummary === "string" ? raw.styleSummary : base.styleSummary,
    descriptors: {
      tonal: raw.descriptors?.tonal || base.descriptors.tonal,
      stereo: raw.descriptors?.stereo || base.descriptors.stereo,
      dynamics: raw.descriptors?.dynamics || base.descriptors.dynamics,
      loudness: raw.descriptors?.loudness || base.descriptors.loudness,
    },
    matchScore: Math.max(0, Math.min(100, Number(raw.matchScore) || base.matchScore)),
    eqCurve: Array.isArray(raw.eqCurve) && raw.eqCurve.length ? raw.eqCurve : base.eqCurve,
    compression: raw.compression || base.compression,
    limiting: raw.limiting || base.limiting,
    stereo: typeof raw.stereo === "string" ? raw.stereo : base.stereo,
    phase: typeof raw.phase === "string" ? raw.phase : base.phase,
    mixBalance: Array.isArray(raw.mixBalance) && raw.mixBalance.length ? raw.mixBalance : base.mixBalance,
    roadmap: Array.isArray(raw.roadmap) && raw.roadmap.length ? raw.roadmap : base.roadmap,
    quickFixes: Array.isArray(raw.quickFixes) && raw.quickFixes.length ? raw.quickFixes : base.quickFixes,
    referenceTips: typeof raw.referenceTips === "string" ? raw.referenceTips : base.referenceTips,
    source: "ai",
  };
}

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId")?.trim() || "";
  const quota = await mixQuota(userId);
  return NextResponse.json({ ok: true, dailyLimit: quota.limit, used: quota.used, remaining: Math.max(0, quota.limit - quota.used), pro: quota.pro });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as AnalyzeBody;
  const genre = String(body.genre || "Pop").slice(0, 80);
  const focus = String(body.focus || "فول میکس").slice(0, 80);
  const problems = String(body.problems || "").slice(0, 500);
  const stage = String(body.stage || "میکس").slice(0, 40);
  const notes = String(body.notes || "").slice(0, 800);
  const userId = String(body.userId || "").trim();
  const quota = await mixQuota(userId);
  if (quota.used >= quota.limit) {
    return NextResponse.json({ ok: false, code: "daily_limit_reached", dailyLimit: quota.limit, used: quota.used, remaining: 0, pro: quota.pro }, { status: 429 });
  }


  const system = `تو مهندس میکس/مستر حرفه‌ای هستی و مثل پلاگین Reference 3 تحلیل می‌کنی.
خروجی فقط JSON معتبر با این کلیدها:
styleSummary, descriptors{tonal,stereo,dynamics,loudness}, matchScore(0-100),
eqCurve[{band,action:boost|cut|hold,db,reason}],
compression{summary,attack,release,ratio,thresholdHint},
limiting{targetLufs,truePeak,notes},
stereo, phase,
mixBalance[{element,advice}],
roadmap[string], quickFixes[string], referenceTips.
همه متن‌ها فارسی. اعداد db منطقی (±0 تا 6). عملی و مشخص بنویس، کلی‌گویی ممنوع.`;

  const user = `سبک/ژانر: ${genre}
تمرکز: ${focus}
مرحله: ${stage}
مشکلات گزارش‌شده: ${problems || "—"}
توضیح اضافه: ${notes || "—"}
هدف: تحلیل تونال بالانس، EQ curve پیشنهادی، کمپرس، لیمیت/بلندی، استریو، فاز و یک roadmap قدم‌به‌قدم برای نزدیک شدن به رفرنس حرفه‌ای همان سبک.`;

  try {
    const messages: ChatMessage[] = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];
    const result = await autoChat(messages, undefined, undefined, "artistyar-mix-analyzer");
    const parsed = extractJson<Partial<MixAnalysis>>(result.reply);
    if (parsed) {
      const analysis = normalizeAi(parsed, { genre, focus, problems, stage, notes, targetLufs: body.targetLufs });
      analysis.source = `ai:${result.provider}/${result.model}`;
      return NextResponse.json({ ok: true, analysis });
    }
  } catch {
    /* fallback */
  }

  const analysis = fallbackAnalysis({ genre, focus, problems, stage, notes, targetLufs: body.targetLufs });
  return NextResponse.json({ ok: true, analysis, fallback: true });
}
