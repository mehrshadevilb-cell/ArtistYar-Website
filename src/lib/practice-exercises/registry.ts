import type { ExerciseDefinition, GeneratedRound } from "./types";
import { difficultyCurve, fingerprint, fmtHz, pick } from "./util";

function genFreq(difficulty: number, seed: number): GeneratedRound {
  const { subtlety } = difficultyCurve(difficulty);
  const freq = pick([250, 500, 1000, 2000, 4000], seed);
  const opts = [freq, 500, 1000, 2000].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);
  return {
    exerciseId: "freq-detect",
    fingerprint: fingerprint(["freq", freq, difficulty, seed]),
    prompt: "فرکانس را انتخاب کن",
    hint: subtlety > 0.5 ? "ظریف" : "واضح",
    difficulty,
    answerMode: "choice",
    correctOptionId: String(freq),
    options: opts.map((hz) => ({ id: String(hz), label: fmtHz(hz) })),
    source: { kind: "harmonic", fundamental: freq, partials: [1, 0.3], duration: 1.2 },
    challengeDsp: { type: "none" },
    reviewText: `فرکانس: ${fmtHz(freq)}`,
    truth: { frequency: freq },
  };
}

export const EXERCISE_REGISTRY: ExerciseDefinition[] = [
  {
    id: "freq-detect",
    title: "Frequency Detection",
    titleFa: "تشخیص فرکانس",
    skill: "frequency",
    description: "Identify the dominant frequency",
    gameId: "sg-freq-detect",
    answerMode: "choice",
    supportsAb: false,
    generate: genFreq,
  },
];

export function generateRound(exerciseId: string, difficulty: number, seed: number): GeneratedRound {
  const ex = EXERCISE_REGISTRY.find((e) => e.id === exerciseId) || EXERCISE_REGISTRY[0];
  return ex.generate(difficulty, seed);
}

export function getExercise(id: string): ExerciseDefinition | undefined {
  return EXERCISE_REGISTRY.find((e) => e.id === id);
}
