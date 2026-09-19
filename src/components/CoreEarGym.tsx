"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Headphones, Play, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

type GameId = "tone" | "eq" | "compressor" | "phase";
type Question = {
  gameId: GameId;
  prompt: string;
  hint: string;
  answer: string | number;
  options: Array<string | number>;
  audio: Record<string, number | string>;
  difficulty: number;
  fingerprint?: string;
  source?: string;
  verificationToken?: string;
};

const META: Record<GameId, { title: string; desc: string }> = {
  tone: { title: "Frequency", desc: "فرکانس را با گوش پیدا کن" },
  eq: { title: "EQ", desc: "ناحیه‌ی تغییر EQ را تشخیص بده" },
  compressor: { title: "Compression", desc: "رفتار کمپرسور را از transient بشنو" },
  phase: { title: "Phase", desc: "پایداری مرکز و low-end را تشخیص بده" },
};

const STARTERS: Record<GameId, Question> = {
  tone: {
    gameId: "tone",
    prompt: "نمونه را گوش کن و نزدیک‌ترین فرکانس را انتخاب کن.",
    hint: "اول محدوده را پیدا کن، بعد فاصلهٔ نسبی را بسنج.",
    answer: 440,
    options: [220, 330, 440, 660],
    audio: { frequency: 440 },
    difficulty: 1,
    source: "starter",
  },
  eq: {
    gameId: "eq",
    prompt: "نمونهٔ EQ را بشنو و ناحیهٔ اصلی تقویت‌شده را انتخاب کن.",
    hint: "به محل انرژی تغییر توجه کن، نه بلندی کلی.",
    answer: "حدود ۱kHz",
    options: ["زیر ۱۰۰Hz", "حدود ۲۵۰Hz", "حدود ۱kHz", "حدود ۸kHz"],
    audio: { frequency: 1000, gain: 10 },
    difficulty: 1,
    source: "starter",
  },
  compressor: {
    gameId: "compressor",
    prompt: "رفتار کمپرسور را از روی نمونهٔ صوتی تشخیص بده.",
    hint: "به transient و سرعت بازگشت توجه کن.",
    answer: "Attack سریع",
    options: ["Attack سریع", "Attack آهسته", "Release سریع", "Ratio پایین"],
    audio: { attack: 0.003, release: 0.18, ratio: 8, threshold: -30 },
    difficulty: 1,
    source: "starter",
  },
  phase: {
    gameId: "phase",
    prompt: "به نمونه گوش کن و polarity را تشخیص بده.",
    hint: "روی مرکز تصویر و استحکام low-end تمرکز کن.",
    answer: "normal",
    options: ["normal", "inverted"],
    audio: { frequency: 120, phase: "normal" },
    difficulty: 1,
    source: "starter",
  },
};

function makeNoise(c: AudioContext, seconds: number) {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

let coreAudioContext: AudioContext | null = null;
let corePlaybackStop: (() => void) | null = null;

/** Practice Audio Master Bus: source → DSP → safety limiter → master gain → destination */
function createMasterBus(c: AudioContext) {
  const master = c.createGain();
  // Consistent audible level without clipping (~-6 dBFS peak target)
  master.gain.value = 0.55;

  const limiter = c.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.knee.value = 4;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.12;

  limiter.connect(master);
  master.connect(c.destination);
  return { input: limiter as AudioNode, master, disconnect: () => {
    try { limiter.disconnect(); } catch { /* */ }
    try { master.disconnect(); } catch { /* */ }
  } };
}

async function playQuestion(q: Question) {
  const A = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!A) return;
  corePlaybackStop?.();
  coreAudioContext ||= new A();
  const c = coreAudioContext;
  if (c.state === "suspended") await c.resume();
  if (c.state !== "running") throw new Error("audio_context_unavailable");
  const now = c.currentTime + 0.03;
  const scheduled: Array<OscillatorNode | AudioBufferSourceNode> = [];
  const bus = createMasterBus(c);

  corePlaybackStop = () => {
    for (const source of scheduled) {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
      try {
        source.disconnect();
      } catch {
        /* already disconnected */
      }
    }
    scheduled.length = 0;
    bus.disconnect();
    corePlaybackStop = null;
  };

  if (q.gameId === "tone") {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = Number(q.audio.frequency);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    o.connect(g).connect(bus.input);
    o.start(now);
    o.stop(now + 1.25);
    scheduled.push(o);
  } else if (q.gameId === "eq") {
    const src = c.createBufferSource();
    const f = c.createBiquadFilter();
    const g = c.createGain();
    src.buffer = makeNoise(c, 1.5);
    f.type = "peaking";
    f.frequency.value = Number(q.audio.frequency);
    f.Q.value = 1.1;
    f.gain.value = Number(q.audio.gain) || 6;
    g.gain.value = 0.28;
    src.connect(f).connect(g).connect(bus.input);
    src.start(now);
    src.stop(now + 1.5);
    scheduled.push(src);
  } else if (q.gameId === "compressor") {
    const src = c.createBufferSource();
    const comp = c.createDynamicsCompressor();
    const g = c.createGain();
    src.buffer = makeNoise(c, 1.5);
    comp.attack.value = Number(q.audio.attack) || 0.02;
    comp.release.value = Number(q.audio.release) || 0.2;
    comp.ratio.value = Number(q.audio.ratio) || 4;
    comp.threshold.value = Number(q.audio.threshold) || -24;
    g.gain.value = 0.4;
    src.connect(comp).connect(g).connect(bus.input);
    src.start(now);
    src.stop(now + 1.5);
    scheduled.push(src);
  } else {
    const a = c.createOscillator();
    const b = c.createOscillator();
    const ga = c.createGain();
    const gb = c.createGain();
    const sum = c.createGain();
    const depth = Number(q.audio.cancelDepth);
    const cancel = Number.isFinite(depth) ? Math.max(0.35, Math.min(1, depth)) : 1;
    a.type = "sine";
    b.type = "sine";
    a.frequency.value = 180;
    b.frequency.value = 180;
    ga.gain.value = 0.22;
    gb.gain.value = String(q.audio.phase) === "inverted" ? -0.22 * cancel : 0.22 * cancel;
    sum.gain.value = 0.9;
    a.connect(ga).connect(sum);
    b.connect(gb).connect(sum);
    sum.connect(bus.input);
    a.start(now);
    b.start(now);
    a.stop(now + 1.1);
    b.stop(now + 1.1);
    scheduled.push(a, b);
  }

  window.setTimeout(() => {
    if (corePlaybackStop) corePlaybackStop();
  }, 1900);
}

function learningFeedback(q: Question, ok: boolean) {
  if (ok) {
    if (q.gameId === "tone") return "دقیقاً همین محدوده را باید در میکس پیدا کنی؛ دفعه بعد سعی کن سریع‌تر همان ناحیه را locate کنی.";
    if (q.gameId === "eq") return "خوب شنیدی. در EQ به محل بیشترین تغییر انرژی توجه کن، نه صرفاً بلندتر شدن صدا.";
    if (q.gameId === "compressor") return "خوب شنیدی. transient، punch و سرعت برگشت gain را به‌عنوان سه cue اصلی دنبال کن.";
    return "خوب شنیدی. در phase به مرکز تصویر، افت low-end و تغییر mono compatibility دقت کن.";
  }
  if (q.gameId === "tone") return "اشتباه رایج: اول محدوده را تشخیص بده (sub / low-mid / presence / air)، بعد بین فرکانس‌های نزدیک تصمیم بگیر.";
  if (q.gameId === "eq") return "به تغییر tonal balance گوش بده؛ اگر boost واضح است، دنبال جایی باش که بیشترین رنگ صدا عوض می‌شود.";
  if (q.gameId === "compressor") return "به شروع transient و سپس recovery گوش بده؛ attack سرعت عبور transient را تعیین می‌کند و release سرعت برگشت gain را.";
  return "برای phase فقط به بلندی نگاه نکن؛ مرکز تصویر و استحکام low-end را در حالت stereo و mono مقایسه کن.";
}

export function CoreEarGym({ onBack }: { onBack?: () => void }) {
  const { user, ready } = useAuth();
  const [game, setGame] = useState<GameId>("tone");
  const [q, setQ] = useState<Question | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; correct: string; responseTimeMs: number } | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [lastPlayed, setLastPlayed] = useState(false);
  const started = useRef(0);
  const sessionId = useRef("");

  const loadAdaptive = useCallback(async () => {
    setLoading(true);
    setAnswer(null);
    setResult(null);
    setLastPlayed(false);
    sessionId.current ||= globalThis.crypto?.randomUUID?.() || String(Date.now());

    if (!user?.id) {
      setGuestMode(true);
      setQ(STARTERS[game]);
      started.current = Date.now();
      setLoading(false);
      return;
    }

    setGuestMode(false);
    try {
      const p = await fetch("/api/practice/adaptive?userId=" + encodeURIComponent(user.id), {
        cache: "no-store",
        credentials: "include",
      }).then((r) => r.json());

      const match = p?.exercises?.find((x: { gameId?: string }) => x.gameId === game);
      const level = Math.max(1, Math.min(500, Number(match?.difficulty) || 250));
      const d = await fetch("/api/practice/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: game, level, userId: user.id }),
      }).then((r) => r.json());

      if (d?.ok && d.question) {
        setQ({ ...d.question, verificationToken: d.verificationToken });
        setRating(Number(p.overallRating) || null);
        started.current = Date.now();
      } else {
        setQ(STARTERS[game]);
        started.current = Date.now();
      }
    } catch {
      setQ(STARTERS[game]);
      started.current = Date.now();
    } finally {
      setLoading(false);
    }
  }, [user?.id, game]);

  useEffect(() => {
    if (!ready) return;
    void loadAdaptive();
  }, [loadAdaptive, ready]);

  useEffect(
    () => () => {
      corePlaybackStop?.();
    },
    [],
  );

  const play = async () => {
    if (!q || playing) return;
    setAudioError(null);
    setPlaying(true);
    setLastPlayed(true);
    try {
      await playQuestion(q);
      window.setTimeout(() => setPlaying(false), 1900);
    } catch {
      setPlaying(false);
      setAudioError("پخش صوت شروع نشد؛ یک بار دیگر روی پخش بزن و مطمئن شو مرورگر اجازهٔ صدا دارد.");
    }
  };

  const choose = async (value: string) => {
    if (!q || answer || !lastPlayed) return;
    setAnswer(value);
    const ok = String(q.answer) === value;
    const responseTimeMs = started.current ? Math.max(1, Date.now() - started.current) : 0;
    setResult({ ok, correct: String(q.answer), responseTimeMs });

    if (user?.id && user.username) {
      await fetch("/api/practice/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: user.id,
          username: user.username,
          fullName: user.fullName,
          telegramId: user.telegramId,
          gameId: q.gameId,
          score: ok ? 20 : 0,
          accuracy: ok ? 100 : 0,
          streak: ok ? 1 : 0,
          bestScore: ok ? 20 : 0,
          metadata: {
            source: "core_ear_gym",
            difficulty: q.difficulty,
            responseTimeMs,
            correct: ok,
            answer: value,
            itemKey: q.fingerprint || q.prompt,
            verificationToken: q.verificationToken,
            sessionId: sessionId.current,
          },
        }),
      }).catch(() => undefined);
    }
  };

  return (
    <section className="mt-10 card-ay overflow-hidden">
      <div className="border-b border-white/[.07] p-5 sm:p-6">
        <button type="button" className="btn-ghost !px-3 !py-2 text-xs" onClick={onBack}>
          <ArrowRight size={13} /> بازگشت
        </button>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-cyan-200">CORE EAR GYM · ADAPTIVE</p>
            <h2 className="mt-2 text-xl font-semibold text-sand-50">تمرین واقعی گوش</h2>
            <p className="mt-1 text-xs leading-6 text-ink-500">
              هر پاسخ فقط سختی را تعیین نمی‌کند؛ بخشی از پروفایل مهارت شنیداری توست.
            </p>
          </div>
          {rating ? (
            <span className="rounded-full border border-gold-400/20 bg-gold-400/[.06] px-3 py-1.5 text-[11px] text-gold-200">
              Ear Rating {rating}
            </span>
          ) : null}
        </div>
        {guestMode ? (
          <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[.06] p-3 text-xs leading-6 text-amber-100">
            در حال تمرین آفلاین هستی. برای ذخیره پیشرفت و سختی تطبیقی{" "}
            <Link href="/login" className="text-gold-300 underline-offset-2 hover:underline">
              وارد حساب شو
            </Link>
            .
          </p>
        ) : null}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(META) as GameId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setGame(id)}
              className={
                "rounded-xl border px-3 py-3 text-right transition " +
                (game === id ? "border-gold-400/40 bg-gold-400/[.08]" : "border-white/[.07] bg-white/[.02]")
              }
            >
              <strong className="block text-xs text-sand-100">{META[id].title}</strong>
              <span className="mt-1 block text-[10px] text-ink-500">{META[id].desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 sm:p-7">
        {loading || !q ? (
          <div className="py-8 text-center text-sm text-ink-500">در حال آماده‌سازی تمرین تطبیقی…</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-ink-500">Difficulty {q.difficulty}/500</p>
                <h3 className="mt-2 text-lg text-sand-50">{q.prompt}</h3>
                <p className="mt-1 text-xs text-ink-500">{q.hint}</p>
              </div>
              <button type="button" className="btn-primary !px-4 !py-2 text-xs" onClick={() => void play()} disabled={playing}>
                <Play size={14} fill="currentColor" /> پخش
              </button>
            </div>
            {audioError ? <p className="mt-3 text-xs text-red-300">{audioError}</p> : null}

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {q.options.map((o) => {
                const s = String(o);
                const correct = answer !== null && s === String(q.answer);
                const picked = answer === s;
                return (
                  <button
                    key={s}
                    disabled={!!answer || !lastPlayed}
                    onClick={() => void choose(s)}
                    className={
                      "rounded-xl border p-3 text-sm transition " +
                      (correct
                        ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
                        : picked
                          ? "border-red-400/40 bg-red-400/10 text-red-200"
                          : "border-white/10 text-ink-200 hover:border-gold-400/40")
                    }
                  >
                    {s}
                  </button>
                );
              })}
            </div>

            {result ? (
              <div
                className={
                  "mt-5 rounded-xl border p-4 " +
                  (result.ok ? "border-emerald-400/20 bg-emerald-400/[.06]" : "border-red-400/20 bg-red-400/[.05]")
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className={result.ok ? "text-emerald-200" : "text-red-200"}>
                    {result.ok ? "درست · مهارت ثبت شد" : "نادرست · پاسخ صحیح: " + result.correct}
                  </strong>
                  <span className="text-[11px] text-ink-500">زمان پاسخ: {(result.responseTimeMs / 1000).toFixed(1)}s</span>
                </div>
                <p className="mt-2 text-xs leading-6 text-ink-400">{learningFeedback(q, result.ok)}</p>
                <button type="button" className="btn-primary mt-4 !px-4 !py-2 text-xs" onClick={() => void loadAdaptive()}>
                  <RotateCcw size={13} /> تمرین بعدی
                </button>
              </div>
            ) : (
              <p className="mt-4 flex items-center gap-2 text-[11px] text-ink-500">
                <Headphones size={13} /> با هدفون گوش بده؛ هدف تمرین، تصمیمی است که در میکس واقعی می‌گیری. ابتدا پخش کن.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
