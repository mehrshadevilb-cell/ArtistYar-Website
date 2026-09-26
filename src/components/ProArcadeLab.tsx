"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Play, Waves, Zap, Layers, AudioLines } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { usePracticeAccess } from "@/components/usePracticeAccess";

/**
 * Pro Arcade — recovery shell after a failed partial push.
 * Full audio banks remain in git history (pre-placeholder commits).
 * Keeps /practice Pro Arcade navigable without crashing the app.
 */

type SkillId = "reverb" | "saturation" | "masking" | "transient";

const SKILLS: Array<{
  id: SkillId;
  title: string;
  desc: string;
  icon: typeof Waves;
  color: string;
}> = [
  { id: "reverb", title: "Reverb Sense", desc: "Room · Hall · Plate · Decay · Pre-delay", icon: Waves, color: "text-cyan-300" },
  { id: "saturation", title: "Saturation", desc: "Clean · Warm · Tape · Heavy · Distorted", icon: Zap, color: "text-orange-300" },
  { id: "masking", title: "Masking", desc: "Sub · Low-mid · Presence · Air", icon: Layers, color: "text-violet-300" },
  { id: "transient", title: "Transient", desc: "Attack تند/نرم · Punch · Soft · Sustain", icon: AudioLines, color: "text-gold-300" },
];

let sharedCtx: AudioContext | null = null;

async function getCtx() {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  sharedCtx ||= new AC();
  if (sharedCtx.state === "suspended") {
    try {
      await sharedCtx.resume();
    } catch {
      return null;
    }
  }
  try {
    const buf = sharedCtx.createBuffer(1, 1, sharedCtx.sampleRate);
    const src = sharedCtx.createBufferSource();
    src.buffer = buf;
    const g = sharedCtx.createGain();
    g.gain.value = 0.0001;
    src.connect(g).connect(sharedCtx.destination);
    src.start(0);
  } catch {
    /* ignore */
  }
  return sharedCtx;
}

async function playDemo(skill: SkillId) {
  const c = await getCtx();
  if (!c) return;
  const now = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = skill === "saturation" ? "sawtooth" : "sine";
  o.frequency.value = skill === "masking" ? 250 : skill === "transient" ? 180 : 220;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.15, now + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
  o.connect(g).connect(c.destination);
  o.start(now);
  o.stop(now + 0.6);
}

export function ProArcadeLab({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { loading: accessLoading, stageLimit, pro, proExpiresAt } = usePracticeAccess();
  const [skill, setSkill] = useState<SkillId | null>(null);
  const [round, setRound] = useState(0);
  const [played, setPlayed] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  const stageNumber = round + 1;
  const stageLocked = !accessLoading && !pro && stageNumber > stageLimit;

  if (accessLoading) {
    return (
      <section className="mt-10">
        <button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>
          بازگشت
        </button>
        <div className="card-ay mt-5 p-8 text-center text-sm text-ink-400">در حال بررسی دسترسی…</div>
      </section>
    );
  }

  if (stageLocked && !pro) {
    return (
      <section className="mt-10">
        <button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>
          بازگشت
        </button>
        <div className="card-ay mt-5 p-8 text-center">
          <p className="eyebrow text-gold-300">PRACTICE STAGE LIMIT</p>
          <h1 className="mt-3 text-2xl font-semibold text-sand-50">مراحل رایگان تمام شد</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-8 text-ink-400">
            بدون اشتراک ۵ مرحله در دسترس است
            {proExpiresAt
              ? ` · اشتراک فعلی تا ${new Date(proExpiresAt).toLocaleDateString("fa-IR")}`
              : "."}
          </p>
        </div>
      </section>
    );
  }

  if (!skill) {
    return (
      <section className="mt-10" dir="rtl">
        <button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>
          <ArrowLeft size={14} /> بازگشت
        </button>
        <div className="card-ay mt-5 p-6 sm:p-10">
          <p className="eyebrow text-gold-300">PRO ARCADE</p>
          <h1 className="mt-3 text-2xl font-semibold text-sand-50">آرکید حرفه‌ای</h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-ink-400">
            ریورب، سچوریشن، ماسکینگ و ترنزینت — با unlock صوتی موبایل. برای تمرین اصلی گوش از باشگاه
            گوش (۶ بازی) استفاده کن.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {SKILLS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSkill(s.id);
                    setRound(0);
                    setPlayed(false);
                    setPicked(null);
                  }}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-right transition hover:border-white/20"
                >
                  <Icon className={s.color} size={22} aria-hidden />
                  <strong className="mt-3 block text-sand-50">{s.title}</strong>
                  <span className="mt-1 block text-xs text-ink-500">{s.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  const meta = SKILLS.find((s) => s.id === skill)!;
  const bank =
    skill === "reverb"
      ? ["Room کوتاه", "Hall بلند", "Plate فلزی", "بدون Reverb"]
      : skill === "saturation"
        ? ["Clean", "Warm", "Heavy", "Distorted"]
        : skill === "masking"
          ? ["Sub (~60Hz)", "Low-mid (~250Hz)", "Presence (~3kHz)", "Air (~10kHz)"]
          : ["Attack تند", "Attack نرم", "Sustain بلند", "Release سریع"];

  // New random correct answer + shuffled options every round
  const { answer, options } = useMemo(() => {
    const salt = Math.floor(Math.random() * 1e9) ^ (round * 9973) ^ Date.now();
    const idx = Math.abs(salt) % bank.length;
    const correct = bank[idx];
    const opts = [...bank];
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.abs((salt + i * 17) * 2654435761) % (i + 1);
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return { answer: correct, options: opts };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill, round]);

  return (
    <section className="mt-10" dir="rtl">
      <button
        type="button"
        className="btn-ghost !px-4 !py-2 text-xs"
        onClick={() => setSkill(null)}
      >
        بازگشت به مهارت‌ها
      </button>
      <div className="card-ay mt-5 p-6 sm:p-8">
        <p className="text-[11px] text-gold-300">
          PRO · {meta.title.toUpperCase()} · ROUND {round + 1}
        </p>
        <h2 className="mt-2 text-xl font-semibold text-sand-50">{meta.title}</h2>
        <p className="mt-2 text-sm text-ink-400">{meta.desc}</p>

        <button
          type="button"
          className="btn-primary mt-5 inline-flex items-center gap-2 !px-5 !py-2"
          onClick={() => {
            void playDemo(skill);
            setPlayed(true);
          }}
        >
          <Play size={15} fill="currentColor" /> {played ? "پخش دوباره" : "پخش نمونه"}
        </button>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              disabled={!played || picked !== null}
              onClick={() => {
                setPicked(o);
                if (user?.id && user.username) {
                  const ok = o === answer;
                  void fetch("/api/practice/progress", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                      userId: user.id,
                      username: user.username,
                      fullName: user.fullName,
                      telegramId: user.telegramId,
                      gameId: `pro-${skill}`,
                      score: ok ? 20 : -5,
                      accuracy: ok ? 100 : 0,
                      streak: ok ? 1 : 0,
                      bestScore: ok ? 20 : 0,
                      metadata: { round, skill, recoveryShell: true },
                    }),
                  }).catch(() => {});
                }
              }}
              className={`rounded-xl border p-3 text-sm ${
                picked
                  ? o === answer
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                    : o === picked
                      ? "border-red-400/40 text-red-200"
                      : "border-white/10 text-ink-500"
                  : "border-white/10 text-ink-300 hover:border-gold-400/40"
              }`}
            >
              {o}
            </button>
          ))}
        </div>

        {picked && (
          <button
            type="button"
            className="btn-primary mt-6"
            onClick={() => {
              setRound((r) => r + 1);
              setPlayed(false);
              setPicked(null);
            }}
          >
            راند بعد
          </button>
        )}
      </div>
    </section>
  );
}
