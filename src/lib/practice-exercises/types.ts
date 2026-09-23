export type AnswerMode = "choice" | "ab" | "slider" | "multi" | "match";
export type PracticeSkillKey =
  | "frequency" | "eq" | "dynamics" | "spatial" | "time" | "tone" | "balance" | "quality";
export type SoundGymExerciseId = string;
export type AudioProgram =
  | { kind: "tone"; frequency: number; type?: OscillatorType; duration?: number }
  | { kind: "noise"; seconds: number; color?: "white" | "pink" | "brown" }
  | { kind: "harmonic"; fundamental: number; partials: number[]; duration?: number }
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
  | { type: "lowshelf"; frequency: number; gainDb: number }
  | { type: "highshelf"; frequency: number; gainDb: number }
  | { type: "lowpass"; frequency: number; q?: number }
  | { type: "highpass"; frequency: number; q?: number }
  | { type: "bandpass"; frequency: number; q?: number }
  | { type: "compressor"; threshold: number; ratio: number; attack: number; release: number; knee?: number }
  | { type: "gain"; gainDb: number }
  | { type: "pan"; value: number }
  | { type: "width"; amount: number }
  | { type: "delay"; timeSec: number; feedback?: number; mix?: number }
  | { type: "distort"; drive: number; style?: string }
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
  gameId: string;
  answerMode: AnswerMode;
  supportsAb: boolean;
  keyboardHints?: string;
  generate: (difficulty: number, seed: number) => GeneratedRound;
};
export type SessionStats = {
  rounds: number;
  correct: number;
  streak: number;
  bestStreak: number;
  totalXp: number;
  lastResponseMs: number | null;
};
