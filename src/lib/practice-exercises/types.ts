/**
 * SoundGym-style exercise configuration model.
 * source → processing → challenge → answer → validation → score → XP → rating → review
 */
import type { PracticeSkillKey } from "@/lib/practice-types";

export type SoundGymExerciseId =
  | "freq-detect" | "eq-peak" | "eq-cut" | "eq-match" | "filter-expert"
  | "bass-detective" | "compressionist" | "dr-compressor" | "loudness-db"
  | "pan-train" | "stereo-width" | "sonar-beast"
  // Phase 3 — Dynamics
  | "comp-match" | "comp-thresh" | "comp-release" | "makeup-gain" | "comp-compare"
  // Phase 3 — Time & Space
  | "delay-detect" | "delay-match" | "reverb-type" | "reverb-match"
  | "predelay" | "decay" | "wetdry" | "spatial-compare"
  // Phase 3 — Audio Quality
  | "dist-detect" | "sat-detect" | "dist-amount" | "feedback-freq" | "harmonic-nl";

export type AnswerMode = "choice" | "ab" | "match";

export type AudioProgram =
  | { kind: "tone"; frequency: number; type?: OscillatorType; duration?: number }
  | { kind: "noise"; seconds: number; color?: "white" | "pink" | "brown" }
  | { kind: "harmonic"; fundamental: number; partials: number[]; duration?: number }
  | { kind: "percussion"; hits: number; spacing: number; toneHz: number }
  | { kind: "loop"; pattern: "pad" | "pluck" | "bass" | "kit"; duration?: number };

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
  | { type: "reverb"; decay: number; mix: number; preDelay?: number; room?: "room" | "hall" | "plate" | "chamber" }
  | { type: "distort"; drive: number; style?: "soft" | "hard" | "tape" | "fuzz" }
  | { type: "stack"; nodes: DspChain[] };

export type RoundOption = {
  id: string;
  label: string;
  dsp?: DspChain;
};

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
