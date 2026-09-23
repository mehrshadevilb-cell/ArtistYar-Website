"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { generateRound, EXERCISE_REGISTRY } from "@/lib/practice-exercises";
import type { GeneratedRound } from "@/lib/practice-exercises/types";
import { playExerciseRound, stopPracticePlayback } from "@/lib/practice-audio-engine";

type Props = { onBack?: () => void; mode?: "workout" | "practice" };

export function AdaptiveWorkoutLab({ onBack, mode = "workout" }: Props) {
  const [round, setRound] = useState<GeneratedRound | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);
  const [diff, setDiff] = useState(120);
  const [score, setScore] = useState(0);
  const [n, setN] = useState(0);
  const started = useRef(0);

  const next = useCallback(() => {
    stopPracticePlayback();
    const ex = EXERCISE_REGISTRY[n % Math.max(1, EXERCISE_REGISTRY.length)];
    const seed = Date.now() % 100000;
    const r = generateRound(ex.id, diff, seed);
    setRound(r);
    setPicked(null);
    setOk(null);
    started.current = performance.now();
  }, [diff, n]);

  useEffect(() => {
    next();
    return () => stopPracticePlayback();
  }, [next]);

  const play = async () => {
    if (!round) return;
    setPlaying(true);
    try {
      await playExerciseRound({ source: round.source, dsp: round.challengeDsp });
    } finally {
      setPlaying(false);
    }
  };

  const answer = async (id: string) => {
    if (!round || picked) return;
    setPicked(id);
    const correct = id === round.correctOptionId;
    setOk(correct);
    setScore((s) => s + (correct ? 20 : -8));
    setDiff((d) => Math.max(40, Math.min(200, d + (correct ? 8 : -12))));
    setN((x) => x + 1);
    const responseTimeMs = Math.round(performance.now() - started.current);
    try {
      await fetch("/api/practice/progress", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: "workout",
          skill: "ear_training",
          difficulty: diff,
          correct,
          accuracy: correct ? 1 : 0,
          responseTimeMs,
          itemKey: round.fingerprint,
          fingerprint: round.fingerprint,
          rated: mode === "workout",
          source: mode === "workout" ? "workout" : "soundgym",
        }),
      });
    } catch {
      /* offline */
    }
  };

  const isPractice = mode === "practice";
  return (
    <div className="container-ay min-h-[50vh] py-8" dir="rtl">
      <button type="button" className="text-sm text-ink-500 hover:text-ink-300" onClick={onBack}>
        ← بازگشت به تمرین‌خانه
      </button>
      <h1 className="mt-4 text-xl font-semibold text-sand-50">
        {isPractice ? "تمرین آزاد" : "تمرین هوشمند امروز"}
      </h1>
      <p className="mt-1 text-xs text-ink-500">
        سختی {diff} · امتیاز {score} · راند {n + 1}
      </p>
      {round && (
        <div className="card-ay mt-6 space-y-4 p-5">
          <p className="text-sm text-sand-50">{round.prompt}</p>
          <p className="text-xs text-ink-500">{round.hint}</p>
          <button
            type="button"
            className="btn-primary !px-4 !py-2 text-xs"
            onClick={() => void play()}
            disabled={playing}
          >
            {playing ? "در حال پخش…" : "پخش"}
          </button>
          <div className="grid gap-2 sm:grid-cols-2">
            {round.options.map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={!!picked}
                onClick={() => void answer(o.id)}
                className={`rounded-xl border px-3 py-3 text-sm transition ${
                  picked === o.id
                    ? ok
                      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                      : "border-rose-400/40 bg-rose-400/10 text-rose-200"
                    : "border-white/10 bg-white/[0.03] text-sand-50 hover:bg-white/[0.06]"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {ok !== null && (
            <div className="space-y-2">
              <p className={`text-sm ${ok ? "text-emerald-300" : "text-rose-300"}`}>
                {ok ? "درست" : "نادرست"} · {round.reviewText}
              </p>
              <button type="button" className="text-xs text-amber-200 underline" onClick={next}>
                راند بعد
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
