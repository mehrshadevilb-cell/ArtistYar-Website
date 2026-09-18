"use client";

import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { usePracticeAccess } from "@/components/usePracticeAccess";
import { ArrowLeft, Music2, Play } from "lucide-react";

const roots = ["C", "D", "E", "F", "G", "A", "B"];

/** Progressive pools: easy → expert */
const INTERVAL_TIERS = [
  [["Minor 2nd", 1], ["Major 2nd", 2]] as const,
  [["Minor 2nd", 1], ["Major 2nd", 2], ["Minor 3rd", 3], ["Major 3rd", 4]] as const,
  [["Minor 2nd", 1], ["Major 2nd", 2], ["Minor 3rd", 3], ["Major 3rd", 4], ["Perfect 4th", 5], ["Tritone", 6], ["Perfect 5th", 7]] as const,
  [["Minor 2nd", 1], ["Major 2nd", 2], ["Minor 3rd", 3], ["Major 3rd", 4], ["Perfect 4th", 5], ["Tritone", 6], ["Perfect 5th", 7], ["Minor 6th", 8], ["Major 6th", 9], ["Minor 7th", 10], ["Major 7th", 11], ["Octave", 12]] as const,
];

const CHORD_TIERS = [
  [["Major", [0, 4, 7]], ["Minor", [0, 3, 7]]] as const,
  [["Major", [0, 4, 7]], ["Minor", [0, 3, 7]], ["Diminished", [0, 3, 6]], ["Augmented", [0, 4, 8]]] as const,
  [["Major", [0, 4, 7]], ["Minor", [0, 3, 7]], ["Diminished", [0, 3, 6]], ["Augmented", [0, 4, 8]], ["Sus4", [0, 5, 7]], ["Sus2", [0, 2, 7]]] as const,
  [["Major", [0, 4, 7]], ["Minor", [0, 3, 7]], ["Diminished", [0, 3, 6]], ["Augmented", [0, 4, 8]], ["Sus4", [0, 5, 7]], ["Sus2", [0, 2, 7]], ["Maj7", [0, 4, 7, 11]], ["Min7", [0, 3, 7, 10]]] as const,
];

const freq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function tone(m: number, d = 0.7) {
  if (typeof window === "undefined") return;
  const A = window.AudioContext || (window as any).webkitAudioContext;
  if (!A) return;
  const c = new A();
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.value = freq(m);
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.12, c.currentTime + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + d);
  o.connect(g).connect(c.destination);
  o.start();
  o.stop(c.currentTime + d + 0.04);
  setTimeout(() => void c.close(), (d + 0.2) * 1000);
}

function seeded(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function shuffled<T>(items: readonly T[], seed: number) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(seeded(seed + i * 19) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function tierIndex(xp: number, round: number) {
  if (xp < 40 && round < 4) return 0;
  if (xp < 120 && round < 10) return 1;
  if (xp < 280) return 2;
  return 3;
}

export function TheoryLab({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { loading: accessLoading, stageLimit, pro, subscriptionDays, proExpiresAt } = usePracticeAccess();
  const [mode, setMode] = useState<"interval" | "chord">("interval");
  const [root, setRoot] = useState("C");
  const [answer, setAnswer] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [xp, setXp] = useState(0);
  const stageNumber = round + 1;
  const stageLocked = !accessLoading && !pro && stageNumber > stageLimit;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("artistyar_arcade_score") || "{}");
      setXp(Number(saved.score) || 0);
    } catch {
      /* */
    }
  }, []);

  const tier = tierIndex(xp, round);
  const seed = useMemo(
    () => Math.floor(Date.now() / 86400000) + round * 7919 + (mode === "chord" ? 313 : 97) + xp,
    [mode, round, xp],
  );

  const pool = useMemo(() => {
    if (mode === "interval") return INTERVAL_TIERS[tier];
    return CHORD_TIERS[tier];
  }, [mode, tier]);

  const target = useMemo(() => {
    return pool[Math.floor(seeded(seed) * pool.length)];
  }, [pool, seed]);

  const optionLabels = useMemo(() => {
    const labels = pool.map((x) => x[0] as string);
    let full: string[] =
      mode === "interval"
        ? INTERVAL_TIERS[3].map((x) => x[0] as string)
        : CHORD_TIERS[3].map((x) => x[0] as string);
    const set = new Set(labels);
    for (const l of shuffled(full, seed + 3)) {
      if (set.size >= 4) break;
      set.add(l);
    }
    return shuffled([...set], seed + 41);
  }, [pool, mode, seed]);

  const play = () => {
    const base = 60 + roots.indexOf(root);
    if (mode === "interval") {
      tone(base);
      setTimeout(() => tone(base + (target[1] as number)), 240);
    } else {
      (target[1] as readonly number[]).forEach((n, i) => setTimeout(() => tone(base + n, 0.85), i * 130));
    }
  };

  const correct = answer === String(target[0]);

  const submit = (value: string) => {
    setAnswer(value);
    const ok = value === String(target[0]);
    const delta = ok ? 25 : -8;
    try {
      const saved = JSON.parse(localStorage.getItem("artistyar_arcade_score") || "{}");
      const next = Math.max(0, Number(saved.score || 0) + delta);
      localStorage.setItem("artistyar_arcade_score", JSON.stringify({ ...saved, score: next }));
      setXp(next);
    } catch {
      /* */
    }
    if (user?.id && user.username) {
      void fetch("/api/practice/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: user.id,
          username: user.username,
          fullName: user.fullName,
          telegramId: user.telegramId,
          gameId: `theory-${mode}`,
          score: delta,
          accuracy: ok ? 100 : 0,
          streak: ok ? 1 : 0,
          bestScore: ok ? 25 : 0,
          metadata: { round, root, randomized: true, tier, progressive: true, wrongPenalty: !ok },
        }),
      }).catch(() => {});
    }
  };

  const next = () => {
    setAnswer(null);
    setRound((v) => v + 1);
  };

  const tierLabel = ["مبتدی · فقط ۲m / ۲M", "مقدماتی · تا ۳M", "متوسط · تا ۵P", "حرفه‌ای · همه فواصل"][tier];

  if (accessLoading) {
    return (
      <section className="mt-10">
        <button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>
          بازگشت
        </button>
        <div className="card-ay mt-5 p-8 text-center text-sm text-ink-400">در حال بررسی دسترسی تمرین…</div>
      </section>
    );
  }

  if (stageLocked) {
    return (
      <section className="mt-10">
        <button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>
          بازگشت
        </button>
        <div className="card-ay mt-5 p-8 text-center">
          <p className="eyebrow text-gold-300">PRACTICE STAGE LIMIT</p>
          <h1 className="mt-3 text-2xl font-semibold text-sand-50">مراحل رایگان این تمرین تمام شد</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-8 text-ink-400">
            بدون اشتراک تا ۵ مرحله، با Pro تا ۴۰ مرحله در مدت فعال بودن اشتراک
            {proExpiresAt
              ? ` و اشتراک فعلی تا ${new Date(proExpiresAt).toLocaleDateString("fa-IR")} فعال است.`
              : "."}
          </p>
          <p className="mt-4 text-sm text-gold-200">
            {pro ? `اشتراک فعال · ${subscriptionDays} مرحله` : "برای ادامه، اشتراک فعال کن."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={onBack}>
        <ArrowLeft size={14} /> بازگشت
      </button>
      <div className="card-ay mt-5 p-6 sm:p-10">
        <div className="mx-auto max-w-2xl text-center">
          <Music2 className="mx-auto text-violet-300" size={35} />
          <p className="eyebrow mt-5">THEORY LAB · PROGRESSIVE</p>
          <h1 className="mt-3 text-2xl font-semibold text-sand-50">از فاصله‌های ساده تا expert</h1>
          <p className="mt-3 text-sm leading-8 text-ink-400">
            اول فقط ۲m و ۲M؛ با XP و مرحله، کم‌کم فواصل سخت‌تر باز می‌شوند. ترتیب گزینه‌ها تصادفی است. غلط = XP منفی.
          </p>
          <p className="mt-2 text-xs text-violet-200">
            {tierLabel} · مرحله {round + 1} · XP {xp}
          </p>

          <div className="mt-6 flex justify-center gap-2">
            <button
              className={`rounded-xl px-4 py-2 text-xs ${mode === "interval" ? "bg-violet-400/15 text-violet-200" : "bg-white/[.04] text-ink-500"}`}
              onClick={() => {
                setMode("interval");
                setAnswer(null);
                setRound((v) => v + 1);
              }}
            >
              Intervals
            </button>
            <button
              className={`rounded-xl px-4 py-2 text-xs ${mode === "chord" ? "bg-violet-400/15 text-violet-200" : "bg-white/[.04] text-ink-500"}`}
              onClick={() => {
                setMode("chord");
                setAnswer(null);
                setRound((v) => v + 1);
              }}
            >
              Chords
            </button>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2">
            <select
              className="rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-sm"
              value={root}
              onChange={(e) => setRoot(e.target.value)}
            >
              {roots.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <button className="btn-primary !px-5 !py-2" onClick={play}>
              <Play size={15} fill="currentColor" /> پخش تمرین
            </button>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {optionLabels.map((o) => (
              <button
                key={o}
                disabled={!!answer}
                onClick={() => submit(o)}
                className={`rounded-xl border p-3 text-sm ${
                  answer
                    ? o === String(target[0])
                      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                      : o === answer
                        ? "border-red-400/40 text-red-200"
                        : "border-white/10 text-ink-500"
                    : "border-white/10 text-ink-300 hover:border-violet-400/40"
                }`}
              >
                {o}
              </button>
            ))}
          </div>

          {answer ? (
            <p className={`mt-5 text-sm ${correct ? "text-emerald-200" : "text-red-200"}`}>
              {correct ? "درست! +۲۵ XP" : `نادرست! −۸ XP · پاسخ: ${String(target[0])}`}
            </p>
          ) : null}

          <button className="btn-primary mt-6" onClick={next}>
            تمرین تصادفی بعدی
          </button>
        </div>
      </div>
    </section>
  );
}
