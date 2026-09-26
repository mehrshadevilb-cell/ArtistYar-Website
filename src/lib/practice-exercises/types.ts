export type AnswerMode = "choice" | "ab" | "slider" | "multi";
export type PracticeSkillKey =
  | "frequency" | "eq" | "dynamics" | "spatial" | "time" | "tone" | "balance" | "quality";
export type SoundGymExerciseId = string;
export type AudioProgram =
  | { kind: "noise"; seconds: number; color?: "white" | "pink" | "brown" }
  | { kind: "harmonic"; fundamental: number; partials: number[]; duration?: number; intervalHz?: number }
  | { kind: "percussion"; hits: number; spacing: number; toneHz: number }
  | { kind: "loop"; pattern: "pad" | "pluck" | "bass" | "kit"; duration?: number }
  | {
      kind: "stems";
      duration?: number;
      stems: Array<{
        id: string;
        role: string;
        toneHz: number;
        gainDb: number;
        pan: number;
        color?: string;
      }>;
    };
export type DspChain =
  | { type: "none" }
  | { type: "peaking"; frequency: number; gainDb: number; q?: number }
  | { type: "gain"; gainDb: number }
  | { type: "pan"; value: number }
  | { type: "compressor"; threshold?: number; ratio?: number; attack?: number; release?: number; knee?: number }
  | { type: "stack"; nodes: DspChain[] }
  | Record<string, unknown>;
export type RoundOption = { id: string; label: string; dsp?: DspChain };
export type GeneratedRound = {
  exerciseId: SoundGymExerciseId;
  fingerprint: string;
  prompt: string;
  hint: string;
  difficulty: number;
  answerMode: AnswerMode;
  correctOptionId: string;
  options: RoundOption[];
  source: AudioProgram;
  challengeDsp: DspChain;
  referenceDsp?: DspChain;
  reviewText: string;
  truth: Record<string, number | string>;
};
export type ExerciseDefinition = {
  id: SoundGymExerciseId;
  title: string;
  titleFa: string;
  skill: PracticeSkillKey;
  description: string;
  /** Optional API / catalog bridge id */
  gameId?: string;
  answerMode?: AnswerMode;
  supportsAb?: boolean;
  generate: (difficulty: number, seed: number) => GeneratedRound;
};
