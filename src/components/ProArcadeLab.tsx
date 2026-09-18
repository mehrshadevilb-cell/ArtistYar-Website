"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  AudioLines,
  Check,
  Layers,
  Play,
  Sparkles,
  Waves,
  Zap,
} from "lucide-react";
import { ProGate } from "@/components/PracticeProGate";
import { useAuth } from "@/components/AuthProvider";

type SkillId = "reverb" | "saturation" | "masking" | "transient";

type ProQuestion = {
  skill: SkillId;
  prompt: string;
  hint: string;
  answer: string;
  options: string[];
  audio: Record<string, number | string>;
};

const SKILLS: Array<{
  id: SkillId;
  title: string;
  desc: string;
  icon: typeof Waves;
  color: string;
}> = [
  {
    id: "reverb",
    title: "Reverb Sense",
    desc: "Room · Hall · Plate · Decay",
    icon: Waves,
    color: "text-cyan-300",
  },
  {
    id: "saturation",
    title: "Saturation",
    desc: "Clean · Warm · Heavy · Distorted",
    icon: Zap,
    color: "text-orange-300",
  },
  {
    id: "masking",
    title: "Masking",
    desc: "کدام باند انرژی را می‌خورد؟",
    icon: Layers,
    color: "text-violet-300",
  },
  {
    id: "transient",
    title: "Transient",
    desc: "Attack تند · نرم · کشیده",
    icon: AudioLines,
    color: "text-gold-300",
  },
];

function bank(skill: SkillId, seed: number): ProQuestion {
  const i = Math.abs(seed) % 4;
  if (skill === "reverb") {
    const rows: ProQuestion[] = [
      {
        skill,
        prompt: "نوع فضا را از روی دم صدا تشخیص بده.",
        hint: "به طول decay و تراکم early reflections گوش کن.",
        answer: "Hall بلند",
        options: ["Room کوتاه", "Hall بلند", "Plate فلزی", "بدون Reverb"],
        audio: { type: "hall", decay: 2.4, mix: 0.45 },
      },
      {
        skill,
        prompt: "این reverb بیشتر شبیه کدام فضا است؟",
        hint: "دم کوتاه و نزدیک = room.",
        answer: "Room کوتاه",
        options: ["Room کوتاه", "Hall بلند", "Plate فلزی", "Cathedral"],
        audio: { type: "room", decay: 0.45, mix: 0.35 },
      },
      {
        skill,
        prompt: "رنگ فلزی و سریع را پیدا کن.",
        hint: "Plate معمولاً denser و کمی metallic است.",
        answer: "Plate فلزی",
        options: ["Room کوتاه", "Hall بلند", "Plate فلزی", "بدون Reverb"],
        audio: { type: "plate", decay: 1.1, mix: 0.4 },
      },
      {
        skill,
        prompt: "آیا این نمونه dry است یا با reverb؟",
        hint: "به دم بعد از قطع نت گوش کن.",
        answer: "بدون Reverb",
        options: ["Room کوتاه", "Hall بلند", "Plate فلزی", "بدون Reverb"],
        audio: { type: "dry", decay: 0.05, mix: 0 },
      },
    ];
    return rows[i];
  }
  if (skill === "saturation") {
    const rows: ProQuestion[] = [
      {
        skill,
        prompt: "میزان saturation را انتخاب کن.",
        hint: "به هارمونیک‌های اضافه و نرمی قله‌ها گوش کن.",
        answer: "Warm",
        options: ["Clean", "Warm", "Heavy", "Distorted"],
        audio: { drive: 2.2 },
      },
      {
        skill,
        prompt: "کدام سطح saturation شنیده می‌شود؟",
        hint: "اگر تقریباً سینوسی و تمیز است = Clean.",
        answer: "Clean",
        options: ["Clean", "Warm", "Heavy", "Distorted"],
        audio: { drive: 1.0 },
      },
      {
        skill,
        prompt: "اشباع سنگین را تشخیص بده.",
        hint: "هارمونیک‌های زیاد + تراکم دینامیک.",
        answer: "Heavy",
        options: ["Clean", "Warm", "Heavy", "Distorted"],
        audio: { drive: 4.5 },
      },
      {
        skill,
        prompt: "این نمونه چقدر خراب/خشن است؟",
        hint: "اگر clipping واضح و خشن است = Distorted.",
        answer: "Distorted",
        options: ["Clean", "Warm", "Heavy", "Distorted"],
        audio: { drive: 8.5 },
      },
    ];
    return rows[i];
  }
  if (skill === "masking") {
    const rows: ProQuestion[] = [
      {
        skill,
        prompt: "کدام باند بیشتر ماسک می‌کند؟",
        hint: "به جایی که جزئیات گم می‌شود گوش کن.",
        answer: "Low-mid (~250Hz)",
        options: ["Sub (~60Hz)", "Low-mid (~250Hz)", "Presence (~3kHz)", "Air (~10kHz)"],
        audio: { band: 250, gain: 9 },
      },
      {
        skill,
        prompt: "ماسک در کدام ناحیه قوی‌تر است؟",
        hint: "اگر وضوح کلمات/ترنزینت کم شد، presence را چک کن.",
        answer: "Presence (~3kHz)",
        options: ["Sub (~60Hz)", "Low-mid (~250Hz)", "Presence (~3kHz)", "Air (~10kHz)"],
        audio: { band: 3000, gain: 8 },
      },
      {
        skill,
        prompt: "انرژی اضافه کجاست؟",
        hint: "لرزش قفسه سینه = sub.",
        answer: "Sub (~60Hz)",
        options: ["Sub (~60Hz)", "Low-mid (~250Hz)", "Presence (~3kHz)", "Air (~10kHz)"],
        audio: { band: 60, gain: 10 },
      },
      {
        skill,
        prompt: "درخشش اضافه در کجا شنیده می‌شود؟",
        hint: "خش‌خش بالا = air.",
        answer: "Air (~10kHz)",
        options: ["Sub (~60Hz)", "Low-mid (~250Hz)", "Presence (~3kHz)", "Air (~10kHz)"],
        audio: { band: 10000, gain: 7 },
      },
    ];
    return rows[i];
  }
  const rows: ProQuestion[] = [
    {
      skill,
      prompt: "شکل attack را تشخیص بده.",
      hint: "قلهٔ اول چقدر تند است؟",
      answer: "Attack تند",
      options: ["Attack تند", "Attack نرم", "Sustain بلند", "Release سریع"],
      audio: { attack: 0.002, sustain: 0.35 },
    },
    {
      skill,
      prompt: "این transient بیشتر شبیه کدام است؟",
      hint: "ورود تدریجی = نرم.",
      answer: "Attack نرم",
      options: ["Attack تند", "Attack نرم", "Sustain بلند", "Release سریع"],
      audio: { attack: 0.12, sustain: 0.4 },
    },
    {
      skill,
      prompt: "بدنهٔ صدا بعد از attack چطور است؟",
      hint: "اگر نت طولانی می‌ماند = sustain بلند.",
      answer: "Sustain بلند",
      options: ["Attack تند", "Attack نرم", "Sustain بلند", "Release سریع"],
      audio: { attack: 0.01, sustain: 1.1 },
    },
    {
      skill,
      prompt: "قطع شدن صدا را بشنو.",
      hint: "دم خیلی کوتاه = release سریع.",
      answer: "Release سریع",
      options: ["Attack تند", "Attack نرم", "Sustain بلند", "Release سریع"],
      audio: { attack: 0.008, sustain: 0.15 },
    },
  ];
  return rows[i];
}

let sharedCtx: AudioContext | null = null;
async function ctx() {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  sharedCtx ||= new AC();
  if (sharedCtx.state === "suspended") await sharedCtx.resume();
  return sharedCtx;
}

async function playPro(q: ProQuestion) {
  const c = await ctx();
  if (!c) return;
  const now = c.currentTime;

  if (q.skill === "reverb") {
    const type = String(q.audio.type || "room");
    const decay = Number(q.audio.decay) || 0.8;
    const mix = Number(q.audio.mix) || 0.3;
    const osc = c.createOscillator();
    const dry = c.createGain();
    const wet = c.createGain();
    const master = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 220;
    dry.gain.value = 1 - mix;
    wet.gain.value = mix;
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.18, now + 0.03);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    osc.connect(dry).connect(master);
    if (type !== "dry" && c.createConvolver) {
      const len = Math.floor(c.sampleRate * Math.min(3, Math.max(0.15, decay)));
      const impulse = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = impulse.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          const t = i / c.sampleRate;
          const env = Math.exp(-t / Math.max(0.08, decay * 0.55));
          const noise = (Math.random() * 2 - 1) * env;
          const bright = type === "plate" ? 1.35 : type === "hall" ? 0.9 : 1;
          d[i] = noise * bright * (ch === 0 ? 1 : 0.92);
        }
      }
      const conv = c.createConvolver();
      conv.buffer = impulse;
      osc.connect(wet).connect(conv).connect(master);
    } else {
      osc.connect(wet).connect(master);
    }
    master.connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.6);
    return;
  }

  if (q.skill === "saturation") {
    const drive = Number(q.audio.drive) || 1;
    const osc = c.createOscillator();
    const shaper = c.createWaveShaper();
    const gain = c.createGain();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = i / 128 - 1;
      curve[i] = Math.tanh(x * drive);
    }
    shaper.curve = curve;
    osc.type = "sine";
    osc.frequency.value = 196;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    osc.connect(shaper).connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + 1.25);
    return;
  }

  if (q.skill === "masking") {
    const band = Number(q.audio.band) || 250;
    const g = Number(q.audio.gain) || 8;
    const length = Math.floor(c.sampleRate * 1.5);
    const buffer = c.createBuffer(1, length, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const fade = Math.min(1, i / (c.sampleRate * 0.05), (length - i) / (c.sampleRate * 0.08));
      data[i] =
        ((Math.random() * 2 - 1) * 0.22 + Math.sin((2 * Math.PI * 440 * i) / c.sampleRate) * 0.08) * fade;
    }
    const src = c.createBufferSource();
    const filter = c.createBiquadFilter();
    const out = c.createGain();
    src.buffer = buffer;
    filter.type = "peaking";
    filter.frequency.value = band;
    filter.Q.value = band < 120 ? 0.7 : 1.4;
    filter.gain.value = g;
    out.gain.value = 0.35;
    src.connect(filter).connect(out).connect(c.destination);
    src.start(now);
    src.stop(now + 1.5);
    return;
  }

  const attack = Number(q.audio.attack) || 0.01;
  const sustain = Number(q.audio.sustain) || 0.4;
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = "square";
  osc.frequency.value = 110;
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(0.22, now + Math.max(0.002, attack));
  env.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.05, attack) + sustain);
  osc.connect(env).connect(c.destination);
  osc.start(now);
  osc.stop(now + attack + sustain + 0.05);
}

export function ProArcadeLab({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [pro, setPro] = useState(user?.role === "admin");
  const [checking, setChecking] = useState(user?.role !== "admin");
  const [skill, setSkill] = useState<SkillId | null>(null);
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [played, setPlayed] = useState(false);

  const question = useMemo(() => {
    if (!skill) return null;
    const seed = Math.floor(Date.now() / 86400000) + round * 17 + skill.length * 3;
    return bank(skill, seed);
  }, [skill, round]);

  useEffect(() => {
    if (user?.role === "admin") {
      setPro(true);
      setChecking(false);
      return;
    }
    if (!user?.id) {
      setPro(false);
      setChecking(false);
      return;
    }
    let cancelled = false;
    const q = new URLSearchParams({ userId: user.id });
    if (user.telegramId) q.set("telegramId", String(user.telegramId));
    fetch("/api/practice/status?" + q.toString(), { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setPro(Boolean(d?.pro));
      })
      .catch(() => {
        if (!cancelled) setPro(false);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role, user?.telegramId]);

  const choose = useCallback(
    async (opt: string) => {
      if (!question || picked) return;
      setPicked(opt);
      const ok = opt === question.answer;
      if (user?.id) {
        try {
          await fetch("/api/practice/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              userId: user.id,
              username: user.username,
              fullName: user.fullName,
              telegramId: user.telegramId,
              gameId: `pro-${question.skill}`,
              score: ok ? 18 : -4,
              accuracy: ok ? 100 : 0,
              streak: ok ? 1 : 0,
              bestScore: ok ? 18 : 0,
              metadata: { source: "pro_arcade", skill: question.skill, answer: question.answer },
            }),
          });
        } catch {
          /* offline */
        }
      }
    },
    [question, picked, user],
  );

  if (checking) {
    return (
      <section className="mt-10">
        <button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>
          بازگشت
        </button>
        <div className="card-ay mt-5 p-8 text-center text-sm text-ink-400">در حال بررسی دسترسی Pro…</div>
      </section>
    );
  }

  if (!pro) {
    return (
      <ProGate
        onBack={onBack}
        title="Professional Audio Skills"
        body="Reverb، Saturation، Masking و Transient — تمرین شنیداری حرفه‌ای میکس برای کاربران Pro."
      />
    );
  }

  if (!skill || !question) {
    return (
      <section className="mt-10">
        <button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>
          <ArrowRight size={14} /> بازگشت
        </button>
        <div className="mt-5 overflow-hidden rounded-3xl border border-gold-400/20 bg-gradient-to-br from-gold-400/[.1] via-white/[.03] to-cyan-400/[.06] p-6 sm:p-10">
          <p className="eyebrow text-gold-300">PRO ARCADE · PROFESSIONAL AUDIO</p>
          <h1 className="mt-3 text-2xl font-semibold text-sand-50">Professional Audio Skills</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-300">
            چهار مسیر شنیداری میکس: فضا، اشباع، ماسک فرکانسی و شکل transient. هر دور سوال تازه با پخش صدا.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {SKILLS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  className="card-ay group p-5 text-right transition hover:-translate-y-0.5 hover:border-gold-400/35"
                  onClick={() => {
                    setSkill(s.id);
                    setRound(0);
                    setPicked(null);
                    setPlayed(false);
                  }}
                >
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[.04] ${s.color}`}>
                    <Icon size={22} />
                  </span>
                  <strong className="mt-4 block text-lg text-sand-50">{s.title}</strong>
                  <p className="mt-2 text-sm text-ink-400">{s.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  const meta = SKILLS.find((s) => s.id === skill)!;
  const Icon = meta.icon;
  const correct = picked === question.answer;

  return (
    <section className="mt-10">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>
          بازگشت به هاب
        </button>
        <button
          type="button"
          className="btn-ghost !px-4 !py-2 text-xs"
          onClick={() => {
            setSkill(null);
            setPicked(null);
            setPlayed(false);
          }}
        >
          چهار مهارت Pro
        </button>
      </div>

      <div className="card-ay mt-5 p-6 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">
              PRO · {meta.title.toUpperCase()} · ROUND {round + 1}
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-sand-50">{question.prompt}</h1>
            <p className="mt-2 text-sm text-ink-400">{question.hint}</p>
          </div>
          <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[.04] ${meta.color}`}>
            <Icon size={22} />
          </span>
        </div>

        <button
          type="button"
          className="btn-primary mt-6"
          onClick={() => {
            void playPro(question);
            setPlayed(true);
          }}
        >
          <Play size={15} fill="currentColor" /> {played ? "پخش دوباره" : "پخش نمونه"}
        </button>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {question.options.map((opt) => {
            const isPick = picked === opt;
            const isCorrect = picked !== null && opt === question.answer;
            return (
              <button
                key={opt}
                type="button"
                disabled={picked !== null}
                onClick={() => void choose(opt)}
                className={`rounded-xl border p-4 text-sm transition ${
                  isCorrect
                    ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-100"
                    : isPick
                      ? "border-red-400/40 bg-red-400/10 text-red-100"
                      : "border-white/10 text-ink-200 hover:border-gold-400/40"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {picked !== null && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <p className={`flex items-center gap-2 text-sm ${correct ? "text-emerald-200" : "text-red-200"}`}>
              <Check size={15} />
              {correct ? "درست — +۱۸ امتیاز." : `نادرست — پاسخ: ${question.answer}`}
            </p>
            <button
              type="button"
              className="btn-primary !px-4 !py-2 text-xs"
              onClick={() => {
                setRound((r) => r + 1);
                setPicked(null);
                setPlayed(false);
              }}
            >
              <Sparkles size={13} /> سوال بعدی
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
