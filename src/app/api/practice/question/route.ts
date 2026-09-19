import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { USER_SESSION_COOKIE, verifyUserSession } from "@/lib/server-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GameId = "tone" | "eq" | "compressor" | "phase";
type GeneratedQuestion = {
  gameId: GameId;
  prompt: string;
  hint: string;
  answer: string | number;
  options: Array<string | number>;
  audio: Record<string, number | string>;
  difficulty: number;
  source: string;
  fingerprint?: string;
};

const dbUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const dbSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const db =
  dbUrl && dbSecret
    ? createClient(dbUrl, dbSecret, { auth: { autoRefreshToken: false, persistSession: false } })
    : null;

const MODEL_CONFIGS = [
  ["OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_MODEL", "https://api.openai.com/v1", process.env.OPENAI_MODEL || "gpt-5.6-luna"],
  ["OPENROUTER_API_KEY", "OPENROUTER_BASE_URL", "OPENROUTER_MODEL", "https://openrouter.ai/api/v1", process.env.OPENROUTER_MODEL || "openai/gpt-5.6-luna"],
  ["GROQ_API_KEY", "GROQ_BASE_URL", "GROQ_MODEL", "https://api.groq.com/openai/v1", process.env.GROQ_MODEL || "llama-3.3-70b-versatile"],
  ["DEEPSEEK_API_KEY", "DEEPSEEK_BASE_URL", "DEEPSEEK_MODEL", "https://api.deepseek.com/v1", process.env.DEEPSEEK_MODEL || "deepseek-chat"],
  ["MISTRAL_API_KEY", "MISTRAL_BASE_URL", "MISTRAL_MODEL", "https://api.mistral.ai/v1", process.env.MISTRAL_MODEL || "mistral-small-latest"],
  ["TOGETHER_API_KEY", "TOGETHER_BASE_URL", "TOGETHER_MODEL", "https://api.together.xyz/v1", process.env.TOGETHER_MODEL || "meta-llama/Llama-3.3-70B-Instruct-Turbo"],
  ["XAI_API_KEY", "XAI_BASE_URL", "XAI_MODEL", "https://api.x.ai/v1", process.env.XAI_MODEL || "grok-3-mini"],
  ["BYTEZ_API_KEY", "BYTEZ_BASE_URL", "BYTEZ_MODEL", "https://api.bytez.com/models/v2/openai/v1", process.env.BYTEZ_MODEL || "Qwen/Qwen2.5-72B-Instruct"],
] as const;

function clampLevel(value: unknown) {
  return Math.max(1, Math.min(500, Math.round(Number(value) || 1)));
}

/** 0 at L1, 1 at L500 */
function progress(level: number) {
  return Math.max(0, Math.min(1, (level - 1) / 499));
}

function extractText(payload: any) {
  if (typeof payload?.choices?.[0]?.message?.content === "string") return payload.choices[0].message.content;
  if (Array.isArray(payload?.choices?.[0]?.message?.content))
    return payload.choices[0].message.content.map((x: any) => x?.text || "").join("");
  if (typeof payload?.output_text === "string") return payload.output_text;
  return "";
}

function parseJson(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("invalid_json");
  }
}

function normalize(raw: unknown, gameId: GameId, level: number): GeneratedQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const options = Array.isArray(r.options) ? r.options : [];
  const answer = typeof r.answer === "number" || typeof r.answer === "string" ? r.answer : null;
  if (answer === null || options.length < 4 || typeof r.prompt !== "string") return null;
  const unique = [...new Set(options.map(String))];
  if (unique.length < 4 || !unique.some((v) => v === String(answer))) return null;
  const audio = r.audio && typeof r.audio === "object" ? (r.audio as Record<string, number | string>) : {};
  const common = { gameId, prompt: r.prompt, hint: typeof r.hint === "string" ? r.hint : "", difficulty: level, source: "ai" };
  if (gameId === "tone") {
    const frequency = Number(audio.frequency ?? answer);
    if (!Number.isFinite(frequency) || frequency < 40 || frequency > 19000) return null;
    return { ...common, answer: frequency, options: unique.slice(0, 6).map(Number), audio: { frequency } };
  }
  if (gameId === "eq") {
    const frequency = Number(audio.frequency);
    if (!Number.isFinite(frequency) || frequency < 60 || frequency > 18000) return null;
    // Clamp AI gain to progressive range for this level
    const t = progress(level);
    const maxGain = 12 - t * 11.5; // 12 dB → 0.5 dB
    const minGain = Math.max(0.5, maxGain * 0.4);
    let gain = Number(audio.gain);
    if (!Number.isFinite(gain)) gain = maxGain;
    gain = Math.max(minGain, Math.min(maxGain, Math.abs(gain)));
    return { ...common, answer: String(answer), options: unique.slice(0, 6), audio: { frequency, gain } };
  }
  if (gameId === "compressor") {
    const attack = Number(audio.attack);
    const release = Number(audio.release);
    const ratio = Number(audio.ratio);
    const threshold = Number(audio.threshold);
    if (![attack, release, ratio, threshold].every(Number.isFinite)) return null;
    return { ...common, answer: String(answer), options: unique.slice(0, 6), audio: { attack, release, ratio, threshold } };
  }
  const phase = String(answer);
  if (!["normal", "inverted"].includes(phase)) return null;
  return { ...common, answer: phase, options: ["normal", "inverted"], audio: { phase } };
}

function fallback(gameId: GameId, level: number, recent: string[] = []): GeneratedQuestion {
  const t = progress(level);
  const offset = recent.length + level;

  if (gameId === "tone") {
    // Wide spacing at L1, tight at L500
    const centers = [55, 80, 110, 180, 260, 440, 700, 1200, 2200, 3500, 5000, 7000, 9000, 12000, 16000];
    const frequency = centers[offset % centers.length];
    const detunePct = 0.35 - t * 0.32; // ±35% → ±3%
    const options = [
      frequency,
      Math.round(frequency * (1 + detunePct)),
      Math.round(frequency * (1 - detunePct)),
      Math.round(frequency * (1 + detunePct * 1.8)),
    ];
    return {
      gameId,
      prompt: "تون را با دقت گوش کن و نزدیک‌ترین فرکانس را انتخاب کن.",
      hint: t < 0.3 ? "محدوده خیلی متفاوت است — اول محدوده را پیدا کن." : "فاصله‌ها کوچک‌تر شده؛ با دقت مقایسه کن.",
      answer: frequency,
      options: [...new Set(options)],
      audio: { frequency },
      difficulty: level,
      source: "fallback",
    };
  }

  if (gameId === "eq") {
    const bands = [80, 150, 250, 500, 1000, 2000, 3000, 5000, 8000, 10000, 14000];
    const frequency = bands[offset % bands.length];
    // ±12 dB at L1 → ±0.5 dB at L500
    const gain = Math.round((12 - t * 11.5) * 10) / 10;
    const label =
      frequency < 100 ? "زیر ۱۰۰Hz" : "حدود " + (frequency >= 1000 ? frequency / 1000 + "kHz" : frequency + "Hz");
    const pool = ["زیر ۱۰۰Hz", "حدود ۲۵۰Hz", "حدود ۱kHz", "حدود ۳kHz", "حدود ۸kHz", "حدود ۱۰kHz"];
    const options = [label, ...pool.filter((x) => x !== label)].slice(0, 4);
    return {
      gameId,
      prompt:
        t < 0.25
          ? "یک boost واضح EQ را بشنو و ناحیه اصلی آن را تشخیص بده."
          : "تغییر ظریف EQ را بشنو و ناحیه اصلی را پیدا کن.",
      hint: t < 0.25 ? "تفاوت بسیار واضح است." : "تفاوت subtle است — به محل انرژی گوش بده.",
      answer: label,
      options,
      audio: { frequency, gain },
      difficulty: level,
      source: "fallback",
    };
  }

  if (gameId === "compressor") {
    // Extreme settings at L1, subtle at L500
    const fastA = 0.003 + t * 0.012; // 3ms → 15ms
    const slowA = 0.12 - t * 0.08; // 120ms → 40ms
    const fastR = 0.05 + t * 0.05;
    const slowR = 0.55 - t * 0.35;
    const highRatio = 12 - t * 6; // 12 → 6
    const lowRatio = 2 + t * 1.5; // 2 → 3.5
    const lowTh = -36 + t * 12; // -36 → -24
    const highTh = -8 - t * 6; // -8 → -14

    const rows = [
      ["Attack سریع", fastA, 0.2, 6, -24],
      ["Attack آهسته", slowA, 0.2, 6, -24],
      ["Release سریع", 0.02, fastR, 6, -24],
      ["Release آهسته", 0.02, slowR, 6, -24],
      ["Ratio بالا", 0.02, 0.2, highRatio, -24],
      ["Ratio پایین", 0.02, 0.2, lowRatio, -18],
      ["Threshold پایین", 0.02, 0.2, 6, lowTh],
      ["Threshold بالا", 0.02, 0.2, 6, highTh],
    ] as const;
    const row = rows[offset % rows.length];
    const options = [
      row[0],
      rows[(offset + 2) % rows.length][0],
      rows[(offset + 4) % rows.length][0],
      rows[(offset + 6) % rows.length][0],
    ];
    return {
      gameId,
      prompt: "رفتار کمپرسور را از روی نمونه صوتی تشخیص بده.",
      hint: t < 0.3 ? "تفاوت attack/release کاملاً محسوس است." : "تفاوت‌ها ظریف‌تر شده‌اند.",
      answer: row[0],
      options: [...new Set(options)],
      audio: { attack: row[1], release: row[2], ratio: row[3], threshold: row[4] },
      difficulty: level,
      source: "fallback",
    };
  }

  // Phase: full inversion at L1; partial cancellation (gain imbalance) at high levels still uses inverted polarity
  // Client plays inverted as opposite gain — always audible but harder with shorter tones at high level via difficulty flag
  const phase = offset % 2 === 0 ? "normal" : "inverted";
  return {
    gameId,
    prompt: "به نمونه گوش کن و polarity را تشخیص بده.",
    hint: t < 0.3 ? "تفاوت cancellation کاملاً واضح است." : "به مرکز تصویر و low-end دقت کن.",
    answer: phase,
    options: ["normal", "inverted"],
    audio: { phase, cancelDepth: 1 - t * 0.55 }, // client can use for mix amount
    difficulty: level,
    source: "fallback",
  };
}

async function ask(key: string, base: string, model: string, prompt: string) {
  const response = await fetch(base.replace(/\/$/, "") + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify({
      model,
      temperature: 1.05,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content:
            "You are an expert music ear-training question designer. Return ONLY valid JSON. Never repeat generic templates. Generate a musically plausible, objectively scorable listening question. Audio parameters must exactly match the answer.",
        },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("provider_" + response.status);
  return extractText(await response.json());
}

function buildPrompt(gameId: GameId, level: number, recent: string[]) {
  const t = progress(level);
  const difficultyNote =
    level <= 50
      ? "Difficulty is BEGINNER: differences must be large and obvious (EQ ±10–12dB, extreme attack/release)."
      : level <= 200
        ? "Difficulty is INTERMEDIATE: moderate differences."
        : level >= 400
          ? "Difficulty is EXPERT: differences must be very subtle (EQ ±0.5–1.5dB, tiny attack/release deltas)."
          : "Difficulty is ADVANCED: small but hearable differences.";

  const style =
    gameId === "tone"
      ? "Create a frequency-identification task. answer is numeric Hz, options 4-6 numeric frequencies, audio.frequency equals answer. Spacing between options shrinks with level."
      : gameId === "eq"
        ? `Create an EQ task. answer is a concise Persian band label, options contain answer and 3-5 distractors, audio.frequency is center Hz and audio.gain is in range appropriate for level (${(12 - t * 11.5).toFixed(1)} dB target magnitude).`
        : gameId === "compressor"
          ? "Create a compressor task. answer is one of Attack سریع, Attack آهسته, Release سریع, Release آهسته, Ratio بالا, Ratio پایین, Threshold پایین, Threshold بالا. Set audio.attack/release/ratio/threshold consistently with the answer and level subtlety."
          : "Create a polarity task. answer exactly normal or inverted and audio.phase equals answer.";

  return (
    "Game: " +
    gameId +
    ". Adaptive level: " +
    level +
    "/500. " +
    difficultyNote +
    " " +
    style +
    " Use Persian for prompt and hint. Make the scenario concrete for a professional music producer. Do not copy previous questions. Recent fingerprints to avoid: " +
    (recent.join(" | ") || "none") +
    ". Return JSON keys prompt, hint, answer, options, audio."
  );
}

async function generate(gameId: GameId, level: number, recent: string[]) {
  const prompt = buildPrompt(gameId, level, recent);
  const active = MODEL_CONFIGS.filter(([keyName]) => Boolean(process.env[keyName]));
  if (!active.length) return fallback(gameId, level, recent);

  const ensembleSize = level >= 300 ? 3 : level >= 100 ? 2 : 1;
  const selected = active.slice(0, ensembleSize);
  const results = await Promise.allSettled(
    selected.map(async ([keyName, baseName, modelName, defaultBase, defaultModel]) => {
      const key = process.env[keyName]!;
      const text = await ask(
        key,
        process.env[baseName] || defaultBase,
        process.env[modelName] || defaultModel,
        prompt,
      );
      const question = normalize(parseJson(text), gameId, level);
      if (!question) throw new Error("invalid_question");
      return { question, provider: keyName, model: process.env[modelName] || defaultModel };
    }),
  );
  const candidates = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));

  if (!candidates.length) return fallback(gameId, level, recent);
  if (candidates.length === 1) return { ...candidates[0].question, source: `ai:${candidates[0].provider}` };

  const grouped = new Map<string, typeof candidates>();
  for (const candidate of candidates) {
    const key = JSON.stringify({ answer: candidate.question.answer, audio: candidate.question.audio });
    const group = grouped.get(key) || [];
    group.push(candidate);
    grouped.set(key, group);
  }
  const consensus = [...grouped.values()].sort((a, b) => b.length - a.length)[0];
  const winner =
    consensus.length > 1
      ? consensus[Math.abs(level + recent.length) % consensus.length]
      : [...candidates].sort((a, b) => {
          const aScore = a.question.prompt.length + a.question.hint.length + a.question.options.length * 10;
          const bScore = b.question.prompt.length + b.question.hint.length + b.question.options.length * 10;
          return bScore - aScore;
        })[(level + recent.length) % candidates.length];
  return {
    ...winner.question,
    source: `ensemble:${candidates.map((c) => c.provider.replace("_API_KEY", "")).join("+")}`,
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const gameId = String(body.gameId || "tone") as GameId;
  if (!["tone", "eq", "compressor", "phase"].includes(gameId))
    return NextResponse.json({ ok: false, error: "unsupported_game" }, { status: 400 });
  const level = clampLevel(body.level);
  const session = verifyUserSession((await cookies()).get(USER_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const requestedUserId = String(body.userId || "").trim();
  if (requestedUserId && requestedUserId !== session.id)
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const userId = session.id;
  const recent = Array.isArray(body.recent) ? body.recent.map(String).slice(-12) : [];
  if (db) {
    const { data } = await db
      .from("practice_ai_questions")
      .select("fingerprint")
      .eq("user_id", userId)
      .eq("game_id", gameId)
      .order("created_at", { ascending: false })
      .limit(12);
    if (data) recent.push(...data.map((x) => String(x.fingerprint)));
  }
  let question: GeneratedQuestion | null = null;
  for (let attempt = 0; attempt < 3 && !question; attempt++) {
    const candidate = await generate(gameId, level, recent);
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          gameId,
          answer: candidate.answer,
          options: candidate.options,
          audio: candidate.audio,
          prompt: candidate.prompt,
        }),
      )
      .digest("hex");
    if (!recent.includes(fingerprint)) question = { ...candidate, fingerprint };
    else recent.push(fingerprint);
  }
  if (!question) {
    const q = fallback(gameId, level, recent);
    question = {
      ...q,
      fingerprint: createHash("sha256").update(JSON.stringify({ gameId, q })).digest("hex"),
    };
  }
  if (db)
    await db
      .from("practice_ai_questions")
      .insert({ user_id: userId, game_id: gameId, level, fingerprint: question.fingerprint, question });
  return NextResponse.json({ ok: true, question });
}
