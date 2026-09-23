"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EXERCISE_REGISTRY, generateRound, getExercise } from "@/lib/practice-exercises";
import type { GeneratedRound } from "@/lib/practice-exercises/types";
import { playExerciseRound, stopPracticePlayback } from "@/lib/practice-audio-engine";

type Props = { onBack?: () => void; initialExercise?: string };

export function SoundGymLab({ onBack, initialExercise }: Props) {
  const [exerciseId, setExerciseId] = useState<string | null>(initialExercise ?? null);
  const [round, setRound] = useState<GeneratedRound | null>(null);
  const [diff, setDiff] = useState(120);
  const [picked, setPicked] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);
  const [xp, setXp] = useState(0);
  const started = useRef(0);

  const startRound = useCallback((id: string, d: number) => {
    stopPracticePlayback();
    const r = generateRound(id, d, Date.now() % 100000);
    setRound(r);
    setPicked(null);
    setOk(null);
    started.current = performance.now();
  }, []);

  useEffect(() => {
    if (exerciseId) startRound(exerciseId, diff);
    return () => stopPracticePlayback();
  }, [exerciseId, startRound]);

  if (!exerciseId) {
    return (
      <div className="container-ay min-h-[50vh] py-8" dir="rtl">
        <button type="button" className="text-sm text-ink-500" onClick={onBack}>← بازگشت</button>
        <h1 className="mt-4 text-xl font-semibold text-sand-50">باشگاه گوش</h1>
        <p className="mt-2 text-sm text-ink-500">یک تمرین انتخاب کن</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {EXERCISE_REGISTRY.map((ex) => (
            <button
              key={ex.id}
              type="button"
              className="card-ay p-4 text-right"
              onClick={() => setExerciseId(ex.id)}
            >
              <strong className="block text-sm text-sand-50">{ex.titleFa}</strong>
              <span className="mt-1 block text-[11px] text-ink-500">{ex.description}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const meta = getExercise(exerciseId);

  return (
    <div className="container-ay min-h-[50vh] py-8" dir="rtl">
      <button type="button" className="text-sm text-ink-500" onClick={() => { setExerciseId(null); setRound(null); }}>
        ← لیست تمرین‌ها
      </button>
      <h1 className="mt-4 text-xl font-semibold text-sand-50">{meta?.titleFa || exerciseId}</h1>
      <p className="mt-1 text-xs text-ink-500">سختی {diff} · XP {xp}</p>
      {round && (
        <div className="card-ay mt-5 space-y-4 p-5">
          <p className="text-sm text-sand-50">{round.prompt}</p>
          <p className="text-xs text-ink-500">{round.hint}</p>
          <button
            type="button"
            className="btn-primary !px-4 !py-2 text-xs"
            disabled={playing}
            onClick={async () => {
              setPlaying(true);
              try { await playExerciseRound({ source: round.source, dsp: round.challengeDsp }); }
              finally { setPlaying(false); }
            }}
          >
            {playing ? "پخش…" : "پخش"}
          </button>
          <div className="grid gap-2 sm:grid-cols-2">
            {round.options.map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={!!picked}
                className={`rounded-xl border px-3 py-3 text-sm ${
                  picked === o.id
                    ? ok ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-rose-400/40 bg-rose-400/10 text-rose-200"
                    : "border-white/10 bg-white/[0.03] text-sand-50"
                }`}
                onClick={async () => {
                  if (picked) return;
                  setPicked(o.id);
                  const correct = o.id === round.correctOptionId;
                  setOk(correct);
                  setXp((x) => x + (correct ? 20 : -8));
                  setDiff((d) => Math.max(40, Math.min(200, d + (correct ? 8 : -12))));
                  try {
                    await fetch("/api/practice/progress", {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        gameId: meta?.gameId || "soundgym",
                        skill: meta?.skill || "frequency",
                        difficulty: diff,
                        correct,
                        accuracy: correct ? 1 : 0,
                        responseTimeMs: Math.round(performance.now() - started.current),
                        itemKey: round.fingerprint,
                        fingerprint: round.fingerprint,
                        rated: true,
                        source: "soundgym",
                      }),
                    });
                  } catch { /* */ }
                }}
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
              <button type="button" className="text-xs text-amber-200 underline" onClick={() => startRound(exerciseId, diff)}>
                راند بعد
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
